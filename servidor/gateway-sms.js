// gateway-sms.js - gateway de SMS SIMULADO (Aula 13)
//
// NENHUMA mensagem sai de verdade. O que ele reproduz e a arquitetura de um
// gateway pago (Zenvia, Twilio...): credencial, validacao do numero,
// contagem de segmentos, custo, 202 Accepted e confirmacao depois.
//
// Rode com:   node servidor/gateway-sms.js     (ou npm run gateway)
// Porta 3002, para conviver com o json-server (3000) e a API de
// autenticacao (3001).
//
// Endpoints:
//   POST /mensagens { para, texto }  (header X-Api-Key)
//        -> 202 { id, status: 'enfileirada', segmentos, custo } | 400 | 401
//   GET  /mensagens/:id               -> 200 { ..., status } (enfileirada -> entregue)
//   GET  /mensagens                   -> 200 { total, custoTotal, mensagens }
//
// Quem chama este gateway e a NOSSA API (auth-api.js), nunca o app: a chave
// abaixo so existe do lado do servidor.

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');

const PORTA = 3002;
const CHAVE = process.env.GATEWAY_SMS_KEY || 'chave-de-laboratorio';
const ATRASO_ENTREGA_MS = 4000;

const MENSAGENS = [];

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (p) => { dados += p; });
    req.on('end', () => {
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

async function principal() {
  const { avaliarTexto } = await import(
    pathToFileURL(path.join(__dirname, '..', 'src', 'services', 'regrasSms.js')).href
  );

  const servidor = http.createServer(async (req, res) => {
    if (req.headers['x-api-key'] !== CHAVE) {
      return json(res, 401, { erro: 'Credencial do gateway ausente ou invalida.' });
    }

    if (req.method === 'POST' && req.url === '/mensagens') {
      const corpo = await lerCorpo(req);
      if (!corpo || !corpo.para || !corpo.texto) {
        return json(res, 400, { erro: 'Informe para e texto.' });
      }
      // Gateway rigoroso: so aceita o formato internacional. Um gateway
      // menos rigoroso aceitaria, e a operadora descartaria em silencio.
      if (!/^\+55\d{10,11}$/.test(corpo.para)) {
        return json(res, 400, {
          erro: 'Numero fora do formato internacional. Esperado: +55 + DDD + numero, so digitos (ex.: +5516999998888).',
        });
      }
      const avaliacao = avaliarTexto(corpo.texto);
      const mensagem = {
        id: crypto.randomBytes(6).toString('hex'),
        para: corpo.para,
        texto: corpo.texto,
        caracteres: avaliacao.caracteres,
        segmentos: avaliacao.segmentos,
        codificacao: avaliacao.codificacao,
        custo: Number(avaliacao.custo.toFixed(2)),
        status: 'enfileirada',
        recebidaEm: new Date().toISOString(),
      };
      MENSAGENS.push(mensagem);

      const total = MENSAGENS.reduce((s, m) => s + m.custo, 0);
      console.log('\n--- SMS recebido (simulado, nada sai daqui) ---');
      console.log(`para:       ${mensagem.para}`);
      console.log(`texto:      ${mensagem.texto}`);
      console.log(`caracteres: ${mensagem.caracteres} (${mensagem.codificacao})`);
      console.log(`segmentos:  ${mensagem.segmentos}${mensagem.segmentos > 1 ? '  <-- a conta dobrou' : ''}`);
      console.log(`custo:      R$ ${mensagem.custo.toFixed(2)}   (acumulado: R$ ${total.toFixed(2)})`);

      setTimeout(() => {
        mensagem.status = 'entregue';
        mensagem.entregueEm = new Date().toISOString();
        console.log(`SMS ${mensagem.id}: entregue`);
      }, ATRASO_ENTREGA_MS);

      // 202 Accepted: aceita para envio NAO e entregue.
      return json(res, 202, mensagem);
    }

    if (req.method === 'GET' && req.url === '/mensagens') {
      const custoTotal = Number(MENSAGENS.reduce((s, m) => s + m.custo, 0).toFixed(2));
      return json(res, 200, { total: MENSAGENS.length, custoTotal, mensagens: MENSAGENS });
    }

    const m = /^\/mensagens\/([a-f0-9]+)$/.exec(req.url);
    if (req.method === 'GET' && m) {
      const mensagem = MENSAGENS.find((x) => x.id === m[1]);
      return mensagem ? json(res, 200, mensagem) : json(res, 404, { erro: 'Mensagem nao encontrada.' });
    }

    json(res, 404, { erro: 'Rota nao encontrada.' });
  });

  servidor.listen(PORTA, '0.0.0.0', () => {
    console.log(`Gateway de SMS SIMULADO em http://localhost:${PORTA}`);
    console.log('Nenhuma mensagem sai de verdade. Custo simulado por segmento.');
  });
}

principal();
