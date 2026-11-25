// src/services/bluetooth.js
// Service de Bluetooth (Aula 7, Passo 2) — o coração da aula.
//
// DUAS implementações atrás da MESMA interface:
//
//   procurar(aoEncontrar)            -> começa a busca; para sozinha depois de
//                                       DURACAO_BUSCA_MS. Devolve uma Promise
//                                       que resolve quando a busca termina.
//   pararBusca()
//   conectar(id)
//   monitorarFrequencia(aoReceber, aoFalhar)
//   desconectar()
//
// Nada de "BLE", UUID ou base64 nos nomes: a tela só conhece esta interface.
// Por isso o modo simulado roda no Expo Go e o modo real, num development
// build, sem a tela mudar uma linha.
//
// Um ÚNICO ponto decide qual implementação é usada: MODO_SIMULADO.

import { PermissionsAndroid, Platform } from 'react-native';

import { decodificarFrequencia, frequenciaPlausivel } from './frequenciaCardiaca';

export { decodificarFrequencia } from './frequenciaCardiaca';

// ---------------------------------------------------------------------------
// true  -> aparelhos falsos (Expo Go, sala de aula, sem periférico).
// false -> Bluetooth de verdade. EXIGE development build
//          (npx expo run:android ou EAS Build): o Expo Go não tem o código
//          nativo do react-native-ble-plx.
// ---------------------------------------------------------------------------
export const MODO_SIMULADO = true;

// A busca tem fim: escanear o tempo todo gasta bateria e o Android limita
// quem inicia buscas demais em pouco tempo.
export const DURACAO_BUSCA_MS = 10000;

// Erro próprio, com mensagem que diz ao usuário o que fazer.
export class ErroBluetooth extends Error {
  constructor(tipo, mensagem) {
    super(mensagem);
    this.name = 'ErroBluetooth';
    // 'permissao' | 'desligado' | 'conexao' | 'busca' | 'leitura'
    this.tipo = tipo;
  }
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// ===========================================================================
// MODO SIMULADO
// ===========================================================================

// Chaves para provocar as falhas do Passo 4 sem hardware. Deixem tudo
// desligado no commit; liguem uma por vez para testar a tela.
export const SIMULACAO = {
  semAparelhos: false, // item 20: busca termina sem achar nada
  falharAoConectar: false, // item 21: conectar() lança erro
  perderConexaoAposLeituras: null, // item 22: ex. 4 -> para de emitir após 4 leituras
};

const APARELHOS_FALSOS = [
  { id: 'sim-oximetro-01', nome: 'Oxímetro Aura (simulado)', atrasoMs: 1200 },
  { id: 'sim-cinta-02', nome: 'Cinta cardíaca Polar (simulada)', atrasoMs: 2600 },
];

export function criarServicoBleSimulado() {
  let temporizadoresBusca = [];
  let fimDaBusca = null;
  let intervaloLeituras = null;
  let conectadoA = null;

  function pararBusca() {
    temporizadoresBusca.forEach(clearTimeout);
    temporizadoresBusca = [];
    if (fimDaBusca) {
      fimDaBusca();
      fimDaBusca = null;
    }
  }

  function procurar(aoEncontrar) {
    pararBusca();
    return new Promise((resolver) => {
      fimDaBusca = resolver;

      // Atrasos de propósito: sem eles a tela fica "boa demais" e ninguém
      // percebe que falta o indicador de carregando.
      if (!SIMULACAO.semAparelhos) {
        APARELHOS_FALSOS.forEach(({ id, nome, atrasoMs }) => {
          temporizadoresBusca.push(setTimeout(() => aoEncontrar({ id, nome }), atrasoMs));
          // Aparelho real anuncia várias vezes: o mesmo id chega de novo, e a
          // tela não pode repeti-lo na lista.
          temporizadoresBusca.push(setTimeout(() => aoEncontrar({ id, nome }), atrasoMs + 1500));
        });
      }
      temporizadoresBusca.push(setTimeout(pararBusca, DURACAO_BUSCA_MS / 2));
    });
  }

  async function conectar(id) {
    pararBusca();
    await esperar(1500);
    if (SIMULACAO.falharAoConectar) {
      throw new ErroBluetooth(
        'conexao',
        'Não foi possível conectar. Confira se o aparelho está ligado e perto do celular, e tente de novo.'
      );
    }
    conectadoA = id;
  }

  function monitorarFrequencia(aoReceber /* , aoFalhar */) {
    if (!conectadoA) {
      throw new ErroBluetooth('leitura', 'Conecte a um aparelho antes de ler.');
    }
    let base = 68 + Math.floor(Math.random() * 15);
    let emitidas = 0;
    intervaloLeituras = setInterval(() => {
      if (
        SIMULACAO.perderConexaoAposLeituras &&
        emitidas >= SIMULACAO.perderConexaoAposLeituras
      ) {
        // Silêncio: é assim que uma conexão perdida costuma parecer.
        return;
      }
      // Leituras plausíveis entre 60 e 100 bpm, variando pouco entre si.
      base = Math.min(100, Math.max(60, base + Math.round((Math.random() - 0.5) * 6)));
      emitidas += 1;
      aoReceber(base);
    }, 1500);
  }

  async function desconectar() {
    // Item 23: confira no console que a saída da tela passa por aqui.
    console.log('[bluetooth simulado] desconectando');
    pararBusca();
    if (intervaloLeituras) {
      clearInterval(intervaloLeituras);
      intervaloLeituras = null;
    }
    conectadoA = null;
  }

  return { procurar, pararBusca, conectar, monitorarFrequencia, desconectar };
}

// ===========================================================================
// MODO REAL (development build)
// ===========================================================================

// UUIDs do perfil padrão de frequência cardíaca (Bluetooth SIG). Só existem
// aqui dentro: nenhuma tela conhece UUID.
const SERVICO_FREQUENCIA = '0000180d-0000-1000-8000-00805f9b34fb';
const CARACTERISTICA_FREQUENCIA = '00002a37-0000-1000-8000-00805f9b34fb';

// Android 12 (API 31) em diante: BLUETOOTH_SCAN e BLUETOOTH_CONNECT.
// Antes disso, a busca BLE exigia localização precisa.
export async function pedirPermissoes() {
  if (Platform.OS !== 'android') {
    // No iOS a caixa do sistema aparece sozinha na primeira busca, com o texto
    // do app.json (bluetoothAlwaysPermission).
    return true;
  }

  if (Platform.Version >= 31) {
    const resultado = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(resultado).every(
      (estado) => estado === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const resultado = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return resultado === PermissionsAndroid.RESULTS.GRANTED;
}

// A biblioteca recomenda UM gerenciador por app: criamos na primeira vez que
// o modo real é usado e reaproveitamos nas próximas aberturas da tela.
let gerenciadorUnico = null;

export function criarServicoBleReal() {
  // require DENTRO da função: no modo simulado a biblioteca nunca é carregada,
  // e o app abre no Expo Go.
  // eslint-disable-next-line global-require
  const { BleManager, State } = require('react-native-ble-plx');

  if (!gerenciadorUnico) {
    gerenciadorUnico = new BleManager();
  }
  const gerenciador = gerenciadorUnico;
  let aparelho = null;
  let assinatura = null;
  let temporizadorBusca = null;
  let fimDaBusca = null;

  async function garantirLigado() {
    const estado = await gerenciador.state();
    if (estado !== State.PoweredOn) {
      throw new ErroBluetooth(
        'desligado',
        'O Bluetooth do celular está desligado. Ligue-o e tente de novo.'
      );
    }
  }

  function pararBusca() {
    gerenciador.stopDeviceScan();
    if (temporizadorBusca) {
      clearTimeout(temporizadorBusca);
      temporizadorBusca = null;
    }
    if (fimDaBusca) {
      fimDaBusca();
      fimDaBusca = null;
    }
  }

  async function procurar(aoEncontrar) {
    if (!(await pedirPermissoes())) {
      throw new ErroBluetooth(
        'permissao',
        'Sem a permissão de Bluetooth não dá para procurar o aparelho. Libere nos ajustes ou digite os valores manualmente.'
      );
    }
    await garantirLigado();
    pararBusca();

    return new Promise((resolver, rejeitar) => {
      fimDaBusca = resolver;
      // Filtra pelo serviço de frequência cardíaca: só aparece o que serve.
      gerenciador.startDeviceScan([SERVICO_FREQUENCIA], null, (erro, encontrado) => {
        if (erro) {
          pararBusca();
          rejeitar(new ErroBluetooth('busca', 'A busca por aparelhos falhou. Tente de novo.'));
          return;
        }
        if (encontrado) {
          aoEncontrar({ id: encontrado.id, nome: encontrado.name || encontrado.localName || 'Aparelho sem nome' });
        }
      });
      temporizadorBusca = setTimeout(pararBusca, DURACAO_BUSCA_MS);
    });
  }

  async function conectar(id) {
    pararBusca();
    try {
      aparelho = await gerenciador.connectToDevice(id, { timeout: 10000 });
      // Sem isto, ler/monitorar falha com "característica não encontrada"
      // mesmo com o UUID certo: o app ainda não conhece os serviços do aparelho.
      await aparelho.discoverAllServicesAndCharacteristics();
    } catch (e) {
      aparelho = null;
      throw new ErroBluetooth(
        'conexao',
        'Não foi possível conectar. Confira se o aparelho está ligado, perto do celular e não conectado a outro app.'
      );
    }
  }

  function monitorarFrequencia(aoReceber, aoFalhar) {
    if (!aparelho) {
      throw new ErroBluetooth('leitura', 'Conecte a um aparelho antes de ler.');
    }
    assinatura = aparelho.monitorCharacteristicForService(
      SERVICO_FREQUENCIA,
      CARACTERISTICA_FREQUENCIA,
      (erro, caracteristica) => {
        if (erro) {
          // Inclui a queda da conexão no meio da leitura.
          if (aoFalhar) {
            aoFalhar(new ErroBluetooth('conexao', 'A conexão com o aparelho caiu.'));
          }
          return;
        }
        const bpm = decodificarFrequencia(caracteristica?.value);
        if (frequenciaPlausivel(bpm)) {
          aoReceber(bpm);
        }
      }
    );
  }

  async function desconectar() {
    console.log('[bluetooth] desconectando');
    pararBusca();
    // Cancela a assinatura E encerra a conexão: as duas coisas.
    if (assinatura) {
      assinatura.remove();
      assinatura = null;
    }
    if (aparelho) {
      try {
        await gerenciador.cancelDeviceConnection(aparelho.id);
      } catch (e) {
        // Já estava desconectado: nada a fazer.
      }
      aparelho = null;
    }
  }

  return { procurar, pararBusca, conectar, monitorarFrequencia, desconectar };
}

// Um ponto só decide qual implementação a tela recebe.
export function criarServicoBle() {
  return MODO_SIMULADO ? criarServicoBleSimulado() : criarServicoBleReal();
}
