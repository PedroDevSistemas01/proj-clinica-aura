// Integração — API fora do ar (Aula 14, Passo 4, item 24).
import React from 'react';

import { apiForaDoAr, criarApiFalsa, fireEvent, render, screen } from '../../test-utils';
import Paciente from './Paciente';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efeito) => require('react').useEffect(efeito, [efeito]),
}));

const navigation = { navigate: jest.fn(), reset: jest.fn() };

describe('Lista de pacientes', () => {
  it('API fora do ar: mostra erro e "Tentar novamente", sem ficar em Carregando', async () => {
    global.fetch = apiForaDoAr();
    await render(<Paciente navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Confira se a API está no ar/);
    expect(screen.getByTestId('botao-tentar-novamente')).toBeOnTheScreen();
    expect(screen.queryByTestId('carregando')).toBeNull();
  });

  it('tentar de novo com a API de volta mostra a lista', async () => {
    global.fetch = apiForaDoAr();
    await render(<Paciente navigation={navigation} />);
    await screen.findByTestId('mensagem-erro');

    global.fetch = criarApiFalsa().fetch;
    await fireEvent.press(screen.getByTestId('botao-tentar-novamente'));

    expect(await screen.findByTestId('paciente-1')).toBeOnTheScreen();
  });
});
