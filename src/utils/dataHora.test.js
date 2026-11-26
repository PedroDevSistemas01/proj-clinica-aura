// Unidade — conversões de data e hora do agendamento (Aula 8).
import { formatarData, formatarHora, montarDataHora } from './dataHora';

describe('montarDataHora', () => {
  it('monta a data local a partir de DD/MM/AAAA e HH:MM', () => {
    const d = montarDataHora('25/11/2026', '14:30');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 10, 25, 14, 30,
    ]);
  });

  it('recusa data que não existe, como 31/02', () => {
    expect(montarDataHora('31/02/2026', '10:00')).toBeNull();
  });

  it('recusa formato errado de data e de hora', () => {
    expect(montarDataHora('2026-11-25', '10:00')).toBeNull();
    expect(montarDataHora('25/11/2026', '25:00')).toBeNull();
    expect(montarDataHora('25/11/2026', '9:00')).toBeNull();
  });

  it('é o inverso de formatarData e formatarHora', () => {
    const d = new Date(2026, 0, 5, 8, 7);
    expect(formatarData(d)).toBe('05/01/2026');
    expect(formatarHora(d)).toBe('08:07');
    expect(montarDataHora(formatarData(d), formatarHora(d)).getTime()).toBe(d.getTime());
  });
});
