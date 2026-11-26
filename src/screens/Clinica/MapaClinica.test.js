// Integração — GPS com falha (Aula 14, Passo 4, item 18) e mapa (Aula 12).
// O service de localização é trocado por um dublê: a tela nem percebe.
import React from 'react';
import { Linking, Platform } from 'react-native';
import { __camera } from 'react-native-maps';
import { fireEvent, render, screen } from '../../test-utils';

import MapaClinica from './MapaClinica';
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

describe('Como chegar (mapa da clínica)', () => {
  // Erro primeiro, depois o caminho feliz.
  it('GPS negado: mostra a mensagem e mantém o endereço da clínica', async () => {
    obterPosicaoAtual.mockRejectedValue(new PermissaoNegada(true));
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('mensagem-erro')).toBeOnTheScreen();
    expect(screen.getByTestId('endereco-clinica')).toHaveTextContent(/Rua Nove de Julho/);
  });

  it('GPS bloqueado para sempre: oferece o caminho para os ajustes', async () => {
    const abrirAjustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    obterPosicaoAtual.mockRejectedValue(new PermissaoNegada(false));
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));
    await fireEvent.press(await screen.findByTestId('botao-ajustes'));

    expect(abrirAjustes).toHaveBeenCalled();
    expect(screen.getByTestId('endereco-clinica')).toHaveTextContent(/Rua Nove de Julho/);
  });

  it('GPS falhando por outro motivo: mostra erro e deixa tentar de novo', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    obterPosicaoAtual.mockRejectedValue(new Error('timeout'));
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Não foi possível/);
    expect(screen.getByTestId('botao-localizar')).toBeOnTheScreen();
    console.log.mockRestore();
  });

  it('GPS funcionando: mostra a distância até a clínica', async () => {
    obterPosicaoAtual.mockResolvedValue({ latitude: -22.02, longitude: -47.89, precisao: 20 });
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-localizar'));

    expect(await screen.findByTestId('distancia')).toHaveTextContent(/m|km/);
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
  });

  // Aula 12 — o mapa e o que ele não resolve.
  it('mapa tem accessibilityLabel e abre centrado na clínica com delta 0.01', async () => {
    await render(<MapaClinica />);

    const mapa = await screen.findByTestId('mapa-clinica');
    expect(mapa.props.accessibilityLabel).toMatch(/Mapa mostrando a localização da Clínica Aura/);
    // initialRegion, e não region controlada.
    expect(mapa.props.region).toBeUndefined();
    expect(mapa.props.initialRegion).toMatchObject({ latitudeDelta: 0.01, longitudeDelta: 0.01 });

    const marcador = screen.getByTestId('marcador-clinica');
    expect(marcador.props.title).toBe('Clínica Aura');
    expect(marcador.props.description).toMatch(/Rua Nove de Julho/);
    expect(marcador.props.pinColor).toBeTruthy();
  });

  it('a informação vive no texto: endereço e telefone selecionáveis no painel', async () => {
    await render(<MapaClinica />);

    const endereco = await screen.findByTestId('endereco-clinica');
    const telefone = screen.getByTestId('telefone-clinica');
    expect(endereco).toHaveTextContent(/Rua Nove de Julho, 1500/);
    expect(endereco.props.selectable).toBe(true);
    expect(telefone.props.selectable).toBe(true);
  });

  it('todos os botões têm accessibilityRole e accessibilityLabel', async () => {
    await render(<MapaClinica />);
    await screen.findByTestId('botao-localizar');

    for (const id of ['botao-onde-estou', 'botao-ver-clinica', 'botao-como-chegar', 'botao-localizar']) {
      const botao = screen.getByTestId(id);
      expect(botao.props.accessibilityRole).toBe('button');
      expect(botao.props.accessibilityLabel).toBeTruthy();
    }
  });

  it('"Onde estou?": enquadra paciente e clínica com fitToCoordinates e edgePadding', async () => {
    obterPosicaoAtual.mockResolvedValue({ latitude: -22.03, longitude: -47.9, precisao: 15 });
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-onde-estou'));

    expect(await screen.findByTestId('marcador-usuario')).toBeOnTheScreen();
    expect(__camera.fitToCoordinates).toHaveBeenCalledWith(
      [{ latitude: -22.03, longitude: -47.9 }, expect.objectContaining({ latitude: expect.any(Number) })],
      expect.objectContaining({ edgePadding: expect.objectContaining({ top: 80 }), animated: true })
    );
  });

  it('"Ver a clínica": move a câmera com animateToRegion', async () => {
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-ver-clinica'));

    expect(__camera.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitudeDelta: 0.01 }),
      600
    );
  });

  it('"Como chegar": delega a rota ao app de mapas do aparelho (geo: no Android)', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const plataforma = Platform.OS;
    Platform.OS = 'android';
    await render(<MapaClinica />);

    await fireEvent.press(await screen.findByTestId('botao-como-chegar'));

    expect(abrir).toHaveBeenCalledWith(expect.stringMatching(/^geo:0,0\?q=-?\d+\.\d+,-?\d+\.\d+\(Cl%C3%ADnica%20Aura\)$/));
    Platform.OS = plataforma;
    abrir.mockRestore();
  });
});
