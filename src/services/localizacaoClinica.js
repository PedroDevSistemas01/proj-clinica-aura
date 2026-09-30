// src/services/localizacaoClinica.js
// Coordenadas da clínica com cache (Aula 5, Trilha B, item 24).
//
// O endereço da clínica não muda: geocodificamos UMA vez e guardamos no
// aparelho. Economiza cota do Nominatim (a política pede cache) e deixa a
// tela "Sobre a clínica" instantânea nas próximas aberturas.
//
// AsyncStorage (e não o SecureStore): coordenada de endereço público não é
// segredo. O cofre fica reservado para o token.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { geocodificar } from './geocoding';

const CHAVE_CACHE = 'clinica.coordenadas';

// A chave do cache inclui o endereço: se alguém mudar o endereço em
// src/config/clinica.js, o valor antigo deixa de valer sozinho.
function assinatura(endereco) {
  return [endereco.logradouro, endereco.numero, endereco.cidade, endereco.uf]
    .map((parte) => String(parte ?? '').trim().toLowerCase())
    .join('|');
}

export async function lerCoordenadasEmCache(endereco) {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_CACHE);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto);
    return salvo.assinatura === assinatura(endereco) ? salvo.coordenadas : null;
  } catch (e) {
    // Cache corrompido ou indisponível: segue como se não houvesse cache.
    console.log('Cache de coordenadas indisponível; consultando o serviço.');
    return null;
  }
}

async function gravarCoordenadas(endereco, coordenadas) {
  try {
    await AsyncStorage.setItem(
      CHAVE_CACHE,
      JSON.stringify({
        assinatura: assinatura(endereco),
        coordenadas,
        obtidasEm: new Date().toISOString(),
      })
    );
  } catch (e) {
    // Falhar ao gravar não impede de mostrar o resultado agora.
    console.log('Não foi possível gravar as coordenadas no cache.');
  }
}

// Devolve { coordenadas, doCache }. coordenadas pode ser null quando o
// Nominatim respondeu 200 sem resultado. Erros do serviço sobem como
// ServicoExternoIndisponivel.
export async function obterCoordenadasClinica(endereco, { ignorarCache = false } = {}) {
  if (!ignorarCache) {
    const emCache = await lerCoordenadasEmCache(endereco);
    if (emCache) {
      return { coordenadas: emCache, doCache: true };
    }
  }

  const coordenadas = await geocodificar(endereco);
  if (coordenadas) {
    await gravarCoordenadas(endereco, coordenadas);
  }
  return { coordenadas, doCache: false };
}
