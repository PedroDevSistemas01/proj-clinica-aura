// Dados institucionais da Clínica Aura.
// Enquanto a API real não expõe um endpoint de "dados da clínica", eles ficam
// aqui, em um lugar só. O endereço é a entrada do geocoding (ADR 002).

import { lerExtra, numeroOuNulo } from './ambiente';

// Coordenadas de reserva, obtidas uma vez pelo Nominatim (ADR 002). Valem
// quando o .env não define CLINICA_LATITUDE / CLINICA_LONGITUDE.
export const COORDENADAS_PADRAO = {
  latitude: -22.0164652,
  longitude: -47.8924433,
};

// Desde o fechamento do projeto as coordenadas são configuráveis: outra
// unidade da clínica (ou a correção de um ponto errado) não exige mexer no
// código. Defina no .env:
//   CLINICA_LATITUDE=-22.0164652
//   CLINICA_LONGITUDE=-47.8924433
// O app.config.js leva os dois valores para extra.clinica.
//
// Devolve { coordenadas, origem }. origem = 'configuracao' quando os dois
// valores vieram do .env e são válidos; senão 'padrao'.
export function resolverCoordenadas(extra) {
  const latitude = numeroOuNulo(extra?.clinica?.latitude);
  const longitude = numeroOuNulo(extra?.clinica?.longitude);
  const validas =
    latitude !== null &&
    longitude !== null &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0);

  if (validas) {
    return { coordenadas: { latitude, longitude }, origem: 'configuracao' };
  }
  return { coordenadas: { ...COORDENADAS_PADRAO }, origem: 'padrao' };
}

const resolvidas = resolverCoordenadas(lerExtra());

export const CLINICA = {
  nome: 'Clínica Aura',
  telefone: '(16) 3333-0000',
  endereco: {
    cep: '13560-042',
    logradouro: 'Rua Nove de Julho',
    numero: '1500',
    bairro: 'Centro',
    cidade: 'São Carlos',
    uf: 'SP',
  },
  // Com origem 'configuracao', as coordenadas do .env mandam: as telas não
  // consultam nem usam o cache do geocoding. Com 'padrao', a tela "Como
  // chegar" prefere as do cache de geocoding (Aula 5), quando existem.
  coordenadas: resolvidas.coordenadas,
  origemCoordenadas: resolvidas.origem,
};
