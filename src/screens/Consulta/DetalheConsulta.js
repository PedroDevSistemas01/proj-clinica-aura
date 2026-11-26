import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { cores, espaco } from '../../theme';
import { get, SessaoExpirada } from '../../services/api';
import { cancelarLembrete } from '../../services/lembretes';
import { formatarDataHora } from '../../utils/dataHora';

// Tela da consulta (Aula 8, Passo 4): é aqui que o toque no lembrete cai.
// Recebe só o consultaId (o que viaja no content.data) e busca o resto na
// API — a notificação não carrega dado do paciente.

export default function DetalheConsulta({ route, navigation }) {
  const consultaId = route.params?.consultaId;

  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [medico, setMedico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscar = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const dados = await get(`/consultas/${consultaId}`);
      const [p, m] = await Promise.all([
        get(`/pacientes/${dados.pacienteId}`).catch(() => null),
        get(`/medicos/${dados.medicoId}`).catch(() => null),
      ]);
      setConsulta(dados);
      setPaciente(p);
      setMedico(m);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      // 404: a consulta foi cancelada depois que o lembrete foi agendado.
      // O lembrete local dela não tem mais razão de existir (Aula 9).
      const naoExisteMais = e.message.includes('404');
      if (naoExisteMais) cancelarLembrete(consultaId).catch(() => {});
      setErro(
        naoExisteMais
          ? 'Esta consulta não existe mais. Ela pode ter sido cancelada pela clínica.'
          : `Não foi possível carregar a consulta. ${e.message}`
      );
    } finally {
      setCarregando(false);
    }
  }, [consultaId, navigation]);

  useFocusEffect(
    useCallback(() => {
      buscar();
    }, [buscar])
  );

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <View style={styles.caixaErro}>
          <Text style={styles.mensagemErro}>{erro}</Text>
          <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('Consultas')}>
            <Text style={styles.botaoTexto}>Ver minhas consultas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} testID="tela-detalhe-consulta">
      <View style={styles.cartao} testID="resumo-consulta">
        <Text style={styles.rotulo}>Quando</Text>
        <Text style={styles.valorGrande}>{formatarDataHora(consulta.dataHora)}</Text>
        <Text style={styles.detalhe}>Duração: {consulta.duracaoMinutos} min</Text>

        <Text style={styles.rotulo}>Paciente</Text>
        <Text style={styles.valor}>{paciente?.nome ?? `#${consulta.pacienteId}`}</Text>

        <Text style={styles.rotulo}>Médico(a)</Text>
        <Text style={styles.valor}>{medico?.nome ?? `#${consulta.medicoId}`}</Text>
        {!!medico?.especialidade && <Text style={styles.detalhe}>{medico.especialidade}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.botao, styles.margem]}
        onPress={() => navigation.navigate('AgendarConsulta', { consulta })}
      >
        <Text style={styles.botaoTexto}>Remarcar</Text>
      </TouchableOpacity>

      {/* Aula 13: confirmação por SMS (a recepção escolhe o caminho). */}
      <TouchableOpacity
        style={[styles.botao, styles.margem]}
        onPress={() => navigation.navigate('EnviarSms', { consulta, tipo: 'confirmacao' })}
      >
        <Text style={styles.botaoTexto}>Enviar SMS de confirmação</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: espaco.md },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
  },
  rotulo: { fontSize: 12, fontWeight: '600', color: cores.textoFraco, marginTop: espaco.md },
  valorGrande: { fontSize: 22, fontWeight: '700', color: cores.primaria, marginTop: espaco.xs },
  valor: { fontSize: 16, fontWeight: '600', color: cores.texto, marginTop: espaco.xs },
  detalhe: { fontSize: 13, color: cores.textoFraco, marginTop: 2 },
  caixaErro: { backgroundColor: cores.erroClaro, borderRadius: 12, padding: espaco.md, width: '100%' },
  mensagemErro: { fontSize: 14, color: cores.texto, marginBottom: espaco.md },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
  },
  margem: { marginTop: espaco.md },
  botaoTexto: { color: '#FFFFFF', fontWeight: '600' },
});
