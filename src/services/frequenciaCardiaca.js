// src/services/frequenciaCardiaca.js
// Decodificação da característica "Heart Rate Measurement" (0x2A37) do
// perfil padrão de frequência cardíaca do Bluetooth (Aula 7, Passo 2, item 10).
//
// Função PURA: recebe o valor em base64 (como a biblioteca de BLE entrega) e
// devolve o número de batimentos por minuto. Não depende de hardware, de
// React Native nem da biblioteca de BLE, então dá para testar no Node
// (ver tests/frequenciaCardiaca.test.mjs).

import { Buffer } from 'buffer';

// Formato do pacote (especificação Bluetooth SIG, Heart Rate Service):
//   byte 0      -> flags. O bit 0 diz o tamanho do valor:
//                  0 = 1 byte (uint8), 1 = 2 bytes (uint16, little-endian)
//   byte 1 (e 2) -> a frequência em bpm
//   ...         -> campos opcionais (energia gasta, intervalos RR), ignorados
export function decodificarFrequencia(valorBase64) {
  if (typeof valorBase64 !== 'string' || !valorBase64) {
    return null;
  }

  const bytes = Buffer.from(valorBase64, 'base64');
  if (bytes.length < 2) {
    return null;
  }

  const valorEm16Bits = (bytes[0] & 0x01) === 0x01;
  if (valorEm16Bits) {
    return bytes.length >= 3 ? bytes.readUInt16LE(1) : null;
  }
  return bytes.readUInt8(1);
}

// Uma leitura fora desta faixa é ruído do sensor (dedo mal posicionado,
// contato ruim), não um batimento. Não entra na média.
export function frequenciaPlausivel(bpm) {
  return Number.isFinite(bpm) && bpm >= 30 && bpm <= 220;
}

// Média arredondada de várias leituras: uma leitura única de batimento vale
// pouco; a média de várias, sim.
export function mediaDasLeituras(leituras) {
  if (!leituras.length) return null;
  const soma = leituras.reduce((total, leitura) => total + leitura.bpm, 0);
  return Math.round(soma / leituras.length);
}
