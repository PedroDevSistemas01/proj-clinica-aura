// Unidade — decodificação da frequência cardíaca (Aula 7).
import { Buffer } from 'buffer';

import { decodificarFrequencia, frequenciaPlausivel, mediaDasLeituras } from './frequenciaCardiaca';

const emBase64 = (bytes) => Buffer.from(bytes).toString('base64');

describe('decodificação do pacote BLE de frequência cardíaca', () => {
  it('lê o valor em 8 bits quando o bit 0 da flag é 0', () => {
    expect(decodificarFrequencia(emBase64([0x00, 72]))).toBe(72);
  });

  it('lê o valor em 16 bits little-endian quando o bit 0 da flag é 1', () => {
    expect(decodificarFrequencia(emBase64([0x01, 0x04, 0x01]))).toBe(260);
    expect(decodificarFrequencia(emBase64([0x01, 75, 0x00]))).toBe(75);
  });

  it('ignora os campos opcionais depois do valor (intervalos RR)', () => {
    expect(decodificarFrequencia(emBase64([0x10, 64, 0xe8, 0x03]))).toBe(64);
  });

  it('devolve null para pacote vazio, curto ou ausente', () => {
    expect(decodificarFrequencia(null)).toBeNull();
    expect(decodificarFrequencia('')).toBeNull();
    expect(decodificarFrequencia(emBase64([0x00]))).toBeNull();
    expect(decodificarFrequencia(emBase64([0x01, 70]))).toBeNull();
  });

  it('descarta ruído do sensor fora da faixa plausível', () => {
    expect(frequenciaPlausivel(72)).toBe(true);
    expect(frequenciaPlausivel(0)).toBe(false);
    expect(frequenciaPlausivel(255)).toBe(false);
    expect(frequenciaPlausivel(null)).toBe(false);
  });

  it('calcula a média arredondada e devolve null sem leituras', () => {
    expect(mediaDasLeituras([])).toBeNull();
    expect(mediaDasLeituras([{ bpm: 70 }, { bpm: 71 }, { bpm: 75 }])).toBe(72);
  });
});
