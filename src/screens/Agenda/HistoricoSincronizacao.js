import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { cores, espaco } from '../../theme';
import {
  backgroundLigado,
  definirBackgroundLigado,
  obterHistorico,
  sincronizarAgenda,
} from '../../services/sincronizacao';
import {
  BACKGROUND_REAL,
  desregistrarTarefa,
  estadoDaTarefa,
  executarTarefa,
  registrarTarefa,
} from '../../services/tarefaBackground';
import useSincronizacao from '../../hooks/useSincronizacao';
import { formatarDataHora } from '../../utils/dataHora';

// Última sincronização e o que ela encontrou (Aula 11).
//
// Honestidade com o usuário: a tela NUNCA diz "atualizado a cada 15
// minutos" — o sistema não garante isso. Ela diz há quanto tempo foi a
// última atualização e deixa o usuário puxar para atualizar.

function haQuantoTempo(iso) {
  const minutos = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} dia(s)`;
}

function resumo(entrada) {
  if (!entrada.sucesso) return `Falhou: ${entrada.erro}`;
  const partes = [`${entrada.consultas} consultas`, `${entrada.conflitos} conflitos`];
  if (entrada.lembretes) {
    partes.push(`lembretes: ${entrada.lembretes.cancelados} cancelados, ${entrada.lembretes.criados} criados`);
  }
  return partes.join(' · ');
}

export default function HistoricoSincronizacao() {
  const [historico, setHistorico] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [ligado, setLigado] = useState(true);
  const [estado, setEstado] = useState(null);
  const [, setRelogio] = useState(0);

  const carregar = useCallback(async () => {
    setHistorico(await obterHistorico());
    setLigado(await backgroundLigado());
    setEstado(await estadoDaTarefa());
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // A porta "voltou ao app" também atualiza esta tela quando ela está aberta.
  useSincronizacao(carregar);

  // "há N min" precisa andar sozinho enquanto a tela está aberta.
  useEffect(() => {
    const id = setInterval(() => setRelogio((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Puxar para atualizar = pedido explícito: ignora o intervalo mínimo.
  async function sincronizarAgora() {
    setSincronizando(true);
    await sincronizarAgenda('manual');
    await carregar();
    setSincronizando(false);
  }

  // Gatilho manual para testar a tarefa sem esperar a janela do sistema.
  async function rodarTarefaDeTeste() {
    setSincronizando(true);
    await executarTarefa('background (teste manual)');
    await carregar();
    setSincronizando(false);
  }

  async function alternarBackground(valor) {
    setLigado(valor);
    await definirBackgroundLigado(valor);
    if (valor) await registrarTarefa();
    else await desregistrarTarefa();
    setEstado(await estadoDaTarefa());
  }

  const ultima = historico[0];

  return (
    <SafeAreaView style={styles.tela}>
      <FlatList
        data={historico}
        keyExtractor={(item, i) => `${item.quando}-${i}`}
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl refreshing={sincronizando} onRefresh={sincronizarAgora} colors={[cores.primaria]} />
        }
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <View style={styles.cartao}>
              <Text style={styles.rotulo}>Última atualização</Text>
              {ultima ? (
                <>
                  <Text style={styles.destaque}>{haQuantoTempo(ultima.quando)}</Text>
                  <Text style={styles.texto}>
                    {formatarDataHora(ultima.quando)} · {ultima.origem}
                  </Text>
                  <Text style={[styles.texto, !ultima.sucesso && styles.erro]}>{resumo(ultima)}</Text>
                </>
              ) : (
                <Text style={styles.texto}>Ainda não sincronizou neste aparelho.</Text>
              )}
              <TouchableOpacity style={styles.botao} onPress={sincronizarAgora} disabled={sincronizando}>
                <Text style={styles.botaoTexto}>{sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}</Text>
              </TouchableOpacity>
              <Text style={styles.dica}>Ou puxe a tela para baixo.</Text>
            </View>

            <View style={styles.cartao}>
              <View style={styles.linha}>
                <Text style={[styles.rotulo, styles.flex]}>Sincronizar em segundo plano</Text>
                <Switch
                  value={ligado}
                  onValueChange={alternarBackground}
                  trackColor={{ true: cores.primaria }}
                />
              </View>
              <Text style={styles.texto}>
                Quando o sistema permitir, o app confere a agenda e os lembretes sozinho. Não há horário
                garantido: o sistema decide olhando bateria, rede e o quanto você usa o app.
              </Text>
              {!!estado && (
                <Text style={styles.texto}>
                  {estado.disponivel
                    ? `Tarefa ${estado.registrada ? 'registrada' : 'não registrada'} no sistema.`
                    : estado.motivo}
                </Text>
              )}
              {__DEV__ && (
                <TouchableOpacity onPress={rodarTarefaDeTeste} disabled={sincronizando}>
                  <Text style={styles.link}>
                    Teste: rodar o código da tarefa agora{BACKGROUND_REAL ? '' : ' (simula a porta background)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.tituloLista}>Histórico (últimas {historico.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitulo}>
              {formatarDataHora(item.quando)} · {item.origem} · {item.duracaoMs} ms
            </Text>
            <Text style={[styles.texto, !item.sucesso && styles.erro]}>{resumo(item)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.lg * 2 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.sm },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    gap: espaco.xs,
  },
  linha: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.textoFraco },
  destaque: { fontSize: 22, fontWeight: '700', color: cores.primaria },
  texto: { fontSize: 13, color: cores.textoFraco },
  erro: { color: cores.erro },
  dica: { fontSize: 12, color: cores.textoFraco, textAlign: 'center' },
  link: { color: cores.primaria, fontWeight: '600', textDecorationLine: 'underline', marginTop: espaco.xs },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
    marginTop: espaco.sm,
  },
  botaoTexto: { color: '#FFFFFF', fontWeight: '600' },
  tituloLista: { fontSize: 14, fontWeight: '700', color: cores.texto },
  item: {
    backgroundColor: cores.superficie,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.sm + 2,
    marginBottom: espaco.sm,
  },
  itemTitulo: { fontSize: 13, fontWeight: '600', color: cores.texto },
});
