// Testes da verificação de conflitos (Aula 10).
// Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  conflita,
  detectarConflitos,
  detectarConflitosIngenuo,
  detectarConflitosOtimizado,
  gerarConsultasDeTeste,
} from '../src/services/conflitos.js';
import { criarSinalDeCancelamento, ProcessamentoCancelado } from '../src/services/processamento.js';

const c = (id, medicoId, hora, duracaoMinutos = 30) => ({
  id,
  medicoId,
  dataHora: `2026-12-01T${hora}:00.000Z`,
  duracaoMinutos,
});

test('sobreposição: mesmo médico e intervalos que se cruzam', () => {
  assert.equal(conflita(c(1, 1, '10:00'), c(2, 1, '10:15')), true);
  assert.equal(conflita(c(1, 1, '10:00'), c(2, 1, '10:30')), false); // encosta, não cruza
  assert.equal(conflita(c(1, 1, '10:00'), c(2, 2, '10:00')), false); // médico diferente
});

test('consulta longa que engole a seguinte ainda conflita com a próxima', () => {
  const agenda = [c('a', 1, '10:00', 60), c('b', 1, '10:00'), c('c', 1, '10:30')];
  const ingenuo = detectarConflitosIngenuo(agenda).conflitos;
  assert.deepEqual(ingenuo, ['a|b', 'a|c']);
  assert.deepEqual(detectarConflitosOtimizado(agenda).conflitos, ingenuo);
});

test('as três versões encontram os MESMOS conflitos em 3000 consultas', async () => {
  const consultas = gerarConsultasDeTeste(3000);
  const ingenuo = detectarConflitosIngenuo(consultas);
  const otimizado = detectarConflitosOtimizado(consultas);
  const fatiado = await detectarConflitos(consultas, { tamanhoFatia: 500 });

  assert.ok(ingenuo.conflitos.length > 0, 'os dados gerados precisam ter conflitos');
  assert.equal(ingenuo.comparacoes, (3000 * 2999) / 2);
  assert.deepEqual(otimizado.conflitos, ingenuo.conflitos);
  assert.deepEqual(fatiado.conflitos, ingenuo.conflitos);
  assert.ok(otimizado.comparacoes < ingenuo.comparacoes / 100);
});

test('o progresso avança aos poucos e o cancelamento para o laço', async () => {
  const consultas = gerarConsultasDeTeste(2000);
  const marcas = [];
  await detectarConflitos(consultas, { tamanhoFatia: 100, aoProgredir: (f, t) => marcas.push(f / t) });
  assert.ok(marcas.length > 10, 'não pode pular de 0% para 100%');
  assert.equal(marcas[marcas.length - 1], 1);

  const sinal = criarSinalDeCancelamento();
  const promessa = detectarConflitos(consultas, {
    tamanhoFatia: 100,
    sinal,
    aoProgredir: (f) => f >= 300 && sinal.cancelar(),
  });
  await assert.rejects(promessa, ProcessamentoCancelado);
});
