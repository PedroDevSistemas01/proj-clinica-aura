// src/services/tarefaBackground.js
// Tarefa periódica em background (Aula 11).
//
// SDK do projeto: Expo 51. O expo-background-task dos slides só existe do
// SDK 53 em diante; aqui usamos o antecessor, expo-background-fetch +
// expo-task-manager. A ideia é a mesma, e a troca está anotada no
// PENDENCIAS.md para quando o projeto subir de SDK. Diferença que importa:
// no background-fetch o minimumInterval é em SEGUNDOS; no background-task,
// em minutos.
//
// Os dois exigem development build. BACKGROUND_REAL é o único ponto que
// liga a tarefa (mesmo padrão do MODO_SIMULADO da Aula 7). As bibliotecas
// só são carregadas quando ele é true, para o Expo Go não quebrar.
//
// Regras que este arquivo segue:
//   - registrar NÃO é agendar: minimumInterval é um pedido, o sistema decide;
//   - defineTask no ESCOPO DO MÓDULO (definirTarefa() é chamada no topo do
//     App.js). Dentro de um useEffect ela "some" quando o sistema acorda o
//     app sozinho, porque nenhum componente é montado;
//   - nenhuma exceção escapa: a tarefa sempre devolve um resultado.

import { backgroundLigado, sincronizarAgenda } from './sincronizacao';

export const BACKGROUND_REAL = false;
export const NOME_TAREFA = 'clinica-sincronizar-agenda';
const INTERVALO_MINIMO_SEGUNDOS = 15 * 60; // MÍNIMO, não garantido

function bibliotecas() {
  // Carregadas só no modo real (development build).
  // eslint-disable-next-line global-require
  const TaskManager = require('expo-task-manager');
  // eslint-disable-next-line global-require
  const BackgroundFetch = require('expo-background-fetch');
  return { TaskManager, BackgroundFetch };
}

// O corpo da tarefa, separado para o botão de teste chamar o MESMO código.
export async function executarTarefa(origem = 'background') {
  try {
    const entrada = await sincronizarAgenda(origem);
    return entrada.sucesso ? 'sucesso' : 'falhou';
  } catch (e) {
    return 'falhou';
  }
}

// Chamar no escopo do módulo do App.js, nunca dentro de componente.
export function definirTarefa() {
  if (!BACKGROUND_REAL) return;
  const { TaskManager, BackgroundFetch } = bibliotecas();
  TaskManager.defineTask(NOME_TAREFA, async () => {
    const resultado = await executarTarefa('background');
    return resultado === 'sucesso'
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  });
}

// Estado honesto para a tela: disponível? registrada? o sistema permite?
export async function estadoDaTarefa() {
  if (!BACKGROUND_REAL) {
    return { disponivel: false, registrada: false, motivo: 'Precisa de development build (BACKGROUND_REAL = false).' };
  }
  try {
    const { TaskManager, BackgroundFetch } = bibliotecas();
    const status = await BackgroundFetch.getStatusAsync();
    const registrada = await TaskManager.isTaskRegisteredAsync(NOME_TAREFA);
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return { disponivel: false, registrada, motivo: 'O usuário desligou a atualização em segundo plano nos ajustes.' };
    }
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      return { disponivel: false, registrada, motivo: 'O sistema restringiu o segundo plano (economia de bateria?).' };
    }
    return { disponivel: true, registrada, motivo: null };
  } catch (e) {
    return { disponivel: false, registrada: false, motivo: 'Segundo plano indisponível neste build.' };
  }
}

export async function registrarTarefa() {
  if (!BACKGROUND_REAL || !(await backgroundLigado())) return false;
  try {
    const { TaskManager, BackgroundFetch } = bibliotecas();
    // Evita registrar a mesma tarefa duas vezes.
    if (await TaskManager.isTaskRegisteredAsync(NOME_TAREFA)) return true;
    await BackgroundFetch.registerTaskAsync(NOME_TAREFA, {
      minimumInterval: INTERVALO_MINIMO_SEGUNDOS,
      stopOnTerminate: false, // Android: continua depois de o app ser fechado
      startOnBoot: true, // Android: volta depois de reiniciar o aparelho
    });
    return true;
  } catch (e) {
    console.log('Não foi possível registrar a tarefa em background.');
    return false;
  }
}

export async function desregistrarTarefa() {
  if (!BACKGROUND_REAL) return;
  try {
    const { TaskManager, BackgroundFetch } = bibliotecas();
    if (await TaskManager.isTaskRegisteredAsync(NOME_TAREFA)) {
      await BackgroundFetch.unregisterTaskAsync(NOME_TAREFA);
    }
  } catch (e) {
    console.log('Não foi possível desligar a tarefa em background.');
  }
}
