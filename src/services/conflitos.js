// src/services/conflitos.js
// Verificação de conflitos da agenda (Aula 10, Passos 2 a 4).
//
// Conflito = MESMO médico E horários que se sobrepõem. Funções puras: rodam
// no Node (tests/conflitos.test.mjs), na tela (Aula 10) e na tarefa em
// background (Aula 11).

import { processarEmFatias } from './processamento.js';

const MINUTO = 60 * 1000;

function intervalo(consulta) {
  const inicio = new Date(consulta.dataHora).getTime();
  return { inicio, fim: inicio + (consulta.duracaoMinutos || 30) * MINUTO };
}

// Par normalizado "idMenor|idMaior", para comparar as saídas das versões.
function chavePar(a, b) {
  const x = String(a.id);
  const y = String(b.id);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

// Item 11. Cuidado com a sobreposição: inicioA < fimB && inicioB < fimA.
// Consulta que termina às 10:00 não conflita com a que começa às 10:00.
export function conflita(a, b) {
  if (String(a.medicoId) !== String(b.medicoId)) return false;
  const ia = intervalo(a);
  const ib = intervalo(b);
  return ia.inicio < ib.fim && ib.inicio < ia.fim;
}

// ---------------------------------------------------------------------------
// Passo 2 — versão ingênua: todas com todas, n × (n-1) / 2 comparações.
// Bloqueante de propósito: é a medição "antes".
// ---------------------------------------------------------------------------
export function detectarConflitosIngenuo(consultas) {
  const conflitos = [];
  let comparacoes = 0;
  for (let i = 0; i < consultas.length; i += 1) {
    for (let j = i + 1; j < consultas.length; j += 1) {
      comparacoes += 1;
      if (conflita(consultas[i], consultas[j])) {
        conflitos.push(chavePar(consultas[i], consultas[j]));
      }
    }
  }
  return { conflitos: conflitos.sort(), comparacoes };
}

// ---------------------------------------------------------------------------
// Passo 3 — algoritmo melhor: agrupa por médico, ordena por horário e só
// compara com as consultas SEGUINTES que ainda começam antes de a atual
// terminar.
//
// Nota da squad: comparar só com a imediatamente seguinte perde conflitos
// quando as durações variam (uma de 60 min "engole" a de 30 min seguinte e
// ainda conflita com a próxima). Continuar enquanto `inicio < fim` mantém o
// resultado IDÊNTICO ao ingênuo e, como a agenda está ordenada, quase sempre
// para na primeira ou segunda vizinha.
// ---------------------------------------------------------------------------
export function agruparPorMedico(consultas) {
  const porMedico = new Map();
  for (const c of consultas) {
    const chave = String(c.medicoId);
    if (!porMedico.has(chave)) porMedico.set(chave, []);
    porMedico.get(chave).push({ consulta: c, ...intervalo(c) });
  }
  for (const agenda of porMedico.values()) {
    agenda.sort((a, b) => a.inicio - b.inicio);
  }
  return porMedico;
}

function compararComSeguintes(agenda, i, conflitos) {
  let comparacoes = 0;
  const atual = agenda[i];
  for (let j = i + 1; j < agenda.length && agenda[j].inicio < atual.fim; j += 1) {
    comparacoes += 1;
    conflitos.push(chavePar(atual.consulta, agenda[j].consulta));
  }
  // A última comparação que parou o laço também conta.
  if (i + 1 < agenda.length) comparacoes += 1;
  return comparacoes;
}

export function detectarConflitosOtimizado(consultas) {
  const conflitos = [];
  let comparacoes = 0;
  for (const agenda of agruparPorMedico(consultas).values()) {
    for (let i = 0; i < agenda.length; i += 1) {
      comparacoes += compararComSeguintes(agenda, i, conflitos);
    }
  }
  return { conflitos: conflitos.sort(), comparacoes };
}

// ---------------------------------------------------------------------------
// Passo 4 — mesmo algoritmo, fatiado: cede a vez a cada fatia e ao fim de
// cada médico, informa progresso e aceita cancelamento.
// Buscar da API com await NÃO precisa disso (é espera); o cálculo precisa.
// ---------------------------------------------------------------------------
export async function detectarConflitos(consultas, opcoes = {}) {
  const { tamanhoFatia = 500, aoProgredir, sinal } = opcoes;
  const conflitos = [];
  let comparacoes = 0;
  let feitos = 0;

  for (const agenda of agruparPorMedico(consultas).values()) {
    await processarEmFatias(
      agenda,
      (_item, i) => {
        comparacoes += compararComSeguintes(agenda, i, conflitos);
      },
      { tamanhoFatia, aoProgredir, sinal, deslocamento: feitos, totalGeral: consultas.length }
    );
    feitos += agenda.length;
  }

  return { conflitos: conflitos.sort(), comparacoes };
}

// ---------------------------------------------------------------------------
// Passo 1 — dados suficientes para doer. Usado pelo script
// servidor/gerar-consultas.js e pela tela (gerar na memória).
// medicoId de 1 a 10, dataHora espalhada por 30 dias, 30 ou 60 minutos e
// alguns horários repetidos de propósito.
// ---------------------------------------------------------------------------
export function gerarConsultasDeTeste(quantidade = 3000, inicio = new Date(), idInicial = 1000) {
  const base = new Date(inicio);
  base.setHours(8, 0, 0, 0);
  const consultas = [];

  for (let n = 0; n < quantidade; n += 1) {
    const dia = Math.floor(Math.random() * 30);
    const slot = Math.floor(Math.random() * 20); // 08:00 a 17:30, de 30 em 30 min
    const data = new Date(base.getTime() + dia * 24 * 60 * MINUTO + slot * 30 * MINUTO);
    consultas.push({
      id: String(idInicial + n),
      pacienteId: 1 + Math.floor(Math.random() * 4),
      medicoId: 1 + Math.floor(Math.random() * 10),
      dataHora: data.toISOString(),
      duracaoMinutos: Math.random() < 0.5 ? 30 : 60,
      status: 'agendada',
      gerada: true,
    });
  }

  // Conflitos garantidos: 1 em cada 50 repete médico e horário de outra.
  for (let n = 0; n < quantidade; n += 50) {
    const alvo = consultas[Math.floor(Math.random() * quantidade)];
    consultas[n] = { ...consultas[n], medicoId: alvo.medicoId, dataHora: alvo.dataHora };
  }
  return consultas;
}
