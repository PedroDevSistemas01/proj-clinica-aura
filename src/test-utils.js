// src/test-utils.js — utilidades comuns aos testes de tela (Aula 14).
//
// O material da aula usa a Testing Library 14, em que render e fireEvent
// são ASSÍNCRONOS. A 14 exige React 19 e o projeto está no SDK 51 (React
// 18.2), então instalamos a 13.3, que já traz as versões assíncronas com
// outro nome (renderAsync e fireEventAsync). Este arquivo as exporta com os
// nomes da aula: os testes ficam escritos como na 14 (com await) e não
// precisam mudar quando o projeto subir de SDK.
//
// Também ficam aqui os dublês que vários testes usam: a API falsa e o
// passo a passo do login (Exemplo 6: um lugar só para mudar).

import { fireEventAsync, renderAsync, screen } from '@testing-library/react-native';

export * from '@testing-library/react-native';
export const render = renderAsync;
export const fireEvent = fireEventAsync;

// ---------------------------------------------------------------------------
// API falsa em memória: substitui o global.fetch. Responde às rotas do
// json-server (3000) e da API de autenticação (3001) que o app usa.
// ---------------------------------------------------------------------------
export function criarApiFalsa(dadosIniciais = {}) {
  const db = JSON.parse(
    JSON.stringify({
      medicos: [
        { id: 1, nome: 'Ana Beatriz Souza', especialidade: 'Cardiologia', crm: 'CRM-SP 1' },
        { id: 2, nome: 'Bruno Carvalho Lima', especialidade: 'Ortopedia', crm: 'CRM-SP 2' },
      ],
      pacientes: [{ id: 1, nome: 'Helena Ribeiro', cpf: '123.456.789-00', telefone: '(16) 98111-2233' }],
      consultas: [],
      dispositivos: [],
      ...dadosIniciais,
    })
  );
  let proximoId = 100;

  const responder = (status, corpo) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(corpo),
    });

  const fetchFalso = jest.fn((url, opcoes = {}) => {
    const metodo = opcoes.method || 'GET';
    const { pathname, searchParams } = new URL(url);
    const corpo = opcoes.body ? JSON.parse(opcoes.body) : null;

    if (pathname === '/login') {
      return corpo?.senha === 'clinica123'
        ? responder(200, { token: 'token-de-teste', usuario: { id: 1, nome: 'Recepção', perfil: 'recepcao' } })
        : responder(401, { erro: 'E-mail ou senha inválidos.' });
    }

    const [, colecao, id] = pathname.split('/');
    const lista = db[colecao];
    if (!lista) return responder(404, {});

    if (metodo === 'GET' && id) {
      const item = lista.find((x) => String(x.id) === id);
      return item ? responder(200, item) : responder(404, {});
    }
    if (metodo === 'GET') {
      const filtros = [...searchParams.entries()];
      return responder(200, lista.filter((x) => filtros.every(([k, v]) => String(x[k]) === v)));
    }
    if (metodo === 'POST') {
      const novo = { ...corpo, id: String(proximoId++) };
      lista.push(novo);
      return responder(201, novo);
    }
    if (metodo === 'PUT') {
      const i = lista.findIndex((x) => String(x.id) === id);
      lista[i] = { ...corpo, id: lista[i].id };
      return responder(200, lista[i]);
    }
    if (metodo === 'DELETE') {
      const i = lista.findIndex((x) => String(x.id) === id);
      if (i >= 0) lista.splice(i, 1);
      return responder(200, {});
    }
    return responder(405, {});
  });

  return { db, fetch: fetchFalso };
}

// API fora do ar (Aula 14, Passo 4, item 24).
export function apiForaDoAr() {
  return jest.fn(() => Promise.reject(new TypeError('Network request failed')));
}

// Passo a passo do login, escrito uma vez só (Exemplo 6).
export async function entrar(email = 'recepcao@clinica.com', senha = 'clinica123') {
  await fireEvent.changeText(screen.getByTestId('campo-email'), email);
  await fireEvent.changeText(screen.getByTestId('campo-senha'), senha);
  await fireEvent.press(screen.getByTestId('botao-entrar'));
  await screen.findByTestId('tela-menu', {}, { timeout: 5000 });
}
