// Integração — câmera cancelada (Aula 14, Passo 4, item 19).
//
// DÍVIDA DE ARQUITETURA (registrada no relatório de bugs): o FotoPerfil
// chama o expo-image-picker direto, sem um service próprio. Por isso aqui
// o dublê é da BIBLIOTECA, e não de um service nosso.
import React from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { fireEvent, render, screen, waitFor } from '../test-utils';
import MedicoForm from './MedicoForm';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// O Alert de "Foto de perfil" oferece as opções; o dublê escolhe "Tirar foto".
function escolherNoAlert(textoDoBotao) {
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((b) => b.text === textoDoBotao)?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  ImagePicker.getCameraPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
});

afterEach(() => jest.restoreAllMocks());

describe('Cadastro de médico com a câmera', () => {
  it('câmera cancelada: o formulário não quebra e o cadastro sai sem foto', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });
    escolherNoAlert('Tirar foto');
    const onSave = jest.fn().mockResolvedValue({});
    await render(<MedicoForm onSave={onSave} />);

    await fireEvent.press(screen.getByTestId('botao-foto'));
    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());

    expect(screen.getByTestId('foto-vazia')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('campo-nome'), 'Ana Beatriz Souza');
    await fireEvent.changeText(screen.getByTestId('campo-crm'), 'CRM-SP 123456');
    await fireEvent.press(screen.getByTestId('botao-salvar'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ fotoUri: null })));
  });

  it('câmera indisponível (erro): avisa e o formulário continua', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    ImagePicker.launchCameraAsync.mockRejectedValue(new Error('sem câmera'));
    const titulos = [];
    jest.spyOn(Alert, 'alert').mockImplementation((titulo, _m, botoes) => {
      titulos.push(titulo);
      botoes?.find((b) => b.text === 'Tirar foto')?.onPress?.();
    });
    await render(<MedicoForm onSave={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('botao-foto'));

    await waitFor(() => expect(titulos).toContain('Câmera indisponível'));
    expect(screen.getByTestId('botao-salvar')).toBeOnTheScreen();
  });

  it('câmera funcionando: a foto aparece no formulário', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///foto.jpg' }] });
    escolherNoAlert('Tirar foto');
    await render(<MedicoForm onSave={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('botao-foto'));

    expect(await screen.findByTestId('foto-perfil')).toBeOnTheScreen();
  });
});
