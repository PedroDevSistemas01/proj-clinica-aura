// src/services/mapaClinica.js
// Contas do mapa da clínica (Aula 12), separadas da tela para poder testar
// sem aparelho. Nada aqui fala com o GPS: a posição continua vindo de
// services/localizacao.js (Aula 6).

// Delta é o zoom, invertido: quanto MENOR, mais perto.
//   0.05  -> bairro
//   0.01  -> algumas quadras (o que a clínica usa)
//   0.002 -> a rua
export const DELTA_PADRAO = 0.01;

// Respiro nas bordas do fitToCoordinates: sem ele os dois marcadores ficam
// colados na borda da tela, ou fora dela.
export const BORDA_ENQUADRAMENTO = { top: 80, right: 80, bottom: 80, left: 80 };

// Duração da animação de "Ver a clínica" (animateToRegion), em ms.
export const DURACAO_ANIMACAO_MS = 600;

// Os quatro números da região: centro (latitude/longitude) e altura/largura
// da área visível, em graus. Vai no initialRegion do MapView, nunca na prop
// region controlada (ela prende a câmera e briga com o gesto do usuário).
export function regiaoDaClinica(coordenadas, delta = DELTA_PADRAO) {
  return {
    latitude: coordenadas.latitude,
    longitude: coordenadas.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

// URL que abre o app de mapas do PRÓPRIO aparelho com a clínica marcada.
// Decisão da Aula 12 (ADR 007): não traçar rota dentro do app. O app de mapas
// do aparelho já tem rota, trânsito e as preferências do usuário, sem chave
// nem cota nossa.
//   Android: esquema geo:  -> geo:0,0?q=lat,lng(Nome)
//   iOS:     esquema maps: -> maps:0,0?q=Nome@lat,lng
export function urlAppDeMapas(plataforma, coordenadas, nome) {
  const { latitude, longitude } = coordenadas;
  const nomeCodificado = encodeURIComponent(nome);
  if (plataforma === 'ios') {
    return `maps:0,0?q=${nomeCodificado}@${latitude},${longitude}`;
  }
  return `geo:0,0?q=${latitude},${longitude}(${nomeCodificado})`;
}

// Endereço da clínica em uma linha, para o painel de texto, o balão e o
// accessibilityLabel.
export function enderecoEmTexto(endereco) {
  return `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, ${endereco.cep}`;
}
