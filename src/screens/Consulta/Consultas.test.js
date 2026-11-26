// Integração — fluxo de cancelamento (Aula 14, Passo 5, item 27).
import React from 'react';
import { Alert } from 'react-native';

import { criarApiFalsa, fireEvent, render, screen, waitFor } from '../../test-utils';
import Consultas from './Consultas';
import { cancelarLembrete } from '../../services/lembretes';

jest.mock('@react-navigation/native', () => ({
  // Na tela de verdade roda ao ganhar foco; aqui, ao montar.
  useFocusEffect: (efeito) => require('react').useEffect(efeito, [efeito]),
}));

jest.mock('../../services/lembretes', () => ({
  cancelarLembrete: jest.fn(async () => true),
  listarLembretesPendentes: jest.fn(async () => []),
  sincronizarLembretes: jest.fn(async () => ({ cancelados: 0, criados: 0 })),
}));

const navigation = { navigate: jest.fn(), reset: jest.fn() };
let api;

// Toca no botão do Alert com o texto pedido (o Alert real é nativo).
function tocarNoAlert(texto) {
  const [, , botoes] = Alert.alert.mock.calls[Alert.alert.mock.calls.length - 1];
  return botoes.find((b) => b.text === texto).onPress();
}

beforeEach(() => {
  jest.clearAllMocks();
  api = criarApiFalsa({
    consultas: [{ id: '7', pacienteId: 1, medicoId: 1, dataHora: '2030-12-10T17:00:00.000Z', duracaoMinutos: 30 }],
  });
  global.fetch = api.fetch;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('Cancelar consulta', () => {
  it('pede confirmação antes e não apaga nada se a pessoa voltar', async () => {
    await render(<Consultas navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-cancelar-7'));

    expect(Alert.alert.mock.calls[0][0]).toBe('Cancelar consulta');
    expect(api.db.consultas).toHaveLength(1);
    expect(cancelarLembrete).not.toHaveBeenCalled();
  });

  it('API fora do ar no cancelamento: avisa e NÃO cancela o lembrete', async () => {
    await render(<Consultas navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-cancelar-7'));
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));

    await tocarNoAlert('Cancelar consulta');

    await waitFor(() => expect(Alert.alert.mock.calls.at(-1)[0]).toBe('Erro ao cancelar'));
    expect(cancelarLembrete).not.toHaveBeenCalled();
  });

  it('confirmado: a consulta some da lista e o lembrete é cancelado', async () => {
    await render(<Consultas navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-cancelar-7'));

    await tocarNoAlert('Cancelar consulta');

    await waitFor(() => expect(screen.queryByTestId('consulta-7')).toBeNull());
    expect(api.db.consultas).toHaveLength(0);
    expect(cancelarLembrete).toHaveBeenCalledWith('7');
    // Aula 13: oferece o SMS, mas não envia sozinho.
    expect(Alert.alert.mock.calls.at(-1)[0]).toBe('Consulta cancelada');
    expect(navigation.navigate).not.toHaveBeenCalledWith('EnviarSms', expect.anything());
  });
});

describe('Lista de consultas', () => {
  it('API fora do ar: mostra o erro e oferece tentar de novo, sem travar em carregando', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    await render(<Consultas navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Não foi possível carregar/);
    expect(screen.queryByTestId('carregando')).toBeNull();

    global.fetch = api.fetch;
    await fireEvent.press(screen.getByTestId('botao-tentar-novamente'));

    expect(await screen.findByTestId('consulta-7')).toBeOnTheScreen();
  });
});
