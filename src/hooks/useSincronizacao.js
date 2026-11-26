// src/hooks/useSincronizacao.js
// Sincronizar ao voltar para o app (Aula 11, "alternativa honesta").
//
// Não é background: só trabalha com o app visível. Mas cobre o caso mais
// comum de todos (o usuário abre o app e quer dado atualizado), roda no
// Expo Go, funciona nas duas plataformas e não depende do humor do sistema.

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { INTERVALO_MINIMO_MINUTOS, precisaSincronizar, sincronizarAgenda } from '../services/sincronizacao';

export default function useSincronizacao(aoSincronizar) {
  const estadoAnterior = useRef(AppState.currentState);
  const emAndamento = useRef(false);
  const callback = useRef(aoSincronizar);
  callback.current = aoSincronizar;

  useEffect(() => {
    let ativo = true;

    async function talvezSincronizar(origem) {
      if (emAndamento.current) return;
      if (!(await precisaSincronizar(INTERVALO_MINIMO_MINUTOS))) return;

      emAndamento.current = true;
      try {
        const entrada = await sincronizarAgenda(origem);
        if (ativo) callback.current?.(entrada);
      } finally {
        emAndamento.current = false;
      }
    }

    // Correção do problema P2 da Aula 13: abrir o app do zero também conta
    // como "quero dado atualizado". Sem isto, só a VOLTA do segundo plano
    // sincronizava. O intervalo mínimo continua valendo.
    talvezSincronizar('abriu o app');

    const assinatura = AppState.addEventListener('change', (proximo) => {
      // Sem comparar ANTES e DEPOIS, o evento dispara em situações que não
      // interessam (ex.: active -> inactive ao puxar a central de avisos).
      const voltou = /inactive|background/.test(estadoAnterior.current) && proximo === 'active';
      estadoAnterior.current = proximo;
      if (voltou) talvezSincronizar('voltou ao app');
    });
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);
}
