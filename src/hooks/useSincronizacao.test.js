// Integração — sincronização ao abrir e ao voltar para o app (Aula 11).
// Impede a volta do problema P2 da Aula 13 (abrir do zero não sincronizava).
import { AppState } from 'react-native';

import { act, renderHook, waitFor } from '../test-utils';
import useSincronizacao from './useSincronizacao';
import { precisaSincronizar, sincronizarAgenda } from '../services/sincronizacao';

jest.mock('../services/sincronizacao', () => ({
  INTERVALO_MINIMO_MINUTOS: 15,
  precisaSincronizar: jest.fn(),
  sincronizarAgenda: jest.fn(async (origem) => ({ origem, sucesso: true })),
}));

let ouvinte;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, fn) => {
    ouvinte = fn;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

describe('useSincronizacao', () => {
  it('abrir o app do zero sincroniza quando já passou o intervalo', async () => {
    precisaSincronizar.mockResolvedValue(true);
    renderHook(() => useSincronizacao());

    await waitFor(() => expect(sincronizarAgenda).toHaveBeenCalledWith('abriu o app'));
  });

  it('respeita o intervalo mínimo: não sincroniza se a última foi há pouco', async () => {
    precisaSincronizar.mockResolvedValue(false);
    renderHook(() => useSincronizacao());

    await waitFor(() => expect(precisaSincronizar).toHaveBeenCalled());
    expect(sincronizarAgenda).not.toHaveBeenCalled();
  });

  it('voltar do segundo plano sincroniza; ir de active para inactive não', async () => {
    precisaSincronizar.mockResolvedValue(false);
    renderHook(() => useSincronizacao());
    await waitFor(() => expect(precisaSincronizar).toHaveBeenCalledTimes(1));
    precisaSincronizar.mockResolvedValue(true);

    await act(async () => ouvinte('inactive'));
    expect(sincronizarAgenda).not.toHaveBeenCalled();

    await act(async () => ouvinte('active'));
    await waitFor(() => expect(sincronizarAgenda).toHaveBeenCalledWith('voltou ao app'));
  });
});
