// Integração — GPS com falha (Aula 14, Passo 4, item 18).
// O service de localização é trocado por um dublê: a tela nem percebe.
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '../../test-utils';

import ComoChegar from './ComoChegar';
import {
  consultarPermissao,
  obterPosicaoAtual,
  obterUltimaPosicaoConhecida,
  PermissaoNegada,
} from '../../services/localizacao';

jest.mock('../../services/localizacao', () => ({
  ...jest.requireActual('../../services/localizacao'),
  consultarPermissao: jest.fn(),
  obterPosicaoAtual: jest.fn(),
  obterUltimaPosicaoConhecida: jest.fn(),
}));

jest.mock('../../services/localizacaoClinica', () => ({
  lerCoordenadasEmCache: jest.fn(() => Promise.resolve(null)),
}));

beforeEach(() => {
  jest.clearAllMocks();
  consultarPermissao.mockResolvedValue({ concedida: false, podePerguntar: true });
  obterUltimaPosicaoConhecida.mockResolvedValue(null);
});

describe('Como chegar', () => {
  // Erro primeiro, depois o caminho feliz.
  it('GPS negado: mostra a mensagem e mantém o endereço da clínica', async () => {
    obterPosicaoAtual.mockRejectedValue(new PermissaoNegada(true));
    await render(<ComoChegar />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('mensagem-erro')).toBeOnTheScreen();
    expect(screen.getByTestId('endereco-clinica')).toHaveTextContent(/Rua Nove de Julho/);
  });

  it('GPS bloqueado para sempre: oferece o caminho para os ajustes', async () => {
    const abrirAjustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    obterPosicaoAtual.mockRejectedValue(new PermissaoNegada(false));
    await render(<ComoChegar />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));
    await fireEvent.press(await screen.findByTestId('botao-ajustes'));

    expect(abrirAjustes).toHaveBeenCalled();
    expect(screen.getByTestId('endereco-clinica')).toHaveTextContent(/Rua Nove de Julho/);
  });

  it('GPS falhando por outro motivo: mostra erro e deixa tentar de novo', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    obterPosicaoAtual.mockRejectedValue(new Error('timeout'));
    await render(<ComoChegar />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Não foi possível/);
    expect(screen.getByTestId('botao-localizar')).toBeOnTheScreen();
    console.log.mockRestore();
  });

  it('GPS funcionando: mostra a distância até a clínica', async () => {
    obterPosicaoAtual.mockResolvedValue({ latitude: -22.02, longitude: -47.89, precisao: 20 });
    await render(<ComoChegar />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('distancia')).toHaveTextContent(/m|km/);
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
  });
});
