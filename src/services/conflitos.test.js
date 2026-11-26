// Unidade — detecção de conflitos da agenda (Aula 10). Aula 14, Passo 3, item 13.
import {
  conflita,
  detectarConflitos,
  detectarConflitosIngenuo,
  detectarConflitosOtimizado,
  gerarConsultasDeTeste,
} from './conflitos';
import { criarSinalDeCancelamento, ProcessamentoCancelado } from './processamento';

const base = { medicoId: 1, duracaoMinutos: 30 };
const c = (id, medicoId, hora, duracaoMinutos = 30) => ({
  id,
  medicoId,
  dataHora: `2026-11-05T${hora}:00`,
  duracaoMinutos,
});

describe('conflita', () => {
  // A fronteira que só o teste de unidade alcança: trocar '<' por '<='
  // em conflita() faz exatamente este teste falhar.
  it('não conflita quando uma termina onde a outra começa', () => {
    expect(
      conflita({ ...base, dataHora: '2026-11-05T09:00:00' }, { ...base, dataHora: '2026-11-05T09:30:00' })
    ).toBe(false);
  });

  it('conflita quando os horários se sobrepõem no mesmo médico', () => {
    expect(conflita(c(1, 1, '10:00'), c(2, 1, '10:15'))).toBe(true);
  });

  it('não conflita quando o horário é o mesmo mas o médico é outro', () => {
    expect(conflita(c(1, 1, '10:00'), c(2, 2, '10:00'))).toBe(false);
  });
});

describe('versões ingênua, otimizada e fatiada', () => {
  it('encontra o conflito da consulta longa que engole a seguinte', () => {
    const agenda = [c('a', 1, '10:00', 60), c('b', 1, '10:00'), c('c', 1, '10:30')];
    const ingenuo = detectarConflitosIngenuo(agenda).conflitos;
    expect(ingenuo).toEqual(['a|b', 'a|c']);
    expect(detectarConflitosOtimizado(agenda).conflitos).toEqual(ingenuo);
  });

  it('as três encontram os mesmos conflitos em 3000 consultas', async () => {
    const consultas = gerarConsultasDeTeste(3000);
    const ingenuo = detectarConflitosIngenuo(consultas);
    const otimizado = detectarConflitosOtimizado(consultas);
    const fatiado = await detectarConflitos(consultas, { tamanhoFatia: 500 });

    expect(ingenuo.conflitos.length).toBeGreaterThan(0);
    expect(ingenuo.comparacoes).toBe((3000 * 2999) / 2);
    expect(otimizado.conflitos).toEqual(ingenuo.conflitos);
    expect(fatiado.conflitos).toEqual(ingenuo.conflitos);
    expect(otimizado.comparacoes).toBeLessThan(ingenuo.comparacoes / 100);
  });

  it('informa progresso aos poucos, sem pular de 0% para 100%', async () => {
    const marcas = [];
    await detectarConflitos(gerarConsultasDeTeste(2000), {
      tamanhoFatia: 100,
      aoProgredir: (feitos, total) => marcas.push(feitos / total),
    });
    expect(marcas.length).toBeGreaterThan(10);
    expect(marcas[marcas.length - 1]).toBe(1);
  });

  it('para o laço quando o sinal de cancelamento é acionado', async () => {
    const sinal = criarSinalDeCancelamento();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const promessa = detectarConflitos(gerarConsultasDeTeste(2000), {
      tamanhoFatia: 100,
      sinal,
      aoProgredir: (feitos) => feitos >= 300 && sinal.cancelar(),
    });
    await expect(promessa).rejects.toBeInstanceOf(ProcessamentoCancelado);
    console.log.mockRestore();
  });
});
