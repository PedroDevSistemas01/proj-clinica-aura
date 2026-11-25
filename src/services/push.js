// src/services/push.js
// Push notifications (Aula 9).
//
// O app só participa de dois dos quatro passos da arquitetura:
//   1. pedir o token ao serviço de push (o endereço deste app neste aparelho);
//   2. enviar esse token para a API da clínica, vinculado ao usuário logado.
// Depois disso quem decide avisar é o servidor (servidor/enviar-push.js).
//
// O token identifica a INSTALAÇÃO, não a pessoa, e muda (reinstalação, backup
// restaurado, troca de aparelho). Por isso registrarDispositivo() roda a cada
// abertura do app e o registro é tratado como atualização, não duplicata.
//
// Nada aqui pode derrubar o app: sem permissão, sem aparelho físico, sem
// projectId ou sem rede, a função devolve { registrado: false, motivo } e o
// app segue normalmente (o lembrete local da Aula 8 continua valendo).

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { get, post, put, remover } from './api';
import { obterUsuario } from './sessao';
import { garantirPermissao, prepararCanal } from './lembretes';

// O canal e o handler são os mesmos da Aula 8: metade do trabalho de hoje já
// estava pronta. O channelId enviado pelo servidor tem que ser este.
export { CANAL_LEMBRETES } from './lembretes';

// Último token obtido nesta execução (usado para desregistrar no logout).
let tokenAtual = null;

// projectId do EAS: sem ele getExpoPushTokenAsync falha. Fica em app.json
// (extra.eas.projectId), preenchido por `eas init`.
function obterProjectId() {
  return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? null;
}

// Passo 1: token do serviço de push.
export async function obterTokenPush() {
  // Emulador não recebe push: a causa não seria o código.
  if (!Device.isDevice) {
    return { token: null, motivo: 'Push só funciona em aparelho físico.' };
  }

  await prepararCanal();

  const permitido = await garantirPermissao();
  if (!permitido) {
    // Sem permissão nenhum push é entregue, e o app não recebe erro nenhum.
    return { token: null, motivo: 'Notificações desativadas para o app.' };
  }

  const projectId = obterProjectId();
  if (!projectId) {
    return { token: null, motivo: 'Falta o projectId do EAS no app.json (rode `eas init`).' };
  }

  try {
    const resposta = await Notifications.getExpoPushTokenAsync({ projectId });
    tokenAtual = resposta.data; // ExponentPushToken[xxxxxxxx]
    return { token: tokenAtual, motivo: null };
  } catch (e) {
    // Expo Go no Android (SDK 53+), sem rede ou credencial FCM ausente.
    return { token: null, motivo: 'Push indisponível neste build (precisa de development build).' };
  }
}

// Passo 2: a metade que todo mundo esquece. Token que não chega ao servidor
// não serve para nada.
export async function registrarDispositivo() {
  try {
    const { token, motivo } = await obterTokenPush();
    if (!token) return { registrado: false, motivo };

    const usuario = await obterUsuario();
    const dados = {
      token,
      usuarioId: usuario?.id ?? null,
      plataforma: Platform.OS,
      atualizadoEm: new Date().toISOString(),
    };

    // Atualização, não duplicata: o mesmo token vira o mesmo registro.
    const existentes = await get(`/dispositivos?token=${encodeURIComponent(token)}`);
    if (existentes.length > 0) {
      await put(`/dispositivos/${existentes[0].id}`, { ...existentes[0], ...dados });
    } else {
      await post('/dispositivos', { ...dados, criadoEm: dados.atualizadoEm });
    }
    return { registrado: true, motivo: null };
  } catch (e) {
    // API fora do ar: tenta de novo na próxima abertura do app.
    return { registrado: false, motivo: 'Não foi possível falar com a API da clínica.' };
  }
}

// Logout: o aparelho deixa de receber avisos da pessoa que saiu.
// O token é dado do paciente — não fica no servidor sem necessidade.
export async function desregistrarDispositivo() {
  if (!tokenAtual) return;
  try {
    const existentes = await get(`/dispositivos?token=${encodeURIComponent(tokenAtual)}`);
    for (const d of existentes) {
      await remover(`/dispositivos/${d.id}`);
    }
  } catch (e) {
    console.log('Não foi possível desregistrar o dispositivo agora.');
  }
}

// Push que chega com o app ABERTO. Se o servidor avisar que a consulta foi
// cancelada, quem chama apaga o lembrete local daquela consulta (o problema
// em aberto da Aula 8). Devolve a função que remove o listener.
export function ouvirPushRecebido(aoReceber) {
  const assinatura = Notifications.addNotificationReceivedListener((notificacao) => {
    const data = notificacao?.request?.content?.data;
    if (data?.consultaId) aoReceber({ tipo: data.tipo ?? null, consultaId: String(data.consultaId) });
  });
  return () => assinatura.remove();
}
