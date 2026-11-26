// Integração — a jornada completa, em memória (Aula 14, Passo 6).
//
// Renderiza o App inteiro (navegação de verdade) com a API falsa: entrar,
// escolher paciente, médico e horário, confirmar, ver o resumo, voltar e
// conferir que as escolhas anteriores foram limpas.
import React from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { criarApiFalsa, entrar, fireEvent, render, screen, waitFor } from './src/test-utils';
import App from './App';

let api;

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.__limpar();
  api = criarApiFalsa();
  global.fetch = api.fetch;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

// Toca no botão do último Alert mostrado (o Alert real é nativo).
function tocarNoAlert(texto) {
  const [, , botoes] = Alert.alert.mock.calls.at(-1);
  return botoes.find((b) => b.text === texto).onPress();
}

describe('App', () => {
  it('sem sessão, abre no login; senha errada mostra o erro', async () => {
    await render(<App />);

    expect(await screen.findByTestId('tela-login')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('campo-email'), 'recepcao@clinica.com');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), 'senhaerrada');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.queryByTestId('tela-menu')).toBeNull();
  });

  it('jornada completa: entrar, agendar, ver o resumo e voltar com o formulário limpo', async () => {
    await render(<App />);
    await screen.findByTestId('tela-login');
    await entrar();

    await fireEvent.press(screen.getByTestId('menu-Consultas'));
    await fireEvent.press(await screen.findByTestId('botao-agendar'));

    // Agendar: paciente, médico e horário.
    await fireEvent.press(await screen.findByTestId('paciente-1'));
    await fireEvent.press(screen.getByTestId('medico-2'));
    await fireEvent.changeText(screen.getByTestId('campo-data'), '10/12/2030');
    await fireEvent.changeText(screen.getByTestId('campo-hora'), '09:30');
    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    // Resumo da confirmação.
    await waitFor(() => expect(Alert.alert.mock.calls.at(-1)?.[0]).toBe('Consulta agendada'));
    expect(Alert.alert.mock.calls.at(-1)[1]).toMatch(/Helena Ribeiro com Bruno Carvalho Lima, 10\/12\/2030 às 09:30/);
    await tocarNoAlert('OK');

    // De volta à lista, a consulta aparece.
    const id = api.db.consultas[0].id;
    expect(await screen.findByTestId(`consulta-${id}`)).toBeOnTheScreen();

    // Voltar ao início do fluxo: as escolhas anteriores foram limpas.
    await fireEvent.press(screen.getByTestId('botao-agendar'));
    expect(await screen.findByTestId('paciente-1')).not.toBeSelected();
    expect(screen.getByTestId('medico-2')).not.toBeSelected();
    expect(screen.getByTestId('campo-data')).toHaveDisplayValue('');
  });
});
