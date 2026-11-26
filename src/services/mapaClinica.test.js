// Unidade — contas do mapa da clínica (Aula 12).
import {
  DELTA_PADRAO,
  enderecoEmTexto,
  regiaoDaClinica,
  urlAppDeMapas,
} from './mapaClinica';

const PONTO = { latitude: -22.0164652, longitude: -47.8924433 };

describe('regiaoDaClinica', () => {
  it('centra na clínica com delta de algumas quadras (0.01)', () => {
    expect(regiaoDaClinica(PONTO)).toEqual({
      latitude: -22.0164652,
      longitude: -47.8924433,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    expect(DELTA_PADRAO).toBe(0.01);
  });

  it('aceita outro delta: menor é mais perto', () => {
    expect(regiaoDaClinica(PONTO, 0.002).latitudeDelta).toBe(0.002);
  });
});

describe('urlAppDeMapas', () => {
  it('Android usa o esquema geo: com o nome codificado', () => {
    expect(urlAppDeMapas('android', PONTO, 'Clínica Aura')).toBe(
      'geo:0,0?q=-22.0164652,-47.8924433(Cl%C3%ADnica%20Aura)'
    );
  });

  it('iOS usa o esquema maps: com o nome codificado', () => {
    expect(urlAppDeMapas('ios', PONTO, 'Clínica Aura')).toBe(
      'maps:0,0?q=Cl%C3%ADnica%20Aura@-22.0164652,-47.8924433'
    );
  });

  it('nome com caracteres especiais não quebra a URL', () => {
    const url = urlAppDeMapas('android', PONTO, 'Clínica (Centro) & Cia');
    expect(url).not.toMatch(/[ &]/);
    expect(url).toContain('%26');
  });
});

describe('enderecoEmTexto', () => {
  it('junta o endereço em uma linha', () => {
    expect(
      enderecoEmTexto({
        logradouro: 'Rua Nove de Julho',
        numero: '1500',
        bairro: 'Centro',
        cidade: 'São Carlos',
        uf: 'SP',
        cep: '13560-042',
      })
    ).toBe('Rua Nove de Julho, 1500 - Centro, São Carlos - SP, 13560-042');
  });
});
