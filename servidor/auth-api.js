// auth-api.js - API mock de autenticacao da clinica (Aula 4)
//
// Servidor HTTP escrito so com o modulo 'http' do Node: nao precisa instalar
// nada. Ele existe porque o json-server sozinho nao sabe autenticar - ele
// entrega qualquer recurso para qualquer um que peca.
//
// Rode com:   node auth-api.js
// Ele sobe em http://0.0.0.0:3001 (porta 3001 para nao brigar com o
// json-server da Aula 3, que usa a 3000).
//
// Endpoints:
//   POST /login      { email, senha }  -> 200 { token, usuario } | 401
//   GET  /medicos    (Authorization: Bearer <token>) -> 200 [...] | 401
//   GET  /perfil     (Authorization: Bearer <token>) -> 200 {...} | 401
//   POST /sms        (Bearer) { consultaId, tipo, pacienteId?, dataHora? }
//                    -> 202 { id, status: 'enfileirada', segmentos, custo }
//                    Aula 13: o app pede, ESTA API fala com o gateway
//                    (servidor/gateway-sms.js, porta 3002). A chave do
//                    gateway fica aqui, nunca no app.
//                    Fechamento: SMS_PROVEDOR=simulado|twilio|zenvia escolhe
//                    o destino (servidor/provedores-sms.js).
//
// Le o .env da raiz (servidor/carregar-env.js); o terminal continua valendo mais.
//
// ATENCAO - este servidor e didatico, NAO e um modelo de producao:
//   - as senhas estao em texto puro no codigo (o certo e guardar um hash,
//     com bcrypt/argon2);
//   - o "token" e um texto aleatorio guardado em memoria, nao um JWT assinado;
//   - o servidor fala HTTP, nao HTTPS.
// Cada um desses tres pontos e discutido no Momento 1.

require('./carregar-env').carregarEnv();

const http = require('http');
const crypto = require('crypto');
const { enviarPorProvedor, provedorAtual, ProvedorSmsErro } = require('./provedores-sms');

const PORTA = 3001;

// Aula 13 - SMS pelo servidor.
const API_DADOS = process.env.API_DADOS_URL || 'http://localhost:3000';
let regrasSms = null; // src/services/regrasSms.js, carregado na primeira vez
async function carregarRegrasSms() {
  if (!regrasSms) {
    const path = require('path');
    const { pathToFileURL } = require('url');
    regrasSms = await import(
      pathToFileURL(path.join(__dirname, '..', 'src', 'services', 'regrasSms.js')).href
    );
  }
  return regrasSms;
}

async function buscarDados(caminho) {
  const r = await fetch(`${API_DADOS}${caminho}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`API de dados respondeu ${r.status}`);
  return r.json();
}

async function enviarSms(corpo) {
  const { TIPOS_SMS, montarTextoSms, normalizarNumero, avaliarTexto } = await carregarRegrasSms();
  if (!corpo || !corpo.consultaId || !TIPOS_SMS.includes(corpo.tipo)) {
    return [400, { erro: `Informe consultaId e tipo (${TIPOS_SMS.join(', ')}).` }];
  }

  // A consulta vem do servidor. No cancelamento ela ja foi apagada; ai vale
  // o pacienteId/dataHora enviados, mas o NUMERO sempre sai do cadastro.
  let consulta = await buscarDados(`/consultas/${encodeURIComponent(corpo.consultaId)}`);
  if (!consulta && corpo.tipo === 'cancelamento' && corpo.pacienteId && corpo.dataHora) {
    consulta = { pacienteId: corpo.pacienteId, dataHora: corpo.dataHora };
  }
  if (!consulta) return [404, { erro: 'Consulta nao encontrada.' }];

  const paciente = await buscarDados(`/pacientes/${encodeURIComponent(consulta.pacienteId)}`);
  const para = normalizarNumero(paciente && paciente.telefone);
  if (!para) return [422, { erro: 'O paciente nao tem um celular valido no cadastro.' }];

  const texto = montarTextoSms(corpo.tipo, consulta.dataHora);
  try {
    // O app recebe so o necessario; o numero completo nao volta.
    const resposta = await enviarPorProvedor({ para, texto }, avaliarTexto(texto));
    return [202, resposta];
  } catch (e) {
    if (e instanceof ProvedorSmsErro) return [e.status, { erro: e.message }];
    throw e;
  }
}

// "Banco" de usuarios da clinica. Em producao: hash da senha, nunca o texto.
const USUARIOS = [
  { id: 1, email: 'recepcao@clinica.com', senha: 'clinica123', nome: 'Recepção', perfil: 'recepcao' },
  { id: 2, email: 'joao@clinica.com',     senha: 'medico123',  nome: 'Dr. João de Oliveira', perfil: 'medico' },
];

const MEDICOS = [
  { id: 1, nome: 'João de Oliveira', especialidade: 'Cardiologista', crm: '12345/MG' },
  { id: 2, nome: 'Antônio de Oliveira', especialidade: 'Pediatra', crm: '23456/MG' },
  { id: 3, nome: 'Maria da Silva', especialidade: 'Dermatologista', crm: '34567/SP' },
  { id: 4, nome: 'Beatriz Souza', especialidade: 'Ginecologista', crm: '45678/RJ' },
];

// Tokens validos, em memoria: token -> id do usuario.
// Reiniciar o servidor invalida todas as sessoes (isso e proposital: os
// alunos veem o app cair para a tela de login quando o token deixa de valer).
const SESSOES = new Map();

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(texto);
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (pedaco) => { dados += pedaco; });
    req.on('end', () => {
      // Este log existe de proposito: em HTTP puro, tudo o que o app envia
      // chega legivel deste lado - e a qualquer um no caminho.
      console.log('  corpo recebido (texto puro):', dados);
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

function usuarioDoToken(req) {
  const cabecalho = req.headers['authorization'] || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return null;
  const id = SESSOES.get(token);
  if (!id) return null;
  return USUARIOS.find((u) => u.id === id) || null;
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  // ---------------------------------------------------------------- LOGIN
  if (req.method === 'POST' && req.url === '/login') {
    const corpo = await lerCorpo(req);
    if (!corpo || !corpo.email || !corpo.senha) {
      return json(res, 400, { erro: 'Informe e-mail e senha.' });
    }
    const usuario = USUARIOS.find(
      (u) => u.email === corpo.email && u.senha === corpo.senha
    );
    if (!usuario) {
      // 401: "eu nao sei quem voce e". Repare que a mensagem NAO diz se o
      // que errou foi o e-mail ou a senha - dizer isso entrega ao atacante
      // quais e-mails existem no sistema.
      return json(res, 401, { erro: 'E-mail ou senha inválidos.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    SESSOES.set(token, usuario.id);
    return json(res, 200, {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
    });
  }

  // ------------------------------------------------------- SMS (Aula 13)
  if (req.method === 'POST' && req.url === '/sms') {
    if (!usuarioDoToken(req)) return json(res, 401, { erro: 'Token ausente ou inválido.' });
    const corpo = await lerCorpo(req);
    try {
      const [status, resposta] = await enviarSms(corpo);
      return json(res, status, resposta);
    } catch (e) {
      console.log(`  falha no envio de SMS: ${e.message}`);
      return json(res, 502, { erro: 'Nao foi possivel falar com a API de dados ou o gateway.' });
    }
  }

  // ------------------------------------------------------- ROTAS PROTEGIDAS
  if (req.method === 'GET' && (req.url === '/medicos' || req.url === '/perfil')) {
    const usuario = usuarioDoToken(req);
    if (!usuario) {
      return json(res, 401, { erro: 'Token ausente ou inválido.' });
    }
    if (req.url === '/perfil') {
      return json(res, 200, { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
    }
    return json(res, 200, MEDICOS);
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`API de autenticação da clínica em http://localhost:${PORTA}`);
  console.log('Usuários de teste:');
  USUARIOS.forEach((u) => console.log(`  ${u.email} / ${u.senha}`));
  console.log(`Provedor de SMS: ${provedorAtual()}${provedorAtual() === 'simulado' ? ' (nada sai de verdade)' : ' (ENVIO REAL, com custo)'}`);
});
