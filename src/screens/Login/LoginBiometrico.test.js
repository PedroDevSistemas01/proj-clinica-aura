// Integração — biometria sem sensor (Aula 14, Passo 4, item 20).
//
// DÍVIDA DE ARQUITETURA (relatório de bugs): a tela chama o
// expo-local-authentication direto. O dublê é da biblioteca.
import React from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

import { fireEvent, render, screen } from '../../test-utils';
import LoginBiometrico from './LoginBiometrico';
import { obterToken } from '../../services/sessao';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

jest.mock('../../services/sessao', () => ({ obterToken: jest.fn() }));

const navigation = { reset: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  obterToken.mockResolvedValue('token-guardado');
  LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
});

describe('Login com biometria', () => {
  it('sem sensor: não mostra o botão de biometria e a senha continua visível', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
    await render(<LoginBiometrico navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-sem-biometria')).toHaveTextContent(/não tem sensor/);
    expect(screen.queryByTestId('botao-biometria')).toBeNull();
    expect(screen.getByTestId('botao-entrar-com-senha')).toBeOnTheScreen();
  });

  it('com sensor mas sem biometria cadastrada: explica e não oferece o botão', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
    await render(<LoginBiometrico navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-sem-biometria')).toHaveTextContent(/nenhuma biometria/);
    expect(screen.queryByTestId('botao-biometria')).toBeNull();
  });

  it('cancelar a biometria leva ao login com senha, sem mensagem de erro', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    await render(<LoginBiometrico navigation={navigation} />);

    await fireEvent.press(await screen.findByTestId('botao-biometria'));

    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
  });

  it('com sensor e biometria: o botão aparece e confirmar entra no app', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
    await render(<LoginBiometrico navigation={navigation} />);

    await fireEvent.press(await screen.findByTestId('botao-biometria'));

    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Menu' }] });
  });
});
