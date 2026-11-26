// Testes das regras do SMS (Aula 13).
// Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avaliarTexto, contarSegmentos, montarTextoSms, normalizarNumero } from '../src/services/regrasSms.js';

test('160 caracteres sem acento cabem em 1 segmento; 161 viram 2', () => {
  assert.equal(contarSegmentos('a'.repeat(160)), 1);
  assert.equal(contarSegmentos('a'.repeat(161)), 2);
});

test('acento fora do alfabeto GSM derruba o limite para 70', () => {
  assert.equal(contarSegmentos('ã'.repeat(70)), 1);
  assert.equal(contarSegmentos('ã'.repeat(71)), 2);
  assert.match(avaliarTexto('consulta às 14h, não esqueça').alerta, /70/);
});

test('normaliza celular com máscara, com e sem DDI; recusa o que não dá', () => {
  assert.equal(normalizarNumero('(16) 98111-2233'), '+5516981112233');
  assert.equal(normalizarNumero('+55 16 99999-8888'), '+5516999998888');
  assert.equal(normalizarNumero('5516999998888'), '+5516999998888');
  assert.equal(normalizarNumero('(16) 3333-0000'), '+551633330000');
  assert.equal(normalizarNumero('99998888'), null);
  assert.equal(normalizarNumero(''), null);
  assert.equal(normalizarNumero(null), null);
});

test('os modelos não têm acento e cabem em um segmento', () => {
  for (const tipo of ['lembrete', 'confirmacao', 'cancelamento']) {
    const texto = montarTextoSms(tipo, '2026-12-01T13:00:00.000Z');
    assert.equal(avaliarTexto(texto).codificacao, 'GSM-7', tipo);
    assert.equal(contarSegmentos(texto), 1, tipo);
  }
});
