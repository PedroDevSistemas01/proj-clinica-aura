// src/services/lembretes.js
// Lembrete local de consulta agendada (Aula 8, Passo 2).
//
// É o ÚNICO arquivo do app que importa expo-notifications. Nenhuma tela chama
// a biblioteca direto: elas usam agendarLembrete / cancelarLembrete / ... daqui.
// Mesmo padrão dos services das Aulas 4 (sessao.js), 5 (viacep.js) e 7
// (bluetooth.js).
//
// O ponto central da aula: o vínculo consultaId -> identificador da
// notificação fica guardado no AsyncStorage. Sem ele não dá para cancelar o
// lembrete certo quando a consulta é remarcada ou cancelada.
//
// Por que AsyncStorage aqui, se na Aula 4 o token foi para o SecureStore?
// Porque o que guardamos é um identificador de notificação, que não é
// segredo. O armazenamento certo depende do que se guarda.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatarHora } from '../utils/dataHora';

// Canal do Android. O channelId do push (Aula 9) precisa bater com este.
export const CANAL_LEMBRETES = 'lembretes-consulta';

// Antecedência do lembrete. Para testar sem esperar uma hora (Passo 3, item
// 16), troque ANTECEDENCIA_TESTE_MINUTOS para 1 e agende uma consulta para
// daqui a 3 minutos. Volte para null antes do commit.
export const ANTECEDENCIA_MINUTOS = 60;
const ANTECEDENCIA_TESTE_MINUTOS = null;

// Nome da tela que o toque abre (vai em content.data, Passo 2, item 11).
export const TELA_DESTINO = 'DetalheConsulta';

const CHAVE_MAPA = 'clinica.lembretes';
const CHAVE_ULTIMO_TOQUE_TRATADO = 'clinica.lembretes.ultimoToqueTratado';

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

// Item 4: sem o handler, a notificação que chega com o app ABERTO não aparece.
// shouldShowBanner/shouldShowList são os nomes do SDK 53+; no SDK 51 deste
// projeto quem vale é shouldShowAlert. Deixamos os dois para a atualização
// de SDK não quebrar o comportamento.
export function configurarHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Item 5: canal do Android com importância alta. Sem canal de importância
// alta, o lembrete chega sem som e sem aparecer no topo da tela.
export async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_LEMBRETES, {
    name: 'Lembretes de consulta',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    // Não mostra o conteúdo na tela bloqueada sem o usuário desbloquear.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

// Item 6: confere primeiro, só pede se ainda não tiver, e não insiste quando
// o sistema já disse que não pergunta mais (canAskAgain = false).
// Devolve true/false; quem avisa o usuário é a tela.
export async function garantirPermissao() {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;

  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

// ---------------------------------------------------------------------------
// Mapa consultaId -> identificador (AsyncStorage)
// ---------------------------------------------------------------------------

async function lerMapa() {
  try {
    const texto = await AsyncStorage.getItem(CHAVE_MAPA);
    return texto ? JSON.parse(texto) : {};
  } catch (e) {
    console.log('Não foi possível ler o mapa de lembretes; seguindo vazio.');
    return {};
  }
}

async function gravarMapa(mapa) {
  await AsyncStorage.setItem(CHAVE_MAPA, JSON.stringify(mapa));
}

// ---------------------------------------------------------------------------
// Agendar e cancelar
// ---------------------------------------------------------------------------

function antecedenciaEmMinutos() {
  return ANTECEDENCIA_TESTE_MINUTOS ?? ANTECEDENCIA_MINUTOS;
}

// Horário em que o lembrete dispararia para esta consulta.
export function calcularHorarioLembrete(dataHora) {
  const inicio = new Date(dataHora).getTime();
  return new Date(inicio - antecedenciaEmMinutos() * 60 * 1000);
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Passo 6: o texto aparece na tela bloqueada, à vista de quem estiver perto.
// Por isso NÃO leva nome do médico, especialidade nem nome do paciente.
// "Você tem uma consulta às 14:00" cumpre a mesma função sem expor nada.
export function montarTextoLembrete(dataHora) {
  const inicio = new Date(dataHora);
  const horario = calcularHorarioLembrete(dataHora);
  const quando = mesmoDia(inicio, horario) ? 'hoje' : 'amanhã';
  return {
    title: 'Lembrete de consulta',
    body: `Você tem uma consulta ${quando} às ${formatarHora(inicio)}.`,
  };
}

// Item 7 a 9: calcula o horário, confere se já passou, cancela o lembrete
// anterior DAQUELA consulta e agenda o novo. Reagendar substitui, nunca
// acumula. Devolve { agendado, identificador, horario }.
//
// Quando o horário do lembrete já passou, NÃO agenda e devolve
// agendado: false — a tela usa isso para não prometer um aviso que não vai
// acontecer (Passo 3, item 13).
export async function agendarLembrete(consulta) {
  const consultaId = String(consulta.id);

  // Um lembrete por consulta: antes de criar, cancela o que existir.
  await cancelarLembrete(consultaId);

  const horario = calcularHorarioLembrete(consulta.dataHora);
  if (horario.getTime() <= Date.now()) {
    return { agendado: false, identificador: null, horario };
  }

  const permitido = await garantirPermissao();
  if (!permitido) {
    return { agendado: false, identificador: null, horario, semPermissao: true };
  }

  const identificador = await Notifications.scheduleNotificationAsync({
    content: {
      ...montarTextoLembrete(consulta.dataHora),
      sound: true,
      // Item 11: consultaId e a tela de destino viajam no data.
      data: { consultaId, tela: TELA_DESTINO, origem: 'lembrete-local' },
    },
    trigger: { date: horario, channelId: CANAL_LEMBRETES },
  });

  const mapa = await lerMapa();
  mapa[consultaId] = identificador;
  await gravarMapa(mapa);

  return { agendado: true, identificador, horario };
}

// Item 10: busca o identificador no mapa, cancela e remove a entrada.
export async function cancelarLembrete(consultaId) {
  const chave = String(consultaId);
  const mapa = await lerMapa();
  const identificador = mapa[chave];
  if (!identificador) return false;

  try {
    await Notifications.cancelScheduledNotificationAsync(identificador);
  } catch (e) {
    // Já disparou ou já foi cancelada pelo sistema: a entrada sai do mapa
    // do mesmo jeito.
  }
  delete mapa[chave];
  await gravarMapa(mapa);
  return true;
}

// Item 17: a prova de que o cancelamento funcionou. Devolve só o que a tela
// precisa mostrar, sem expor o objeto da biblioteca.
export async function listarLembretesPendentes() {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  return agendadas.map((n) => ({
    identificador: n.identifier,
    consultaId: n.content?.data?.consultaId ?? null,
    titulo: n.content?.title ?? '',
    texto: n.content?.body ?? '',
  }));
}

// Passo 7 (extensão): ao abrir a lista de consultas, cancela lembretes de
// consultas que não existem mais (ex.: cancelada pela recepção) e agenda os
// que faltam. Devolve quantos foram cancelados e criados.
export async function sincronizarLembretes(consultas) {
  const mapa = await lerMapa();
  const ativas = new Map(
    consultas
      .filter((c) => c.status !== 'cancelada')
      .map((c) => [String(c.id), c])
  );

  // Identificadores que o sistema ainda tem de fato agendados.
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  const idsNoSistema = new Set(agendadas.map((n) => n.identifier));

  let cancelados = 0;
  let criados = 0;

  for (const consultaId of Object.keys(mapa)) {
    if (!ativas.has(consultaId)) {
      await cancelarLembrete(consultaId);
      cancelados += 1;
    }
  }

  for (const [consultaId, consulta] of ativas) {
    const jaTem = mapa[consultaId] && idsNoSistema.has(mapa[consultaId]);
    const aindaDaTempo = calcularHorarioLembrete(consulta.dataHora).getTime() > Date.now();
    if (!jaTem && aindaDaTempo) {
      const resultado = await agendarLembrete(consulta);
      if (resultado.agendado) criados += 1;
    }
  }

  return { cancelados, criados };
}

// ---------------------------------------------------------------------------
// Toque na notificação (Passo 4)
// ---------------------------------------------------------------------------

// Extrai o destino do content.data. Serve ao lembrete local e ao push
// (Aula 9), que mandam o mesmo formato.
function destinoDaResposta(resposta) {
  const data = resposta?.notification?.request?.content?.data;
  if (!data?.consultaId) return null;
  return { tela: data.tela || TELA_DESTINO, consultaId: String(data.consultaId) };
}

// Caminho A — app aberto ou em segundo plano. Devolve a função que remove o
// listener (chame no retorno do useEffect, item 22).
export function ouvirToqueNaNotificacao(aoTocar) {
  const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
    const destino = destinoDaResposta(resposta);
    if (destino) aoTocar(destino);
  });
  return () => assinatura.remove();
}

// Caminho B — app fechado: o toque ABRE o app e nenhum listener foi
// registrado a tempo. Lemos o último toque na inicialização.
// Item 20: o "último toque" continua disponível depois de tratado, então
// guardamos o identificador do que já foi tratado para não navegar de novo
// a cada recarga em desenvolvimento.
export async function obterToqueQueAbriuOApp() {
  const resposta = await Notifications.getLastNotificationResponseAsync();
  if (!resposta) return null;

  const idResposta = `${resposta.notification.request.identifier}:${resposta.notification.date}`;
  try {
    const jaTratado = await AsyncStorage.getItem(CHAVE_ULTIMO_TOQUE_TRATADO);
    if (jaTratado === idResposta) return null;
    await AsyncStorage.setItem(CHAVE_ULTIMO_TOQUE_TRATADO, idResposta);
  } catch (e) {
    // Sem disco, seguimos: no pior caso navega de novo numa recarga.
  }
  return destinoDaResposta(resposta);
}
