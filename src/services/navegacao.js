// src/services/navegacao.js
// Navegar de fora das telas (Aula 8, Passo 4, item 21).
//
// O toque na notificação chega no App.js, fora de qualquer tela, então não há
// `navigation` à mão. Uma ref no NavigationContainer resolve isso.
//
// Cuidado de segurança: o toque não pode furar o login. Se o app abriu pela
// notificação e ainda está no Login (ou no destrancar com biometria), o
// destino fica PENDENTE e só é aberto depois que a pessoa entrar.

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const ROTAS_SEM_SESSAO = ['Login', 'LoginBiometrico'];

let destinoPendente = null;

function rotaAtual() {
  return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
}

// destino = { tela, consultaId }
export function irParaDestino(destino) {
  if (!destino) return;

  const atual = rotaAtual();
  if (!navigationRef.isReady() || !atual || ROTAS_SEM_SESSAO.includes(atual)) {
    destinoPendente = destino;
    return;
  }
  navigationRef.navigate(destino.tela, { consultaId: destino.consultaId });
}

// Chamado pelas telas de login no sucesso: devolve as rotas do reset, já com
// o destino pendente por cima do Menu (e limpa a pendência).
export function rotasAposEntrar(rotaInicial) {
  const rotas = [{ name: rotaInicial }];
  if (destinoPendente) {
    rotas.push({ name: destinoPendente.tela, params: { consultaId: destinoPendente.consultaId } });
    destinoPendente = null;
  }
  return { index: rotas.length - 1, routes: rotas };
}
