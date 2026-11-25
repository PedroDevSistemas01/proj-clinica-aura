import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { cores, espaco } from '../../theme';
import { get, remover, SessaoExpirada } from '../../services/api';
import {
  cancelarLembrete,
  listarLembretesPendentes,
  sincronizarLembretes,
} from '../../services/lembretes';
import { formatarDataHora } from '../../utils/dataHora';

// Lista de consultas agendadas (Aula 8).
// A tela não conhece a biblioteca de notificações: o lembrete é do
// src/services/lembretes.js. Aqui só acoplamos o lembrete ao ciclo de vida
// da consulta — agendar e remarcar ficam em AgendarConsulta.js, cancelar
// fica aqui.

export default function Consultas({ navigation }) {
  const [consultas, setConsultas] = useState([]);
  const [nomes, setNomes] = useState({ pacientes: {}, medicos: {} });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const tratarErro = useCallback(
    (e, mensagem) => {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErro(`${mensagem} ${e.message} Confira se a API está no ar.`);
    },
    [navigation]
  );

  const buscarConsultas = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      // Buscas independentes: podem ir juntas (é espera, não trabalho).
      const [listaConsultas, pacientes, medicos] = await Promise.all([
        get('/consultas'),
        get('/pacientes'),
        get('/medicos'),
      ]);

      const ordenadas = [...listaConsultas].sort(
        (a, b) => new Date(a.dataHora) - new Date(b.dataHora)
      );
      setConsultas(ordenadas);
      setNomes({
        pacientes: Object.fromEntries(pacientes.map((p) => [String(p.id), p.nome])),
        medicos: Object.fromEntries(medicos.map((m) => [String(m.id), m.nome])),
      });

      // Passo 7 (extensão): o aparelho não sabe quando a recepção cancela
      // uma consulta. Ao abrir a lista, alinhamos os lembretes com a agenda.
      sincronizarLembretes(ordenadas).catch(() => {
        console.log('Não foi possível sincronizar os lembretes agora.');
      });
    } catch (e) {
      tratarErro(e, 'Não foi possível carregar as consultas.');
    } finally {
      setCarregando(false);
    }
  }, [tratarErro]);

  useFocusEffect(
    useCallback(() => {
      buscarConsultas();
    }, [buscarConsultas])
  );

  function confirmarCancelamento(consulta) {
    Alert.alert(
      'Cancelar consulta',
      `Cancelar a consulta de ${formatarDataHora(consulta.dataHora)}? O lembrete também será cancelado.`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Cancelar consulta', style: 'destructive', onPress: () => cancelarConsulta(consulta) },
      ]
    );
  }

  // Passo 3, item 15: DELETE na API primeiro; só depois cancela o lembrete.
  // É o passo que todo mundo esquece.
  async function cancelarConsulta(consulta) {
    try {
      await remover(`/consultas/${consulta.id}`);
      await cancelarLembrete(consulta.id);
      await buscarConsultas();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Erro ao cancelar', e.message);
    }
  }

  // Passo 3, item 17: a lista de agendadas é a prova de que o cancelamento
  // funcionou. Depois de cancelar tudo, ela tem que vir vazia.
  async function mostrarLembretesPendentes() {
    const pendentes = await listarLembretesPendentes();
    const linhas = pendentes.map((p) => `• Consulta ${p.consultaId ?? '?'}: ${p.texto}`);
    Alert.alert(
      `Lembretes pendentes: ${pendentes.length}`,
      linhas.length ? linhas.join('\n') : 'Nenhum lembrete agendado neste aparelho.'
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator size="large" color={cores.primaria} />
        <Text style={styles.textoFraco}>Carregando consultas...</Text>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <View style={styles.caixaErro}>
          <Text style={styles.tituloErro}>Falha na comunicação</Text>
          <Text style={styles.mensagemErro}>{erro}</Text>
          <TouchableOpacity style={styles.botaoPrimario} onPress={buscarConsultas}>
            <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.barraTopo}>
        <TouchableOpacity onPress={mostrarLembretesPendentes}>
          <Text style={styles.link}>Lembretes pendentes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => navigation.navigate('AgendarConsulta')}
        >
          <Text style={styles.botaoNovoTexto}>+ Agendar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={consultas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.conteudoLista}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            Nenhuma consulta agendada. Toque em "+ Agendar" para marcar a primeira.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cartao}
            onPress={() => navigation.navigate('DetalheConsulta', { consultaId: String(item.id) })}
          >
            <Text style={styles.quando}>{formatarDataHora(item.dataHora)}</Text>
            <Text style={styles.detalhe}>
              Paciente: {nomes.pacientes[String(item.pacienteId)] ?? `#${item.pacienteId}`}
            </Text>
            <Text style={styles.detalhe}>
              Médico(a): {nomes.medicos[String(item.medicoId)] ?? `#${item.medicoId}`}
            </Text>

            <View style={styles.acoes}>
              <TouchableOpacity
                style={styles.botaoSecundario}
                onPress={() => navigation.navigate('AgendarConsulta', { consulta: item })}
              >
                <Text style={styles.botaoSecundarioTexto}>Remarcar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoPerigo} onPress={() => confirmarCancelamento(item)}>
                <Text style={styles.botaoPerigoTexto}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  centralizado: { alignItems: 'center', justifyContent: 'center', padding: espaco.lg },
  textoFraco: { marginTop: espaco.md, color: cores.textoFraco },
  caixaErro: { backgroundColor: cores.erroClaro, borderRadius: 12, padding: espaco.md, width: '100%' },
  tituloErro: { fontSize: 16, fontWeight: '700', color: cores.erro, marginBottom: espaco.sm },
  mensagemErro: { fontSize: 14, color: cores.texto, marginBottom: espaco.md },
  barraTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  link: { color: cores.primaria, fontWeight: '600', textDecorationLine: 'underline' },
  botaoNovo: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 4,
  },
  botaoNovoTexto: { color: '#FFFFFF', fontWeight: '600' },
  conteudoLista: { paddingHorizontal: espaco.md, paddingBottom: espaco.lg },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    marginBottom: espaco.sm,
  },
  quando: { fontSize: 16, fontWeight: '600', color: cores.texto },
  detalhe: { fontSize: 13, color: cores.textoFraco, marginTop: 2 },
  acoes: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md },
  botaoPrimario: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
  },
  botaoPrimarioTexto: { color: '#FFFFFF', fontWeight: '600' },
  botaoSecundario: {
    flex: 1,
    backgroundColor: cores.primariaClara,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
  },
  botaoSecundarioTexto: { color: cores.primaria, fontWeight: '600' },
  botaoPerigo: {
    flex: 1,
    backgroundColor: cores.erroClaro,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
  },
  botaoPerigoTexto: { color: cores.erro, fontWeight: '600' },
  listaVazia: { textAlign: 'center', color: cores.textoFraco, marginTop: espaco.lg },
});
