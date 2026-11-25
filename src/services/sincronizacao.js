// src/services/sincronizacao.js
// Sincronização da agenda, com e sem tela (Aula 11).
//
// sincronizarAgenda(origem) é chamada pelas três portas:
//   'manual'          -> botão / puxar para atualizar (ignora o intervalo);
//   'voltou ao app'   -> AppState (useSincronizacao), respeitando o intervalo;
//   'background'      -> tarefa periódica (tarefaBackground.js).
//
// Por isso ela NÃO pode depender de nada que só exista com tela montada:
// nada de useState, Alert ou navegação. Reaproveita sem alterações o api.js
// (Aula 4), o detectarConflitos (Aula 10) e o sincronizarLembretes (Aula 8).
// Funciona em background porque o cofre do token não depende de tela.
//
// O único rastro que ela deixa é em disco: o registro com data, origem,
// duração e o que encontrou. É assim que se depura trabalho em background.
//
// Nunca deixa exceção escapar: devolve { sucesso, ... } sempre.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { get } from './api';
import { obterToken } from './sessao';
import { detectarConflitos } from './conflitos';
import { criarSinalDeCancelamento, ProcessamentoCancelado } from './processamento';
import { sincronizarLembretes, temPermissao } from './lembretes';

const CHAVE_HISTORICO = 'clinica.sincronizacao.historico';
const CHAVE_PREFERENCIA = 'clinica.sincronizacao.backgroundLigado';

// Histórico em disco precisa de limite: dado que só cresce vira problema.
const LIMITE_HISTORICO = 20;

// Cinco aberturas em dois minutos não merecem cinco sincronizações.
export const INTERVALO_MINIMO_MINUTOS = 15;

// A tarefa em background tem ~30 s antes de o sistema matar o app. Paramos
// o cálculo bem antes, gravamos o que der e saímos.
const ORCAMENTO_BACKGROUND_MS = 20000;

export async function obterHistorico() {
  try {
    const texto = await AsyncStorage.getItem(CHAVE_HISTORICO);
    return texto ? JSON.parse(texto) : [];
  } catch (e) {
    return [];
  }
}

export async function obterUltimaSincronizacao() {
  const historico = await obterHistorico();
  return historico[0] ?? null;
}

async function registrar(entrada) {
  try {
    const historico = await obterHistorico();
    const novo = [entrada, ...historico].slice(0, LIMITE_HISTORICO);
    await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(novo));
  } catch (e) {
    console.log('Não foi possível gravar o registro da sincronização.');
  }
}

// precisaSincronizar: só olha a última execução BEM-SUCEDIDA.
export async function precisaSincronizar(intervaloMinutos = INTERVALO_MINIMO_MINUTOS) {
  const historico = await obterHistorico();
  const ultima = historico.find((h) => h.sucesso);
  if (!ultima) return true;
  const minutosPassados = (Date.now() - new Date(ultima.quando)) / 60000;
  return minutosPassados >= intervaloMinutos;
}

// O usuário pode desligar o trabalho em background (padrão: ligado).
export async function backgroundLigado() {
  try {
    return (await AsyncStorage.getItem(CHAVE_PREFERENCIA)) !== 'nao';
  } catch (e) {
    return true;
  }
}

export async function definirBackgroundLigado(ligado) {
  await AsyncStorage.setItem(CHAVE_PREFERENCIA, ligado ? 'sim' : 'nao');
}

// Duas portas ao mesmo tempo (ex.: Menu e tela de histórico voltando à
// frente) compartilham a MESMA execução, em vez de baixar tudo duas vezes.
let emAndamento = null;

export function sincronizarAgenda(origem = 'manual') {
  if (!emAndamento) {
    emAndamento = executarSincronizacao(origem).finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

async function executarSincronizacao(origem) {
  const inicio = Date.now();
  const entrada = {
    quando: new Date(inicio).toISOString(),
    origem,
    sucesso: false,
    duracaoMs: 0,
    consultas: null,
    conflitos: null,
    lembretes: null,
    erro: null,
  };

  try {
    // Sem sessão não há o que sincronizar (e não chamamos a API à toa).
    if (!(await obterToken())) {
      entrada.erro = 'sem sessão';
      return entrada;
    }

    // Baixa só o necessário: a coleção de consultas. Em produção, filtrar
    // por período (o usuário pode estar em rede móvel, pagando por isso).
    const consultas = await get('/consultas');
    entrada.consultas = consultas.length;

    const sinal = criarSinalDeCancelamento();
    const relogio =
      origem.startsWith('background') ? setTimeout(() => sinal.cancelar(), ORCAMENTO_BACKGROUND_MS) : null;
    try {
      const { conflitos } = await detectarConflitos(consultas, { sinal });
      entrada.conflitos = conflitos.length;
    } finally {
      if (relogio) clearTimeout(relogio);
    }

    // Aula 8: lembretes de consultas canceladas pela recepção saem do
    // aparelho, mesmo sem ninguém abrir a lista. Só com permissão já dada:
    // em background não há tela para pedir.
    if (await temPermissao()) {
      entrada.lembretes = await sincronizarLembretes(consultas);
    }

    entrada.sucesso = true;
    return entrada;
  } catch (e) {
    entrada.erro =
      e instanceof ProcessamentoCancelado ? 'tempo esgotado (orçamento do sistema)' : e.message || 'falhou';
    return entrada;
  } finally {
    entrada.duracaoMs = Date.now() - inicio;
    await registrar(entrada);
  }
}
