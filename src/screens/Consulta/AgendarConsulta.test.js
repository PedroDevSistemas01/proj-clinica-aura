// Integração — fluxo de agendamento (Aula 14, Passo 5, item 26) e
// notificação sem permissão (Passo 4, item 23).
import React from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

import { criarApiFalsa, fireEvent, render, screen, waitFor } from '../../test-utils';
import AgendarConsulta from './AgendarConsulta';

const navigation = { setOptions: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
let api;

beforeEach(() => {
  jest.clearAllMocks();
  // Cada teste começa do zero: permissão concedida, a menos que ele mude.
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  api = criarApiFalsa();
  global.fetch = api.fetch;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

async function preencherConsultaCompleta() {
  await fireEvent.press(await screen.findByTestId('paciente-1'));
  await fireEvent.press(screen.getByTestId('medico-1'));
  await fireEvent.changeText(screen.getByTestId('campo-data'), '10/12/2030');
  await fireEvent.changeText(screen.getByTestId('campo-hora'), '14:00');
}

const posts = () => api.fetch.mock.calls.filter(([, o]) => o?.method === 'POST');

describe('Agendar consulta', () => {
  it('formulário incompleto é barrado e nada é gravado', async () => {
    await render(<AgendarConsulta route={{ params: {} }} navigation={navigation} />);
    await screen.findByTestId('paciente-1');

    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent('Escolha o paciente e o médico.');
    expect(posts()).toHaveLength(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('data inválida é barrada', async () => {
    await render(<AgendarConsulta route={{ params: {} }} navigation={navigation} />);
    await preencherConsultaCompleta();
    await fireEvent.changeText(screen.getByTestId('campo-data'), '31/02/2030');

    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent(/DD\/MM\/AAAA/);
    expect(posts()).toHaveLength(0);
  });

  it('notificação sem permissão: avisa e não promete o lembrete', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    await render(<AgendarConsulta route={{ params: {} }} navigation={navigation} />);
    await preencherConsultaCompleta();

    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [, mensagem] = Alert.alert.mock.calls[0];
    expect(mensagem).toMatch(/notificações estão desativadas/);
    expect(mensagem).not.toMatch(/Você receberá um lembrete/);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    // A consulta foi gravada mesmo assim: notificação é conveniência.
    expect(api.db.consultas).toHaveLength(1);
  });

  it('API fora do ar ao gravar: avisa e não cria lembrete', async () => {
    await render(<AgendarConsulta route={{ params: {} }} navigation={navigation} />);
    await preencherConsultaCompleta();
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));

    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(Alert.alert.mock.calls[0][0]).toBe('Não foi possível salvar');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('formulário completo grava primeiro, agenda o lembrete e mostra o resumo', async () => {
    await render(<AgendarConsulta route={{ params: {} }} navigation={navigation} />);
    await preencherConsultaCompleta();

    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [titulo, mensagem] = Alert.alert.mock.calls[0];
    expect(titulo).toBe('Consulta agendada');
    expect(mensagem).toMatch(/Helena Ribeiro com Ana Beatriz Souza, 10\/12\/2030 às 14:00/);
    expect(mensagem).toMatch(/Você receberá um lembrete/);
    expect(api.db.consultas).toHaveLength(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
