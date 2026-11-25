// src/utils/dataHora.js
// Conversões de data e hora usadas pelas telas de consulta (Aula 8).
// Funções puras: dá para testar no Node (tests/dataHora.test.mjs).

const doisDigitos = (n) => String(n).padStart(2, '0');

// Date -> "25/11/2026"
export function formatarData(data) {
  const d = new Date(data);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Date -> "14:30"
export function formatarHora(data) {
  const d = new Date(data);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

// Date -> "25/11/2026 às 14:30"
export function formatarDataHora(data) {
  return `${formatarData(data)} às ${formatarHora(data)}`;
}

// "25/11/2026" + "14:30" -> Date (horário local) ou null se inválido.
export function montarDataHora(textoData, textoHora) {
  const mData = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((textoData || '').trim());
  const mHora = /^(\d{2}):(\d{2})$/.exec((textoHora || '').trim());
  if (!mData || !mHora) return null;

  const [, dia, mes, ano] = mData.map(Number);
  const [, hora, minuto] = mHora.map(Number);
  if (hora > 23 || minuto > 59) return null;

  const data = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
  // Rejeita 31/02 e afins (o Date "rola" para o mês seguinte).
  if (data.getDate() !== dia || data.getMonth() !== mes - 1) return null;
  return data;
}
