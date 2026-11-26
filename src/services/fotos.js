// src/services/fotos.js
// Foto de perfil em armazenamento PERMANENTE (dívida técnica da Aula 6).
//
// O expo-image-picker devolve uma URI no CACHE do app. O sistema pode limpar
// o cache quando falta espaço, e a foto sumia do cadastro. Aqui a foto é
// copiada para o documentDirectory, pasta do app que o sistema não limpa
// (só some se o app for desinstalado ou os dados forem apagados).
//
// Continua pendente: a foto ainda vive só NESTE aparelho. Ver em outro
// celular exige upload para o servidor (PENDENCIAS.md).

import * as FileSystem from 'expo-file-system';

const NOME_PASTA = 'fotos-perfil/';

function pastaFotos() {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${NOME_PASTA}` : null;
}

export function estaNaPastaPermanente(uri) {
  const pasta = pastaFotos();
  return Boolean(pasta && typeof uri === 'string' && uri.startsWith(pasta));
}

function extensao(uri) {
  const achada = /\.([a-z0-9]{2,5})(?:\?.*)?$/i.exec(String(uri));
  return achada ? achada[1].toLowerCase() : 'jpg';
}

// Copia a foto do cache para a pasta permanente e devolve a nova URI.
// Se não der (web, disco cheio...), devolve a URI original: a foto aparece
// agora, só não fica garantida. Melhor isso do que perder a foto tirada.
export async function guardarFoto(uriTemporaria) {
  if (!uriTemporaria) return null;
  const pasta = pastaFotos();
  if (!pasta) return uriTemporaria; // web não tem documentDirectory
  if (estaNaPastaPermanente(uriTemporaria)) return uriTemporaria;

  try {
    const info = await FileSystem.getInfoAsync(pasta);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(pasta, { intermediates: true });
    }
    const sufixo = Math.random().toString(36).slice(2, 8);
    const destino = `${pasta}foto-${Date.now()}-${sufixo}.${extensao(uriTemporaria)}`;
    await FileSystem.copyAsync({ from: uriTemporaria, to: destino });
    return destino;
  } catch (e) {
    console.log('Não foi possível guardar a foto na pasta permanente.');
    return uriTemporaria;
  }
}

// Apaga uma foto que NÓS guardamos. URIs de fora da pasta (cache antigo,
// galeria) nunca são apagadas por aqui.
export async function apagarFoto(uri) {
  if (!estaNaPastaPermanente(uri)) return false;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (e) {
    console.log('Não foi possível apagar a foto antiga.');
    return false;
  }
}
