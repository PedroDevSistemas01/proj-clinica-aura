// src/config/ambiente.js
// Valores que mudam de uma instalação para outra (endereço das APIs,
// coordenadas da clínica...). Eles NÃO ficam escritos no código: vêm do .env,
// passam pelo app.config.js (bloco "extra") e chegam aqui pelo expo-constants.
//
// Tudo é opcional. Sem valor no .env, cada módulo usa o padrão de laboratório.

import Constants from 'expo-constants';

export function lerExtra() {
  return Constants?.expoConfig?.extra ?? {};
}

// Texto do .env -> número, ou null quando vazio/inválido.
export function numeroOuNulo(valor) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim().replace(',', '.');
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

// Texto do .env -> URL sem barra no fim, ou null quando vazio.
export function urlOuNula(valor) {
  const texto = String(valor ?? '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(texto)) return null;
  return texto.replace(/\/+$/, '');
}
