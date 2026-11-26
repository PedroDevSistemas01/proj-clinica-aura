/**
 * @jest-environment node
 */
// Provedor de SMS escolhido pelo .env (fechamento do projeto).
const { enviarPorProvedor, provedorAtual } = require('./provedores-sms');

const AVALIACAO = { segmentos: 1, custo: 0.08 };
const MSG = { para: '+5516999998888', texto: 'Clinica Aura: consulta confirmada.' };
const ORIGINAL = { ...process.env };

function respostaFalsa(status, corpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

beforeEach(() => {
  process.env = { ...ORIGINAL };
  ['SMS_PROVEDOR', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'ZENVIA_API_TOKEN', 'ZENVIA_FROM']
    .forEach((n) => delete process.env[n]);
  global.fetch = jest.fn();
});

afterAll(() => {
  process.env = ORIGINAL;
});

it('sem SMS_PROVEDOR (ou com nome desconhecido) usa o gateway simulado', async () => {
  expect(provedorAtual()).toBe('simulado');
  process.env.SMS_PROVEDOR = 'qualquer';
  expect(provedorAtual()).toBe('simulado');

  fetch.mockResolvedValue(respostaFalsa(202, { id: 'abc', status: 'enfileirada', segmentos: 1, custo: 0.08 }));
  await expect(enviarPorProvedor(MSG, AVALIACAO)).resolves.toEqual({
    id: 'abc', status: 'enfileirada', segmentos: 1, custo: 0.08,
  });
  expect(fetch.mock.calls[0][0]).toMatch(/localhost:3002\/mensagens$/);
});

it('twilio sem chaves responde 503 dizendo o que falta, sem chamar a rede', async () => {
  process.env.SMS_PROVEDOR = 'twilio';
  await expect(enviarPorProvedor(MSG, AVALIACAO)).rejects.toMatchObject({
    status: 503,
    message: expect.stringContaining('TWILIO_ACCOUNT_SID'),
  });
  expect(fetch).not.toHaveBeenCalled();
});

it('twilio com chaves manda formulario com Basic auth e devolve o formato do app', async () => {
  Object.assign(process.env, {
    SMS_PROVEDOR: 'twilio', TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'seg', TWILIO_FROM: '+15550001111',
  });
  fetch.mockResolvedValue(respostaFalsa(201, { sid: 'SM1', status: 'queued', num_segments: '1' }));

  const r = await enviarPorProvedor(MSG, AVALIACAO);

  const [url, opcoes] = fetch.mock.calls[0];
  expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
  expect(opcoes.headers.Authorization).toBe(`Basic ${Buffer.from('AC123:seg').toString('base64')}`);
  expect(new URLSearchParams(opcoes.body).get('To')).toBe('+5516999998888');
  expect(r).toEqual({ id: 'SM1', status: 'enfileirada', segmentos: 1, custo: 0.08 });
});

it('zenvia manda o numero so com digitos e trata erro do provedor como 502', async () => {
  Object.assign(process.env, { SMS_PROVEDOR: 'zenvia', ZENVIA_API_TOKEN: 'tk', ZENVIA_FROM: 'clinica-aura' });
  fetch.mockResolvedValue(respostaFalsa(400, { message: 'Invalid to' }));

  await expect(enviarPorProvedor(MSG, AVALIACAO)).rejects.toMatchObject({ status: 502 });
  const corpo = JSON.parse(fetch.mock.calls[0][1].body);
  expect(corpo.to).toBe('5516999998888');
  expect(fetch.mock.calls[0][1].headers['X-API-TOKEN']).toBe('tk');
});
