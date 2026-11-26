// Unidade — regras do SMS (Aula 13). Aula 14, Passo 3, itens 14 e 15.
import { avaliarTexto, contarSegmentos, montarTextoSms, normalizarNumero } from './regrasSms';

describe('contagem de segmentos', () => {
  it('cabe em 1 segmento com exatamente 160 caracteres sem acento', () => {
    expect(contarSegmentos('a'.repeat(160))).toBe(1);
  });

  it('vira 2 segmentos com 161 caracteres', () => {
    expect(contarSegmentos('a'.repeat(161))).toBe(2);
  });

  it('cai para 70 caracteres por segmento quando há acento fora do GSM', () => {
    expect(contarSegmentos('ã'.repeat(70))).toBe(1);
    expect(contarSegmentos('ã'.repeat(71))).toBe(2);
    expect(avaliarTexto('consulta às 14h, não esqueça').alerta).toMatch(/70/);
  });

  it('avisa quando o texto passa de um segmento', () => {
    expect(avaliarTexto('a'.repeat(161)).alerta).toMatch(/2 SMS/);
    expect(avaliarTexto('a'.repeat(160)).alerta).toBeNull();
  });
});

describe('normalização do número', () => {
  it('converte celular com máscara e sem DDI para o formato internacional', () => {
    expect(normalizarNumero('(16) 98111-2233')).toBe('+5516981112233');
  });

  it('aceita o número que já vem com DDI, com ou sem o +', () => {
    expect(normalizarNumero('+55 16 99999-8888')).toBe('+5516999998888');
    expect(normalizarNumero('5516999998888')).toBe('+5516999998888');
  });

  it('aceita telefone fixo com DDD', () => {
    expect(normalizarNumero('(16) 3333-0000')).toBe('+551633330000');
  });

  it('recusa número sem DDD, vazio ou ausente', () => {
    expect(normalizarNumero('99998888')).toBeNull();
    expect(normalizarNumero('')).toBeNull();
    expect(normalizarNumero(null)).toBeNull();
  });
});

describe('modelos de texto', () => {
  it.each(['lembrete', 'confirmacao', 'cancelamento'])(
    'o modelo de %s não tem acento e cabe em um segmento',
    (tipo) => {
      const texto = montarTextoSms(tipo, '2026-12-01T13:00:00.000Z');
      expect(avaliarTexto(texto).codificacao).toBe('GSM-7');
      expect(contarSegmentos(texto)).toBe(1);
    }
  );
});
