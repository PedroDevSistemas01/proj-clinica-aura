// Foto de perfil fora do cache (dívida técnica da Aula 6).
import * as FileSystem from 'expo-file-system';

import { apagarFoto, estaNaPastaPermanente, guardarFoto } from './fotos';

const PASTA = 'file:///documentos/fotos-perfil/';
const CACHE = 'file:///cache/ImagePicker/abc.jpeg';

beforeEach(() => {
  jest.clearAllMocks();
  FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
  FileSystem.copyAsync.mockResolvedValue(undefined);
});

describe('guardarFoto', () => {
  it('copia a foto do cache para a pasta permanente', async () => {
    const nova = await guardarFoto(CACHE);

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(PASTA, { intermediates: true });
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({ from: CACHE, to: nova });
    expect(nova.startsWith(PASTA)).toBe(true);
    expect(nova.endsWith('.jpeg')).toBe(true);
    expect(estaNaPastaPermanente(nova)).toBe(true);
  });

  it('não copia de novo uma foto que já está guardada', async () => {
    const jaGuardada = `${PASTA}foto-1.jpg`;
    expect(await guardarFoto(jaGuardada)).toBe(jaGuardada);
    expect(FileSystem.copyAsync).not.toHaveBeenCalled();
  });

  it('se a cópia falhar, mantém a URI original em vez de perder a foto', async () => {
    FileSystem.copyAsync.mockRejectedValue(new Error('disco cheio'));
    expect(await guardarFoto(CACHE)).toBe(CACHE);
  });

  it('sem foto, devolve null', async () => {
    expect(await guardarFoto(null)).toBeNull();
  });
});

describe('apagarFoto', () => {
  it('só apaga fotos da pasta permanente', async () => {
    expect(await apagarFoto(CACHE)).toBe(false);
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

    expect(await apagarFoto(`${PASTA}foto-1.jpg`)).toBe(true);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(`${PASTA}foto-1.jpg`, { idempotent: true });
  });
});
