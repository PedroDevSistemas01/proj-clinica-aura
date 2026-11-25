// src/services/sms.js
// SMS de confirmação e cancelamento de consulta (Aula 13, Passo 2).
//
// Dois caminhos EXPLÍCITOS, de propósito. Não existe um "enviarSms"
// genérico: escolher quem envia é decisão de projeto, porque muda o
// remetente, o custo e a garantia.
//
//   pedirEnvioPeloAparelho -> abre o app de mensagens do sistema. Sai do
//     número de quem está com o celular, a operadora dessa pessoa cobra, e o
//     app NÃO fica sabendo se a mensagem foi enviada.
//   pedirEnvioPeloServidor -> pede à NOSSA API, que fala com o gateway. Sai
//     do número da clínica, a clínica paga por segmento, e o gateway confirma
//     depois (202 = enfileirada, não entregue).
//
// O app nunca fala direto com o gateway: a credencial dele ficaria dentro do
// app, e quem abrisse o pacote mandaria SMS na conta da clínica.

import * as SMS from 'expo-sms';

import { AUTH_BASE_URL, post } from './api';

export {
  avaliarTexto,
  contarSegmentos,
  CUSTO_POR_SEGMENTO,
  montarTextoSms,
  normalizarNumero,
  TIPOS_SMS,
} from './regrasSms';

// Item 5. Confere antes de oferecer: tablet sem chip, emulador e aparelho só
// com dados não enviam SMS.
export async function smsDisponivelNoAparelho() {
  try {
    return await SMS.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

// Devolve o result do sistema SEM interpretá-lo como sucesso: no Android ele
// é quase sempre 'unknown', porque o sistema não conta o que o usuário fez.
export async function pedirEnvioPeloAparelho(numeros, texto) {
  const disponivel = await smsDisponivelNoAparelho();
  if (!disponivel) return { disponivel: false, result: null };
  const lista = Array.isArray(numeros) ? numeros : [numeros];
  const { result } = await SMS.sendSMSAsync(lista, texto);
  return { disponivel: true, result }; // 'sent' | 'cancelled' | 'unknown'
}

// Item 6. Post na NOSSA API (servidor/auth-api.js, porta 3001), que valida o
// token, busca o telefone do paciente, monta o texto padrão e chama o
// gateway. Para o cancelamento a consulta já foi apagada, então mandamos
// junto pacienteId e dataHora; o NÚMERO continua vindo do cadastro no
// servidor, nunca do app.
export async function pedirEnvioPeloServidor(consultaId, tipo, extras = {}) {
  return post(`${AUTH_BASE_URL}/sms`, { consultaId: String(consultaId), tipo, ...extras });
}
