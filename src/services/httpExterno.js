// src/services/httpExterno.js
// Cliente HTTP para serviços de TERCEIROS (Aula 5, Passo 3).
//
// É primo do api.js, mas de propósito NÃO é o mesmo arquivo:
//   - o api.js fala com a NOSSA API e anexa o token da clínica;
//   - este aqui fala com servidores que não controlamos (ViaCEP, Nominatim...)
//     e NUNCA envia o token. Mandar a credencial da clínica para um terceiro
//     seria vazar credencial (item 12).
//
// O que ele garante para toda chamada externa:
//   - timeout com AbortController: "não responder" vira erro, e não uma tela
//     presa em "Carregando..." para sempre (item 11 e 15);
//   - header User-Agent identificando o app (exigido pelo Nominatim, item 11);
//   - resposta.ok conferido ANTES do .json() (o corpo de erro pode ser HTML);
//   - 429 com mensagem própria: insistir costuma render bloqueio maior (item 13);
//   - um erro próprio, ServicoExternoIndisponivel, que diz QUAL serviço falhou
//     (item 14).
//
// Mensagens técnicas vão para o console do Metro; as amigáveis, para a tela.

export const TIMEOUT_MS = 8000;

// Identificação exigida pela política de uso do Nominatim. Sem ela: 403.
export const USER_AGENT = 'ClinicaAura/1.0 (app academico - Aplicacoes Mobile)';

// Erro próprio de serviço externo. A tela usa `nomeServico` para dizer ao
// usuário qual integração falhou, e `limiteAtingido` para não oferecer
// "tentar de novo" logo depois de um 429.
export class ServicoExternoIndisponivel extends Error {
  constructor(nomeServico, mensagem, { status = null, limiteAtingido = false } = {}) {
    super(mensagem);
    this.name = 'ServicoExternoIndisponivel';
    this.nomeServico = nomeServico;
    this.status = status;
    this.limiteAtingido = limiteAtingido;
  }
}

// Faz um GET (ou o método que vier em `opcoes`) em um serviço de terceiro e
// devolve o JSON já convertido. Qualquer falha vira ServicoExternoIndisponivel.
export async function buscarExterno(nomeServico, url, opcoes = {}) {
  const { timeoutMs = TIMEOUT_MS, headers = {}, ...resto } = opcoes;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  let resposta;
  try {
    resposta = await fetch(url, {
      ...resto,
      // Sem Authorization aqui, de propósito. Só User-Agent e Accept.
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...headers,
      },
      signal: controlador.signal,
    });
  } catch (e) {
    // AbortError não significa nada para o usuário: vira "tempo esgotado".
    if (e.name === 'AbortError') {
      console.log(`[${nomeServico}] tempo esgotado após ${timeoutMs} ms`);
      throw new ServicoExternoIndisponivel(
        nomeServico,
        `${nomeServico} demorou demais para responder.`
      );
    }
    // Sem rede, DNS, certificado... falha antes de existir resposta.
    console.log(`[${nomeServico}] falha de rede: ${e.message}`);
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `Sem conexão com ${nomeServico}. Verifique a internet.`
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.status === 429) {
    console.log(`[${nomeServico}] 429 Too Many Requests`);
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `Limite de consultas ao ${nomeServico} atingido. Aguarde alguns minutos antes de tentar de novo.`,
      { status: 429, limiteAtingido: true }
    );
  }

  if (resposta.status === 403) {
    // No Nominatim, 403 quase sempre é termo de uso (User-Agent), não código.
    console.log(`[${nomeServico}] 403 Forbidden - conferir termos de uso/User-Agent`);
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `${nomeServico} recusou a consulta.`,
      { status: 403 }
    );
  }

  // Confere o status ANTES do .json(): o ViaCEP devolve 400 em HTML, e ler
  // isso como JSON daria o inútil "Unexpected token <".
  if (!resposta.ok) {
    console.log(`[${nomeServico}] HTTP ${resposta.status}`);
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `${nomeServico} respondeu com erro (${resposta.status}).`,
      { status: resposta.status }
    );
  }

  try {
    return await resposta.json();
  } catch (e) {
    // 200 com corpo que não é JSON (página de manutenção, proxy...).
    console.log(`[${nomeServico}] resposta não é JSON: ${e.message}`);
    throw new ServicoExternoIndisponivel(
      nomeServico,
      `${nomeServico} enviou uma resposta inesperada.`,
      { status: resposta.status }
    );
  }
}
