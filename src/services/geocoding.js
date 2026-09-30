// src/services/geocoding.js
// Geocoding pelo Nominatim / OpenStreetMap (Aula 5, Trilha B).
// Decisão: docs/decisoes/002.
//
// Política de uso do Nominatim, que este arquivo cumpre:
//   - identificar a aplicação (User-Agent, enviado pelo httpExterno);
//   - no máximo 1 requisição por segundo (espacamento abaixo; nada de
//     Promise.all com vários endereços);
//   - guardar o resultado (feito em localizacaoClinica.js);
//   - atribuição visível "© OpenStreetMap contributors" na tela que exibe.

import { buscarExterno } from './httpExterno';

const NOME_SERVICO = 'OpenStreetMap (Nominatim)';
const INTERVALO_MINIMO_MS = 1000;

export const ATRIBUICAO_OSM = '© OpenStreetMap contributors';

// Fila simples: cada chamada espera a anterior terminar e respeita pelo menos
// 1 s entre elas, mesmo que alguém chame geocodificar() em um laço.
let fila = Promise.resolve();
let ultimaChamada = 0;

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function chamarEspacado(url) {
  const aguardar = ultimaChamada + INTERVALO_MINIMO_MS - Date.now();
  if (aguardar > 0) {
    await esperar(aguardar);
  }
  ultimaChamada = Date.now();
  return buscarExterno(NOME_SERVICO, url);
}

// Recebe o endereço no NOSSO vocabulário e devolve
// { latitude, longitude, descricao } ou null quando o serviço não encontrou.
export function geocodificar({ logradouro, numero, cidade, uf }) {
  if (!logradouro || !cidade) {
    return Promise.reject(new Error('Informe ao menos logradouro e cidade.'));
  }

  // Busca estruturada: mais precisa que texto livre para endereço brasileiro.
  const parametros = [
    ['format', 'jsonv2'],
    ['limit', '1'],
    ['countrycodes', 'br'],
    ['street', numero ? `${numero} ${logradouro}` : logradouro],
    ['city', cidade],
  ];
  if (uf) {
    parametros.push(['state', uf]);
  }
  const consulta = parametros
    .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor)}`)
    .join('&');
  const url = `https://nominatim.openstreetmap.org/search?${consulta}`;

  const resultado = fila.then(async () => {
    const resultados = await chamarEspacado(url);

    // 200 com lista vazia: sem esta checagem, resultados[0].lat quebraria
    // com "Cannot read property lat of undefined".
    if (!Array.isArray(resultados) || !resultados.length) {
      return null;
    }

    const [primeiro] = resultados;
    return {
      latitude: Number(primeiro.lat),
      longitude: Number(primeiro.lon),
      descricao: primeiro.display_name ?? '',
    };
  });

  // A fila segue mesmo se esta chamada falhar.
  fila = resultado.catch(() => {});
  return resultado;
}
