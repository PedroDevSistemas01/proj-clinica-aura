// Integração — Bluetooth sem aparelhos e instável (Aula 14, Passo 4, itens 21 e 22).
// O service de BLE (Aula 7) é trocado por um dublê com o defeito escolhido.
import React from 'react';

import { act, fireEvent, render, screen } from '../../test-utils';
import SinaisVitais from './SinaisVitais';
import { criarServicoBle } from '../../services/bluetooth';

jest.mock('../../services/bluetooth', () => ({
  MODO_SIMULADO: true,
  criarServicoBle: jest.fn(),
}));

const route = { params: { paciente: { id: 1, nome: 'Helena Ribeiro' } } };
const navigation = { goBack: jest.fn(), reset: jest.fn() };

function servicoFalso({ aparelhos = [], leituras = [] } = {}) {
  return {
    procurar: jest.fn(async (aoEncontrar) => aparelhos.forEach(aoEncontrar)),
    pararBusca: jest.fn(),
    conectar: jest.fn().mockResolvedValue(),
    // Emite as leituras dadas e depois fica em silêncio: conexão que caiu sem erro.
    monitorarFrequencia: jest.fn((aoLer) => leituras.forEach(aoLer)),
    desconectar: jest.fn().mockResolvedValue(),
  };
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());

describe('Sinais vitais via Bluetooth', () => {
  it('sem aparelhos: diz o que fazer em vez de ficar vazia', async () => {
    criarServicoBle.mockReturnValue(servicoFalso({ aparelhos: [] }));
    await render(<SinaisVitais route={route} navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-sem-aparelhos')).toHaveTextContent(/Ligue o medidor/);
    expect(screen.getByTestId('botao-procurar')).toBeOnTheScreen();
    expect(screen.getByTestId('botao-digitar-manualmente')).toBeOnTheScreen();
  });

  it('conexão instável: percebe que as leituras pararam e não mostra o valor como atual', async () => {
    jest.useFakeTimers();
    criarServicoBle.mockReturnValue(
      servicoFalso({ aparelhos: [{ id: 'cinta-1', nome: 'Cinta' }], leituras: [72] })
    );
    await render(<SinaisVitais route={route} navigation={navigation} />);

    await fireEvent.press(await screen.findByTestId('aparelho-cinta-1'));
    expect(await screen.findByTestId('valor-ao-vivo')).toHaveTextContent(/72/);
    expect(screen.getByTestId('status-leitura')).toHaveTextContent('Ao vivo');

    // 6 s sem leitura nova (o limite da tela é 5 s).
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    expect(screen.getByTestId('status-leitura')).toHaveTextContent(/não é atual/);
    expect(screen.getByTestId('aviso-sinal-perdido')).toBeOnTheScreen();
    expect(screen.getByTestId('botao-reconectar')).toBeOnTheScreen();
  });

  it('sair da tela desconecta o aparelho', async () => {
    const servico = servicoFalso();
    criarServicoBle.mockReturnValue(servico);
    const { unmountAsync } = await render(<SinaisVitais route={route} navigation={navigation} />);
    await screen.findByTestId('mensagem-sem-aparelhos');

    await unmountAsync();

    expect(servico.desconectar).toHaveBeenCalled();
  });
});
