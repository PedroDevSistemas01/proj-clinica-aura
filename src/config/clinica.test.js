// Coordenadas da clínica configuráveis pelo .env (dívida técnica da Aula 6).
import { COORDENADAS_PADRAO, resolverCoordenadas } from './clinica';
import { numeroOuNulo, urlOuNula } from './ambiente';

describe('resolverCoordenadas', () => {
  it('sem configuração, usa as coordenadas padrão', () => {
    expect(resolverCoordenadas({})).toEqual({ coordenadas: COORDENADAS_PADRAO, origem: 'padrao' });
    expect(resolverCoordenadas(undefined).origem).toBe('padrao');
  });

  it('com latitude e longitude válidas, usa as do .env', () => {
    const r = resolverCoordenadas({ clinica: { latitude: '-23.5505', longitude: '-46,6333' } });
    expect(r).toEqual({ coordenadas: { latitude: -23.5505, longitude: -46.6333 }, origem: 'configuracao' });
  });

  it('valor faltando, fora da faixa ou 0,0 volta para o padrão', () => {
    expect(resolverCoordenadas({ clinica: { latitude: '-23.5', longitude: '' } }).origem).toBe('padrao');
    expect(resolverCoordenadas({ clinica: { latitude: '95', longitude: '10' } }).origem).toBe('padrao');
    expect(resolverCoordenadas({ clinica: { latitude: 'abc', longitude: '10' } }).origem).toBe('padrao');
    expect(resolverCoordenadas({ clinica: { latitude: '0', longitude: '0' } }).origem).toBe('padrao');
  });
});

describe('leitura do .env', () => {
  it('numeroOuNulo aceita vírgula e recusa vazio', () => {
    expect(numeroOuNulo('1,5')).toBe(1.5);
    expect(numeroOuNulo('')).toBeNull();
    expect(numeroOuNulo(null)).toBeNull();
  });

  it('urlOuNula tira a barra final e recusa o que não é http(s)', () => {
    expect(urlOuNula('http://192.168.0.10:3000/')).toBe('http://192.168.0.10:3000');
    expect(urlOuNula('ftp://x')).toBeNull();
    expect(urlOuNula('')).toBeNull();
  });
});
