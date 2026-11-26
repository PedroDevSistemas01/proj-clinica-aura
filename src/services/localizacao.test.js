// Unidade — distância e tempo estimado (Aula 6). Aula 14, Passo 3, item 16.
import { distanciaKm, estimarTempo, formatarDistancia } from './localizacao';

// Pontos conhecidos: 1 grau de latitude sobre o mesmo meridiano mede
// 2πR/360 = 111,19 km (R = 6371 km). Entre a Praça da Sé (SP) e a Praça XV
// (Rio) são cerca de 361 km em linha reta.
const EQUADOR = { latitude: 0, longitude: 0 };
const UM_GRAU_NORTE = { latitude: 1, longitude: 0 };
const SE = { latitude: -23.5505, longitude: -46.6333 };
const PRACA_XV = { latitude: -22.9035, longitude: -43.1729 };

describe('distanciaKm (Haversine)', () => {
  it('dá zero para o mesmo ponto', () => {
    expect(distanciaKm(SE, SE)).toBeCloseTo(0, 5);
  });

  it('dá 111,19 km para um grau de latitude', () => {
    expect(distanciaKm(EQUADOR, UM_GRAU_NORTE)).toBeCloseTo(111.19, 1);
  });

  it('dá cerca de 361 km entre São Paulo e Rio', () => {
    expect(distanciaKm(SE, PRACA_XV)).toBeCloseTo(361, -1);
  });

  it('é simétrica', () => {
    expect(distanciaKm(SE, PRACA_XV)).toBeCloseTo(distanciaKm(PRACA_XV, SE), 6);
  });
});

describe('formatação', () => {
  it('mostra metros abaixo de 1 km, arredondando para dezenas', () => {
    expect(formatarDistancia(0.834)).toBe('830 m');
  });

  it('mostra quilômetros com uma casa e vírgula acima de 1 km', () => {
    expect(formatarDistancia(12.34)).toBe('12,3 km');
  });

  it('não estima caminhada acima de 5 km', () => {
    expect(estimarTempo(4).aPe).not.toBeNull();
    expect(estimarTempo(6).aPe).toBeNull();
  });
});
