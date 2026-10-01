// Teste da decodificação de frequência cardíaca (Aula 7, extensão).
// A função é pura: roda no Node, sem celular e sem aparelho Bluetooth.
// Rodar com: npm test   (exige Node 22 ou mais novo)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'buffer';

import {
  decodificarFrequencia,
  frequenciaPlausivel,
  mediaDasLeituras,
} from '../src/services/frequenciaCardiaca.js';

const emBase64 = (bytes) => Buffer.from(bytes).toString('base64');

test('valor em 8 bits (flag bit 0 = 0)', () => {
  assert.equal(decodificarFrequencia(emBase64([0x00, 72])), 72);
});

test('valor em 16 bits little-endian (flag bit 0 = 1)', () => {
  // 0x0104 = 260: só cabe em 16 bits
  assert.equal(decodificarFrequencia(emBase64([0x01, 0x04, 0x01])), 260);
  assert.equal(decodificarFrequencia(emBase64([0x01, 75, 0x00])), 75);
});

test('ignora campos opcionais depois do valor (ex.: intervalos RR)', () => {
  assert.equal(decodificarFrequencia(emBase64([0x10, 64, 0xe8, 0x03])), 64);
});

test('pacote vazio, curto ou ausente devolve null', () => {
  assert.equal(decodificarFrequencia(null), null);
  assert.equal(decodificarFrequencia(''), null);
  assert.equal(decodificarFrequencia(emBase64([0x00])), null);
  assert.equal(decodificarFrequencia(emBase64([0x01, 70])), null);
});

test('faixa plausível descarta ruído do sensor', () => {
  assert.equal(frequenciaPlausivel(72), true);
  assert.equal(frequenciaPlausivel(0), false);
  assert.equal(frequenciaPlausivel(255), false);
  assert.equal(frequenciaPlausivel(null), false);
});

test('média arredondada das leituras', () => {
  assert.equal(mediaDasLeituras([]), null);
  assert.equal(mediaDasLeituras([{ bpm: 70 }, { bpm: 71 }, { bpm: 75 }]), 72);
});
