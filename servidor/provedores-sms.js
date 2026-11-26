// provedores-sms.js - para onde a NOSSA API manda o SMS (fechamento do projeto).
//
// Escolha pela variavel SMS_PROVEDOR (no .env da raiz ou no terminal):
//
//   simulado (padrao) -> servidor/gateway-sms.js (porta 3002). Nada sai.
//                        GATEWAY_SMS_URL, GATEWAY_SMS_KEY
//   twilio            -> API REST da Twilio. Mensagem DE VERDADE, com custo.
//                        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   zenvia            -> API v2 da Zenvia. Mensagem DE VERDADE, com custo.
//                        ZENVIA_API_TOKEN, ZENVIA_FROM
//
// As chaves ficam SO no servidor (ADR 005). O app nunca ve nenhuma delas.
// Qualquer que seja o provedor, a resposta para o app tem o mesmo formato:
//   { id, status, segmentos, custo }
//
// Se o provedor escolhido estiver sem as chaves, o envio responde 503 com a
// lista do que falta (em vez de cair em silencio para o simulado).

const PROVEDORES = ['simulado', 'twilio', 'zenvia'];

function provedorAtual() {
  const nome = String(process.env.SMS_PROVEDOR || 'simulado').trim().toLowerCase();
  return PROVEDORES.includes(nome) ? nome : 'simulado';
}

function faltando(nomes) {
  return nomes.filter((n) => !process.env[n]);
}

class ProvedorSmsErro extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

async function enviarSimulado({ para, texto }) {
  const url = process.env.GATEWAY_SMS_URL || 'http://localhost:3002';
  const chave = process.env.GATEWAY_SMS_KEY || 'chave-de-laboratorio';
  const r = await fetch(`${url}/mensagens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': chave },
    body: JSON.stringify({ para, texto }),
  });
  const resposta = await r.json().catch(() => ({}));
  if (r.status !== 202) throw new ProvedorSmsErro(502, resposta.erro || `Gateway respondeu ${r.status}`);
  return { id: resposta.id, status: resposta.status, segmentos: resposta.segmentos, custo: resposta.custo };
}

// https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
async function enviarTwilio({ para, texto }, avaliacao) {
  const falta = faltando(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']);
  if (falta.length) throw new ProvedorSmsErro(503, `Provedor twilio sem configuracao: ${falta.join(', ')}.`);

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const credencial = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credencial}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: para, From: process.env.TWILIO_FROM, Body: texto }).toString(),
  });
  const resposta = await r.json().catch(() => ({}));
  if (!r.ok) throw new ProvedorSmsErro(502, `Twilio respondeu ${r.status}: ${resposta.message || 'sem detalhe'}`);
  return {
    id: resposta.sid,
    status: resposta.status === 'queued' || resposta.status === 'accepted' ? 'enfileirada' : resposta.status,
    segmentos: Number(resposta.num_segments) || avaliacao.segmentos,
    custo: Number(avaliacao.custo.toFixed(2)), // estimativa: o preco real vem depois na fatura
  };
}

// https://zenvia.github.io/zenvia-openapi-spec/v2/#tag/SMS
async function enviarZenvia({ para, texto }, avaliacao) {
  const falta = faltando(['ZENVIA_API_TOKEN', 'ZENVIA_FROM']);
  if (falta.length) throw new ProvedorSmsErro(503, `Provedor zenvia sem configuracao: ${falta.join(', ')}.`);

  const r = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-TOKEN': process.env.ZENVIA_API_TOKEN },
    body: JSON.stringify({
      from: process.env.ZENVIA_FROM,
      to: para.replace(/^\+/, ''), // a Zenvia espera so digitos: 5516999998888
      contents: [{ type: 'text', text: texto }],
    }),
  });
  const resposta = await r.json().catch(() => ({}));
  if (!r.ok) throw new ProvedorSmsErro(502, `Zenvia respondeu ${r.status}: ${resposta.message || 'sem detalhe'}`);
  return {
    id: resposta.id,
    status: 'enfileirada',
    segmentos: avaliacao.segmentos,
    custo: Number(avaliacao.custo.toFixed(2)),
  };
}

// avaliacao = avaliarTexto(texto) de src/services/regrasSms.js
async function enviarPorProvedor(mensagem, avaliacao) {
  const provedor = provedorAtual();
  if (provedor === 'twilio') return enviarTwilio(mensagem, avaliacao);
  if (provedor === 'zenvia') return enviarZenvia(mensagem, avaliacao);
  return enviarSimulado(mensagem);
}

module.exports = { PROVEDORES, provedorAtual, enviarPorProvedor, ProvedorSmsErro };
