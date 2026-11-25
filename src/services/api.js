// src/services/api.js
// Cliente HTTP único do app (Aula 4, Passo 4).
//
// É o ÚNICO ponto do app que fala com a rede. Ele:
//   - lê o token pelo módulo de sessão e monta o header Authorization sozinho;
//   - só coloca Content-Type quando há corpo (um GET não precisa);
//   - trata o 401 UMA vez só (limpa o cofre e lança SessaoExpirada);
//   - devolve null no 204 (típico de DELETE, sem corpo pra converter).
//
// As telas nunca repetem BASE_URL, nem `fetch` cru, nem a checagem de
// resposta.ok: elas chamam get / post / put / remover daqui.

import { obterToken, limparToken } from './sessao';

// ---------------------------------------------------------------------------
// DECISÃO DE SQUAD (Passo 4, item 18) — anotem no README qual endereço vale.
//
//   http://localhost:3000  -> json-server da Aula 3 (CRUD completo: /medicos,
//                             /pacientes, POST/PUT/DELETE). Ele NÃO valida o
//                             token — o header vai junto, mas é ignorado.
//
//   http://localhost:3001  -> API de autenticação de hoje. Valida o token de
//                             verdade (401 -> 200), MAS só tem GET /medicos e
//                             GET /perfil. Não tem /pacientes nem escrita.
//
// Deixamos 3000 como padrão para o CRUD da Aula 3 continuar funcionando; o
// padrão de mandar o token já fica pronto para a API real (que exigirá HTTPS).
// Em celular físico (Expo Go), troque 'localhost' pelo IP da máquina.
// ---------------------------------------------------------------------------
export const BASE_URL = 'http://localhost:3000';

// Erro próprio para o 401. Deixa a tela distinguir "a sessão acabou" de
// "deu ruim na rede" (Passo 4, item 14).
export class SessaoExpirada extends Error {
  constructor(mensagem = 'Sessão expirada. Entre novamente.') {
    super(mensagem);
    this.name = 'SessaoExpirada';
  }
}

// Coração do cliente: monta headers, chama o fetch e trata a resposta.
export async function requisicao(caminho, opcoes = {}) {
  const token = await obterToken();

  const headers = { ...(opcoes.headers || {}) };

  // Authorization em toda requisição que tenha token (item 12).
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Content-Type só quando há corpo (item 13).
  if (opcoes.body) {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers });

  // 401: sessão morta. Limpa o cofre e sinaliza com o erro próprio (item 14).
  if (resposta.status === 401) {
    await limparToken();
    throw new SessaoExpirada();
  }

  // Qualquer outro erro HTTP (item 15).
  if (!resposta.ok) {
    throw new Error(`Erro HTTP ${resposta.status}`);
  }

  // 204 sem conteúdo (típico de DELETE): não há corpo pra converter (item 15).
  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

// Atalhos (item 16). O corpo já é serializado aqui, para as telas não
// repetirem JSON.stringify.
export const get = (caminho) =>
  requisicao(caminho, { method: 'GET' });

export const post = (caminho, corpo) =>
  requisicao(caminho, { method: 'POST', body: JSON.stringify(corpo) });

export const put = (caminho, corpo) =>
  requisicao(caminho, { method: 'PUT', body: JSON.stringify(corpo) });

export const remover = (caminho) =>
  requisicao(caminho, { method: 'DELETE' });
