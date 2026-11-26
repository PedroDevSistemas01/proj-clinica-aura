// Integração — tela de SMS (Aula 13). Cobre os problemas P3 e P4 da lista
// da Aula 13 e a honestidade dos retornos.
import React from 'react';
import { Alert } from 'react-native';

import { criarApiFalsa, fireEvent, render, screen, waitFor } from '../../test-utils';
import EnviarSms from './EnviarSms';
import { SessaoExpirada } from '../../services/api';
import {
  pedirEnvioPeloAparelho,
  pedirEnvioPeloServidor,
  smsDisponivelNoAparelho,
} from '../../services/sms';

jest.mock('../../services/sms', () => ({
  ...jest.requireActual('../../services/regrasSms'),
  smsDisponivelNoAparelho: jest.fn(),
  pedirEnvioPeloAparelho: jest.fn(),
  pedirEnvioPeloServidor: jest.fn(),
}));

const consulta = { id: '7', pacienteId: 1, medicoId: 1, dataHora: '2030-12-10T17:00:00.000Z' };
const navigation = { setOptions: jest.fn(), reset: jest.fn() };
const abrir = (tipo) => render(<EnviarSms route={{ params: { consulta, tipo } }} navigation={navigation} />);

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = criarApiFalsa().fetch;
  smsDisponivelNoAparelho.mockResolvedValue(true);
  // Confirma o envio pela clínica automaticamente.
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botoes) => {
    botoes?.find((b) => b.text === 'Enviar')?.onPress();
  });
});
afterEach(() => jest.restoreAllMocks());

describe('Enviar SMS', () => {
  it('aparelho sem chip: o botão do aparelho fica desabilitado e explica por quê', async () => {
    smsDisponivelNoAparelho.mockResolvedValue(false);
    await abrir('confirmacao');

    expect(await screen.findByTestId('botao-sms-aparelho')).toBeDisabled();
  });

  it('sessão expirada no servidor (P3): volta para o login', async () => {
    pedirEnvioPeloServidor.mockRejectedValue(new SessaoExpirada());
    await abrir('confirmacao');

    await fireEvent.press(await screen.findByTestId('botao-sms-servidor'));

    await waitFor(() =>
      expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] })
    );
  });

  it('pelo aparelho: não diz "enviado", manda conferir no app de mensagens', async () => {
    pedirEnvioPeloAparelho.mockResolvedValue({ disponivel: true, result: 'unknown' });
    await abrir('confirmacao');

    await fireEvent.press(await screen.findByTestId('botao-sms-aparelho'));

    expect(await screen.findByTestId('mensagem-retorno')).toHaveTextContent(/Confira no seu app de mensagens/);
    expect(pedirEnvioPeloAparelho).toHaveBeenCalledWith('+5516981112233', expect.any(String));
  });

  it('pelo servidor: avisa o custo antes e diz "enfileirado", não "entregue"', async () => {
    pedirEnvioPeloServidor.mockResolvedValue({ id: 'x', status: 'enfileirada', segmentos: 1, custo: 0.08 });
    await abrir('confirmacao');

    await fireEvent.press(await screen.findByTestId('botao-sms-servidor'));

    expect(Alert.alert.mock.calls[0][1]).toMatch(/Serão cobrados 1 SMS/);
    expect(await screen.findByTestId('mensagem-retorno')).toHaveTextContent(/enfileirado/);
    expect(screen.getByTestId('mensagem-retorno')).not.toHaveTextContent(/entregue\b/);
  });

  it('cancelamento (P4): manda pacienteId e dataHora, porque a consulta já foi apagada', async () => {
    pedirEnvioPeloServidor.mockResolvedValue({ id: 'x', status: 'enfileirada', segmentos: 1, custo: 0.08 });
    await abrir('cancelamento');

    await fireEvent.press(await screen.findByTestId('botao-sms-servidor'));

    await waitFor(() =>
      expect(pedirEnvioPeloServidor).toHaveBeenCalledWith('7', 'cancelamento', {
        pacienteId: 1,
        dataHora: consulta.dataHora,
      })
    );
  });

  it('o contador destaca quando o texto passa de 160 caracteres', async () => {
    await abrir('confirmacao');

    await fireEvent.changeText(await screen.findByTestId('campo-texto-sms'), 'a'.repeat(161));

    expect(screen.getByTestId('contador-sms')).toHaveTextContent(/2 segmento/);
  });
});
