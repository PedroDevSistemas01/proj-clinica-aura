// src/services/regrasSms.js
// Regras puras do SMS (Aula 13, Passo 2, itens 7 a 9).
//
// Sem nenhum import: o mesmo arquivo é usado pelo app (sms.js), pelo
// servidor (servidor/auth-api.js monta o texto que vai ao gateway) e pelos
// testes (Aula 14). Mesma entrada, mesma saída.

// Custo do gateway SIMULADO, por segmento. Serve para a tela avisar quanto
// a clínica vai gastar antes de enviar.
export const CUSTO_POR_SEGMENTO = 0.08;

// Alfabeto GSM 7 bits. Fora dele (ex.: letra acentuada como "ã", "ç"
// maiúsculo, emoji), a mensagem inteira vira UCS-2 e o limite cai de 160
// para 70 caracteres.
const GSM_BASICO =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENSAO = '^{}\\[~]|€'; // cada um ocupa 2 posições

export function codificacao(texto) {
  for (const ch of texto) {
    if (!GSM_BASICO.includes(ch) && !GSM_EXTENSAO.includes(ch)) return 'UCS-2';
  }
  return 'GSM-7';
}

// Quantos segmentos (e, portanto, quantas cobranças) o texto gera.
// GSM-7: 160 num segmento só; acima disso, 153 por segmento.
// UCS-2: 70 num segmento só; acima disso, 67 por segmento.
export function contarSegmentos(texto = '') {
  const cod = codificacao(texto);
  if (cod === 'UCS-2') {
    const tamanho = [...texto].length;
    if (tamanho === 0) return 0;
    return tamanho <= 70 ? 1 : Math.ceil(tamanho / 67);
  }
  let tamanho = 0;
  for (const ch of texto) tamanho += GSM_EXTENSAO.includes(ch) ? 2 : 1;
  if (tamanho === 0) return 0;
  return tamanho <= 160 ? 1 : Math.ceil(tamanho / 153);
}

// Resumo para a tela: caracteres, segmentos, codificação, custo e alerta.
export function avaliarTexto(texto = '') {
  const segmentos = contarSegmentos(texto);
  const cod = codificacao(texto);
  const limite = cod === 'UCS-2' ? 70 : 160;
  let alerta = null;
  if (segmentos > 1) {
    alerta = `Passou de ${limite} caracteres: são ${segmentos} SMS cobrados por destinatário.`;
  } else if (cod === 'UCS-2') {
    alerta = 'O texto tem acento ou símbolo especial: o limite caiu de 160 para 70 caracteres.';
  }
  return {
    caracteres: [...texto].length,
    segmentos,
    codificacao: cod,
    limite,
    custo: segmentos * CUSTO_POR_SEGMENTO,
    alerta,
  };
}

// Formato internacional (+5516999998888) ou null.
// Número mal formatado é a causa nº 1 de SMS que "some": o gateway aceita, a
// operadora descarta e ninguém fica sabendo.
export function normalizarNumero(numero) {
  if (numero === null || numero === undefined) return null;
  let digitos = String(numero).replace(/\D/g, '');
  if (!digitos) return null;

  // Com DDI do Brasil: 55 + DDD + número (12 ou 13 dígitos).
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    digitos = digitos.slice(2);
  }
  // Sem o 0 de operadora/longa distância na frente (ex.: 016...).
  if (digitos.length === 11 && digitos.startsWith('0')) return null;

  // Agora precisa ser DDD (2 dígitos, sem zero) + 8 (fixo) ou 9 (celular).
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  const ddd = digitos.slice(0, 2);
  if (ddd.startsWith('0')) return null;
  if (digitos.length === 11 && digitos[2] !== '9') return null;

  return `+55${digitos}`;
}

// ---------------------------------------------------------------------------
// Modelos de texto (item 9): SEM dado clínico e SEM acento.
// Pergunta de controle: isso pode aparecer na tela bloqueada? Sim — por isso
// não há médico, especialidade, exame ou motivo. Só data e hora.
// ---------------------------------------------------------------------------
const dois = (n) => String(n).padStart(2, '0');
const dataCurta = (d) => `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
const horaCurta = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;

export const TIPOS_SMS = ['lembrete', 'confirmacao', 'cancelamento'];

export function montarTextoSms(tipo, dataHora) {
  const d = new Date(dataHora);
  const quando = `${dataCurta(d)} as ${horaCurta(d)}`;
  switch (tipo) {
    case 'lembrete':
      return `Clinica Aura: lembrete da sua consulta em ${quando}. Duvidas: (16) 3333-0000.`;
    case 'confirmacao':
      return `Clinica Aura: sua consulta esta confirmada para ${quando}. Duvidas: (16) 3333-0000.`;
    case 'cancelamento':
      return `Clinica Aura: sua consulta de ${quando} foi cancelada. Para remarcar, ligue (16) 3333-0000.`;
    default:
      throw new Error(`Tipo de SMS desconhecido: ${tipo}`);
  }
}
