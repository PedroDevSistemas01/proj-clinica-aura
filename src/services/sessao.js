// src/services/sessao.js
// Módulo de sessão (Aula 4, Passo 3).
//
// Este é o ÚNICO arquivo do app que fala com o expo-secure-store. Nenhuma
// tela chama SecureStore direto: elas usam salvarToken / obterToken /
// limparToken / estaLogado daqui. Assim, o dia em que trocar o cofre ou a
// chave, muda um lugar só.

import * as SecureStore from 'expo-secure-store';

// Chave única do token no cofre do SO (Keychain no iOS, Keystore no Android).
// Definida uma vez só, aqui dentro (Passo 3, item 9).
const CHAVE_TOKEN = 'clinica.token';
// Quem está logado (id, nome, perfil). Aula 9: o push precisa saber a quem
// vincular o dispositivo, inclusive quando a pessoa entra só com biometria.
const CHAVE_USUARIO = 'clinica.usuario';

// Grava o token no cofre.
export async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

// Lê o token. Se o cofre estiver indisponível, tratamos como "não há sessão"
// em vez de derrubar o app (Passo 3, item 10).
export async function obterToken() {
  try {
    return await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch (e) {
    // De propósito, NÃO imprimimos o erro cru nem o token: log de segurança.
    console.log('Cofre indisponível ao ler o token; seguindo sem sessão.');
    return null;
  }
}

// Apaga o token do cofre (usado no logout e quando a sessão expira).
// Leva junto o usuário guardado: sem sessão, não há a quem vincular nada.
export async function limparToken() {
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
  await SecureStore.deleteItemAsync(CHAVE_USUARIO);
}

// Guarda só o que identifica o usuário (sem senha, sem token).
export async function salvarUsuario(usuario) {
  if (!usuario) return;
  const { id, nome, perfil } = usuario;
  await SecureStore.setItemAsync(CHAVE_USUARIO, JSON.stringify({ id, nome, perfil }));
}

export async function obterUsuario() {
  try {
    const texto = await SecureStore.getItemAsync(CHAVE_USUARIO);
    return texto ? JSON.parse(texto) : null;
  } catch (e) {
    return null;
  }
}

// Existe sessão guardada?
export async function estaLogado() {
  const token = await obterToken();
  return !!token;
}
