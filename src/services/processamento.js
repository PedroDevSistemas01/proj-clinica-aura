// src/services/processamento.js
// Processamento pesado sem congelar a interface (Aula 10, Passo 4).
//
// JavaScript no React Native roda numa thread só. async/await NÃO leva o
// trabalho para outra thread: só organiza a espera. Enquanto um laço de CPU
// roda, nenhum toque é tratado e nenhum quadro é desenhado.
//
// A saída aqui é fatiar o trabalho e, entre uma fatia e outra, devolver a
// thread para o React Native desenhar a tela e tratar toques.
//
// Funções puras de JavaScript: rodam no Node (tests/conflitos.test.mjs) e,
// na Aula 11, dentro da tarefa em background, onde não existe tela.

// Ceder a vez: uma Promise resolvida por setTimeout(0).
//
// Por que setTimeout e não Promise.resolve()? A Promise resolvida entra na
// fila de MICROtarefas, que é esvaziada inteira antes de o motor voltar ao
// laço de eventos: a tela continua sem chance de desenhar. O setTimeout
// agenda uma MACROtarefa, e entre duas macrotarefas o React Native processa
// toques e desenha. Demonstrado no Momento 2.
export function cederAVez() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Mesmo espírito do AbortController da Aula 5, mas para CPU em vez de rede.
export function criarSinalDeCancelamento() {
  return {
    cancelado: false,
    cancelar() {
      this.cancelado = true;
    },
  };
}

export class ProcessamentoCancelado extends Error {
  constructor() {
    super('Processamento cancelado.');
    this.name = 'ProcessamentoCancelado';
  }
}

// Processa `itens` em fatias de `tamanhoFatia`, cedendo a vez entre elas.
//
// opcoes:
//   tamanhoFatia — quantos itens por fatia (padrão 500, ver README);
//   aoProgredir(feitos, total) — chamado ao fim de cada fatia;
//   sinal — de criarSinalDeCancelamento(); conferido antes de cada fatia;
//   deslocamento / totalGeral — para quem chama várias vezes e quer um
//     progresso único (ex.: um médico de cada vez).
export async function processarEmFatias(itens, processarItem, opcoes = {}) {
  const {
    tamanhoFatia = 500,
    aoProgredir,
    sinal,
    deslocamento = 0,
    totalGeral = itens.length,
  } = opcoes;

  for (let inicio = 0; inicio < itens.length; inicio += tamanhoFatia) {
    if (sinal?.cancelado) {
      console.log(`[processamento] laço interrompido no item ${deslocamento + inicio} de ${totalGeral}`);
      throw new ProcessamentoCancelado();
    }

    const fim = Math.min(inicio + tamanhoFatia, itens.length);
    for (let i = inicio; i < fim; i += 1) {
      processarItem(itens[i], i);
    }

    aoProgredir?.(deslocamento + fim, totalGeral);
    await cederAVez();
  }
}
