// Teste das conversões de data/hora das telas de consulta (Aula 8).
// Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatarData, formatarHora, montarDataHora } from '../src/utils/dataHora.js';

test('monta a data local a partir de DD/MM/AAAA e HH:MM', () => {
  const d = montarDataHora('25/11/2026', '14:30');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getDate(), 25);
  assert.equal(d.getHours(), 14);
  assert.equal(d.getMinutes(), 30);
});

test('rejeita data inexistente e formato errado', () => {
  assert.equal(montarDataHora('31/02/2026', '10:00'), null);
  assert.equal(montarDataHora('2026-11-25', '10:00'), null);
  assert.equal(montarDataHora('25/11/2026', '25:00'), null);
  assert.equal(montarDataHora('25/11/2026', '9:00'), null);
});

test('formatar e montar são inversos', () => {
  const d = new Date(2026, 0, 5, 8, 7);
  assert.equal(formatarData(d), '05/01/2026');
  assert.equal(formatarHora(d), '08:07');
  assert.equal(montarDataHora(formatarData(d), formatarHora(d)).getTime(), d.getTime());
});
