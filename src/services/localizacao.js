// src/services/localizacao.js
// Localização do aparelho (Aula 6, Passo 4).
//
// ÚNICO arquivo do app que fala com o expo-location: permissão, leitura e
// cálculo ficam aqui. As telas nunca chamam Location direto (mesmo padrão do
// sessao.js e do httpExterno.js).
//
// Só pedimos localização em PRIMEIRO PLANO: a distância é calculada quando a
// pessoa abre a tela. Localização em segundo plano não é necessária para isso,
// e permissão que não precisamos é risco que não devemos assumir.

import * as Location from 'expo-location';

// Erro próprio para permissão negada. canAskAgain diz se ainda dá para pedir
// (mostrar explicação + "tentar de novo") ou se só resta ir aos ajustes.
export class PermissaoNegada extends Error {
  constructor(canAskAgain) {
    super('Permissão de localização negada.');
    this.name = 'PermissaoNegada';
    this.canAskAgain = canAskAgain;
  }
}

// Serviço de localização desligado no aparelho (GPS/Localização off).
export class LocalizacaoDesligada extends Error {
  constructor() {
    super('A localização do aparelho está desligada.');
    this.name = 'LocalizacaoDesligada';
  }
}

// Consulta o estado da permissão SEM mostrar o pop-up do sistema. Serve para a
// tela decidir se já pode ler a posição ou se precisa explicar antes de pedir.
export async function consultarPermissao() {
  const { granted, canAskAgain } = await Location.getForegroundPermissionsAsync();
  return { concedida: granted, podePerguntar: canAskAgain };
}

function paraPosicao(leitura) {
  return {
    latitude: leitura.coords.latitude,
    longitude: leitura.coords.longitude,
    // Precisão estimada em metros: ± 5 m e ± 2000 m contam histórias diferentes.
    precisao: leitura.coords.accuracy,
    lidaEm: leitura.timestamp,
  };
}

// Pede a permissão (se preciso) e faz uma leitura da posição atual.
export async function obterPosicaoAtual() {
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (!granted) {
    throw new PermissaoNegada(canAskAgain);
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new LocalizacaoDesligada();
  }

  // Balanced: rápido e econômico. Highest gastaria mais bateria e demoraria
  // mais sem melhorar a resposta que a tela precisa dar.
  const leitura = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return paraPosicao(leitura);
}

// Última posição que o sistema já conhece (extensão da aula): deixa a tela
// abrir instantânea, mostrando o valor anterior enquanto a leitura nova chega.
// Só funciona com a permissão já concedida; sem ela, devolve null.
export async function obterUltimaPosicaoConhecida() {
  try {
    const leitura = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    return leitura ? paraPosicao(leitura) : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cálculos (funções puras, sem expo-location)
// ---------------------------------------------------------------------------

const RAIO_DA_TERRA_KM = 6371;
const paraRadianos = (graus) => (graus * Math.PI) / 180;

// Fórmula de Haversine: distância sobre a superfície de uma esfera.
// Pitágoras não serve: latitude e longitude são ângulos, e 1° de longitude
// encolhe à medida que se afasta do equador.
// Atenção: é distância EM LINHA RETA. Ninguém anda em linha reta.
export function distanciaKm(origem, destino) {
  const dLat = paraRadianos(destino.latitude - origem.latitude);
  const dLon = paraRadianos(destino.longitude - origem.longitude);
  const lat1 = paraRadianos(origem.latitude);
  const lat2 = paraRadianos(destino.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_DA_TERRA_KM * Math.asin(Math.sqrt(a));
}

// Metros abaixo de 1 km; quilômetros com uma casa decimal acima.
export function formatarDistancia(km) {
  if (km < 1) {
    // Arredonda para dezenas de metros: mais que isso seria precisão fingida.
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

// Velocidades médias urbanas, só para dar ordem de grandeza. Tempo de viagem
// de verdade exigiria um serviço de rotas (mais um terceiro, como na Aula 5).
const VELOCIDADE_KMH = { aPe: 4.5, carroCidade: 25, carroEstrada: 70 };
const LIMITE_A_PE_KM = 5; // acima disso, estimar caminhada não ajuda ninguém
const LIMITE_CIDADE_KM = 15;

function formatarMinutos(minutos) {
  if (minutos < 1) return 'menos de 1 min';
  if (minutos < 60) return `${Math.round(minutos)} min`;
  const horas = Math.floor(minutos / 60);
  const resto = Math.round(minutos % 60);
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// Devolve { aPe, carro } em texto; aPe é null quando a distância é grande.
export function estimarTempo(km) {
  const velocidadeCarro =
    km <= LIMITE_CIDADE_KM ? VELOCIDADE_KMH.carroCidade : VELOCIDADE_KMH.carroEstrada;
  return {
    aPe: km <= LIMITE_A_PE_KM ? formatarMinutos((km / VELOCIDADE_KMH.aPe) * 60) : null,
    carro: formatarMinutos((km / velocidadeCarro) * 60),
  };
}
