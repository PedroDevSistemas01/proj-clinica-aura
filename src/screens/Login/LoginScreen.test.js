// Integração — fluxo de login (Aula 14, Passo 5, item 25). Erro primeiro.
import React from 'react';

import { apiForaDoAr, criarApiFalsa, fireEvent, render, screen, waitFor } from '../../test-utils';
import LoginScreen from './LoginScreen';

const navigation = { reset: jest.fn() };

async function preencher(email, senha) {
  await fireEvent.changeText(screen.getByTestId('campo-email'), email);
  await fireEvent.changeText(screen.getByTestId('campo-senha'), senha);
  await fireEvent.press(screen.getByTestId('botao-entrar'));
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = criarApiFalsa().fetch;
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('Login', () => {
  it('senha curta: mostra o erro sem chamar a rede', async () => {
    await render(<LoginScreen navigation={navigation} />);
    await preencher('recepcao@clinica.com', '123');

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent(/6 caracteres/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('credencial inválida: mostra a mensagem do 401 e não entra', async () => {
    await render(<LoginScreen navigation={navigation} />);
    await preencher('recepcao@clinica.com', 'senhaerrada');

    expect(await screen.findByTestId('mensagem-erro', {}, { timeout: 5000 })).toHaveTextContent(
      'E-mail ou senha inválidos.'
    );
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('API de autenticação fora do ar: avisa em vez de travar', async () => {
    global.fetch = apiForaDoAr();
    await render(<LoginScreen navigation={navigation} />);
    await preencher('recepcao@clinica.com', 'clinica123');

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Verifique se a API está no ar/);
  });

  it('credencial válida: entra no app', async () => {
    await render(<LoginScreen navigation={navigation} />);
    await preencher('recepcao@clinica.com', 'clinica123');

    await waitFor(() =>
      expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Menu' }] })
    );
  });
});
