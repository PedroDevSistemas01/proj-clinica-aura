// enviar-push.js - o lado "servidor" do push da clinica (Aula 9)
//
// Faz o papel da API da clinica nos passos 3 e 4 da arquitetura: le os
// dispositivos registrados pelo app no json-server e manda a mensagem para o
// Expo Push Service, que entrega ao aparelho mesmo com o app fechado.
//
// Rode com o json-server no ar (npm run api) e Node 18+ (tem fetch):
//
//   node servidor/enviar-push.js teste ExponentPushToken[xxxx]
//       -> um push de teste para um token (copie do log do registro)
//   node servidor/enviar-push.js cancelamento <consultaId>
//       -> a recepcao cancela a consulta: DELETE na API e aviso ao aparelho
//   node servidor/enviar-push.js lembretes-do-dia
//       -> lote: avisa todas as consultas das proximas 24 h
//
// Opcional: EXPO_ACCESS_TOKEN no ambiente, se o projeto exigir token de envio.
//
// Licoes da aula que este script aplica:
//   - HTTP 200 mente: o que vale e o campo status DENTRO de cada ticket;
//   - "ok" e aceito, nao entregue: a confirmacao vem no recibo (receipt);
//   - DeviceNotRegistered = token morto -> removido do banco;
//   - no maximo 100 mensagens por requisicao (envio em lote);
//   - channelId igual ao canal criado no app ('lembretes-consulta');
//   - texto sem dado sensivel: aparece na tela bloqueada.

require('./carregar-env').carregarEnv(); // .env da raiz (o terminal vale mais)
const API = process.env.API_URL || 'http://localhost:3000';
const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';
const CANAL = 'lembretes-consulta';
const TELA = 'DetalheConsulta';
const LOTE = 100;
// Os recibos demoram para ficar prontos. Em producao, consulte depois (minutos);
// aqui esperamos um pouco para a aula ver o resultado no mesmo terminal.
const ESPERA_RECIBO_MS = Number(process.env.ESPERA_RECIBO_MS || 15000);

const doisDigitos = (n) => String(n).padStart(2, '0');
const hora = (d) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
const data = (d) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function headersExpo() {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) h.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  return h;
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(`${API}${caminho}`, opcoes);
  if (!r.ok) throw new Error(`API ${opcoes.method || 'GET'} ${caminho} -> HTTP ${r.status}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

function emLotes(lista, tamanho) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
}

// Envia as mensagens em lotes de 100 e devolve [{ mensagem, ticket }].
async function enviar(mensagens) {
  const resultado = [];
  for (const lote of emLotes(mensagens, LOTE)) {
    const r = await fetch(EXPO_SEND, { method: 'POST', headers: headersExpo(), body: JSON.stringify(lote) });
    const corpo = await r.json().catch(() => ({}));
    console.log(`Lote de ${lote.length}: HTTP ${r.status} (isso NAO diz se deu certo)`);
    if (!Array.isArray(corpo.data)) {
      console.log('Resposta inesperada do servico de push:', JSON.stringify(corpo.errors || corpo));
      continue;
    }
    corpo.data.forEach((ticket, i) => resultado.push({ mensagem: lote[i], ticket }));
  }
  return resultado;
}

async function removerToken(token) {
  try {
    const achados = await api(`/dispositivos?token=${encodeURIComponent(token)}`);
    for (const d of achados || []) await api(`/dispositivos/${d.id}`, { method: 'DELETE' });
    console.log(`  token removido do banco: ${token.slice(0, 26)}...`);
  } catch (e) {
    console.log(`  nao foi possivel remover o token: ${e.message}`);
  }
}

// Le o status de cada ticket e, depois, os recibos.
async function conferir(enviados) {
  const aceitos = [];
  for (const { mensagem, ticket } of enviados) {
    if (ticket.status === 'ok') {
      aceitos.push({ id: ticket.id, token: mensagem.to });
      continue;
    }
    const erro = ticket.details?.error || ticket.message;
    console.log(`Recusado no envio (${erro}) para ${String(mensagem.to).slice(0, 26)}...`);
    if (ticket.details?.error === 'DeviceNotRegistered') await removerToken(mensagem.to);
  }
  console.log(`${aceitos.length} de ${enviados.length} aceitos para entrega (aceito != entregue).`);
  if (aceitos.length === 0) return;

  console.log(`Aguardando ${ESPERA_RECIBO_MS / 1000}s para ler os recibos...`);
  await esperar(ESPERA_RECIBO_MS);

  for (const lote of emLotes(aceitos, 1000)) {
    const r = await fetch(EXPO_RECEIPTS, {
      method: 'POST',
      headers: headersExpo(),
      body: JSON.stringify({ ids: lote.map((a) => a.id) }),
    });
    const corpo = await r.json().catch(() => ({}));
    const recibos = corpo.data || {};
    for (const { id, token } of lote) {
      const recibo = recibos[id];
      if (!recibo) {
        console.log(`Recibo ${id}: ainda nao disponivel (consulte de novo mais tarde).`);
      } else if (recibo.status === 'ok') {
        console.log(`Recibo ${id}: entregue ao FCM/APNs.`);
      } else {
        console.log(`Recibo ${id}: erro ${recibo.details?.error || recibo.message}`);
        if (recibo.details?.error === 'DeviceNotRegistered') await removerToken(token);
      }
    }
  }
}

function mensagem(token, titulo, corpo, dados) {
  return {
    to: token,
    title: titulo,
    body: corpo,
    sound: 'default',
    priority: 'high',
    channelId: CANAL,
    data: { tela: TELA, ...dados },
  };
}

async function dispositivos() {
  const lista = (await api('/dispositivos')) || [];
  if (lista.length === 0) console.log('Nenhum dispositivo registrado. Abra o app logado num development build.');
  return lista;
}

async function modoTeste(token) {
  if (!token) throw new Error('Informe o token: node servidor/enviar-push.js teste ExponentPushToken[...]');
  const consultas = (await api('/consultas')) || [];
  const consultaId = consultas[0]?.id ?? '1';
  return [mensagem(token, 'Clínica Aura', 'Teste de aviso da clínica. Toque para abrir a consulta.', { consultaId: String(consultaId), tipo: 'teste' })];
}

async function modoCancelamento(consultaId) {
  if (!consultaId) throw new Error('Informe a consulta: node servidor/enviar-push.js cancelamento <consultaId>');
  const consulta = await api(`/consultas/${consultaId}`);
  // A recepcao cancela no sistema da clinica: a verdade muda NO SERVIDOR.
  await api(`/consultas/${consultaId}`, { method: 'DELETE' });
  console.log(`Consulta ${consultaId} cancelada na API.`);
  const quando = new Date(consulta.dataHora);
  const texto = `Sua consulta de ${data(quando)} às ${hora(quando)} foi cancelada pela clínica. Toque para ver.`;
  return (await dispositivos()).map((d) =>
    mensagem(d.token, 'Consulta cancelada', texto, { consultaId: String(consultaId), tipo: 'consulta-cancelada' })
  );
}

async function modoLembretesDoDia() {
  const agora = Date.now();
  const consultas = ((await api('/consultas')) || []).filter((c) => {
    const t = new Date(c.dataHora).getTime();
    return c.status !== 'cancelada' && t > agora && t - agora <= 24 * 60 * 60 * 1000;
  });
  const aparelhos = await dispositivos();
  console.log(`${consultas.length} consulta(s) nas proximas 24 h, ${aparelhos.length} aparelho(s).`);
  // No laboratorio o app e usado pela equipe, entao todo aparelho registrado
  // recebe. Com login de paciente, filtraria por d.usuarioId === pacienteId.
  const mensagens = [];
  for (const c of consultas) {
    const quando = new Date(c.dataHora);
    for (const d of aparelhos) {
      mensagens.push(
        mensagem(d.token, 'Lembrete de consulta', `Você tem uma consulta em ${data(quando)} às ${hora(quando)}.`, {
          consultaId: String(c.id),
          tipo: 'lembrete',
        })
      );
    }
  }
  return mensagens;
}

async function principal() {
  const [modo, arg] = process.argv.slice(2);
  const modos = { teste: modoTeste, cancelamento: modoCancelamento, 'lembretes-do-dia': modoLembretesDoDia };
  if (!modos[modo]) {
    console.log('Uso: node servidor/enviar-push.js teste <token> | cancelamento <consultaId> | lembretes-do-dia');
    process.exitCode = 1;
    return;
  }
  const mensagens = await modos[modo](arg);
  if (mensagens.length === 0) {
    console.log('Nada para enviar.');
    return;
  }
  console.log(`Enviando ${mensagens.length} mensagem(ns) em ${Math.ceil(mensagens.length / LOTE)} lote(s).`);
  await conferir(await enviar(mensagens));
}

principal().catch((e) => {
  console.log(`Falhou: ${e.message}`);
  process.exitCode = 1;
});
