// Dados institucionais da Clínica Aura.
// Enquanto a API real não expõe um endpoint de "dados da clínica", eles ficam
// aqui, em um lugar só. O endereço é a entrada do geocoding (ADR 002).
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
  // PENDÊNCIA CONSCIENTE (Aula 6): coordenadas escritas no código, obtidas uma
  // vez pelo Nominatim (ADR 002). A tela "Como chegar" prefere as do cache de
  // geocoding, quando existem; estas são o valor de reserva. Na Aula 12 viram
  // o marcador do mapa. Se o endereço acima mudar, atualize aqui também.
  coordenadas: {
    latitude: -22.0164652,
    longitude: -47.8924433,
  },
};
