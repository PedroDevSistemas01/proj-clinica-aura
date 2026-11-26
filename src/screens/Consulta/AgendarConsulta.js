import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { cores, espaco } from '../../theme';
import { get, post, put, SessaoExpirada } from '../../services/api';
import { agendarLembrete } from '../../services/lembretes';
import { validarAgendamento } from '../../regras';
import { formatarData, formatarDataHora, formatarHora, montarDataHora } from '../../utils/dataHora';

// Agendar e remarcar consulta (Aula 8, Passo 3).
//
// Regra de ouro da aula: grava no servidor PRIMEIRO e só depois agenda o
// lembrete. Agendar antes de confirmar cria lembrete de consulta que talvez
// nem exista (item 12).
//
// Remarcar chama agendarLembrete de novo: como ele já cancela o lembrete
// anterior daquela consulta, o paciente recebe um aviso, não dois (item 14).

const DURACOES = [30, 60];

export default function AgendarConsulta({ route, navigation }) {
  const consulta = route.params?.consulta;
  const remarcando = Boolean(consulta);

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [pacienteId, setPacienteId] = useState(consulta ? String(consulta.pacienteId) : null);
  const [medicoId, setMedicoId] = useState(consulta ? String(consulta.medicoId) : null);
  const [textoData, setTextoData] = useState(consulta ? formatarData(consulta.dataHora) : '');
  const [textoHora, setTextoHora] = useState(consulta ? formatarHora(consulta.dataHora) : '');
  const [duracao, setDuracao] = useState(consulta?.duracaoMinutos ?? 30);
  const [erro, setErro] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: remarcando ? 'Remarcar consulta' : 'Agendar consulta' });
  }, [navigation, remarcando]);

  useEffect(() => {
    let ativo = true;
    Promise.all([get('/pacientes'), get('/medicos')])
      .then(([p, m]) => {
        if (!ativo) return;
        setPacientes(p);
        setMedicos(m);
      })
      .catch((e) => {
        if (e instanceof SessaoExpirada) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        Alert.alert('Falha na comunicação', `${e.message} Confira se a API está no ar.`);
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [navigation]);

  // Atalho de teste (item 16): consulta daqui a 3 minutos. Com
  // LEMBRETE_TESTE_MINUTOS=1 no .env, o aviso chega em 2 min.
  function preencherDaquiATresMinutos() {
    const daqui = new Date(Date.now() + 3 * 60 * 1000);
    setTextoData(formatarData(daqui));
    setTextoHora(formatarHora(daqui));
  }

  // Item 13: mensagem honesta. Se o horário do lembrete já passou, não
  // prometemos um aviso que não vai acontecer.
  function mensagemDoLembrete(resultado) {
    if (resultado.agendado) {
      return `Você receberá um lembrete em ${formatarDataHora(resultado.horario)}.`;
    }
    if (resultado.semPermissao) {
      return 'As notificações estão desativadas para o app, então não haverá lembrete. Você pode ativá-las nos ajustes do aparelho.';
    }
    return 'A consulta está muito próxima: não haverá lembrete antes dela.';
  }

  async function salvar() {
    const dataHora = montarDataHora(textoData, textoHora);
    // Aula 14: regra em src/regras.js. O erro aparece na tela (testável),
    // não só num Alert.
    const problema = validarAgendamento({ pacienteId, medicoId, dataHora });
    setErro(problema);
    if (problema) return;

    const dados = {
      pacienteId: Number(pacienteId),
      medicoId: Number(medicoId),
      dataHora: dataHora.toISOString(),
      duracaoMinutos: duracao,
      status: 'agendada',
    };

    setSalvando(true);
    try {
      // 1) Servidor primeiro.
      const salva = remarcando
        ? await put(`/consultas/${consulta.id}`, { ...consulta, ...dados })
        : await post('/consultas', dados);

      // 2) Só depois o lembrete. Se ele falhar, a consulta continua valendo.
      let resultado;
      try {
        resultado = await agendarLembrete(salva);
      } catch (e) {
        resultado = { agendado: false, falhou: true };
      }

      const titulo = remarcando ? 'Consulta remarcada' : 'Consulta agendada';
      // Resumo do que foi gravado (Aula 14, Passo 5: "confirma e mostra o resumo").
      const nomePaciente = pacientes.find((p) => String(p.id) === pacienteId)?.nome ?? 'Paciente';
      const nomeMedico = medicos.find((m) => String(m.id) === medicoId)?.nome ?? 'médico';
      const resumo = `${nomePaciente} com ${nomeMedico}, ${formatarDataHora(dataHora)} (${duracao} min).`;
      const texto = `${resumo}\n\n${
        resultado.falhou
          ? 'A consulta foi salva, mas não foi possível agendar o lembrete neste aparelho.'
          : mensagemDoLembrete(resultado)
      }`;

      Alert.alert(titulo, texto, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      // Servidor não confirmou: nenhum lembrete foi criado.
      Alert.alert('Não foi possível salvar', `${e.message} Nenhum lembrete foi criado.`);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]} testID="tela-agendar">
        <ActivityIndicator size="large" color={cores.primaria} testID="carregando" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} testID="tela-agendar">
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.rotulo}>Paciente</Text>
        <View style={styles.opcoes}>
          {pacientes.map((p) => (
            <Opcao
              key={p.id}
              testID={`paciente-${p.id}`}
              texto={p.nome}
              selecionada={pacienteId === String(p.id)}
              onPress={() => setPacienteId(String(p.id))}
              desabilitada={remarcando}
            />
          ))}
        </View>

        <Text style={styles.rotulo}>Médico(a)</Text>
        <View style={styles.opcoes}>
          {medicos.map((m) => (
            <Opcao
              key={m.id}
              testID={`medico-${m.id}`}
              texto={`${m.nome} · ${m.especialidade}`}
              selecionada={medicoId === String(m.id)}
              onPress={() => setMedicoId(String(m.id))}
            />
          ))}
        </View>

        <View style={styles.linha}>
          <View style={styles.colunaLarga}>
            <Text style={styles.rotulo}>Data</Text>
            <TextInput
              testID="campo-data"
              style={styles.campo}
              value={textoData}
              onChangeText={setTextoData}
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
          <View style={styles.coluna}>
            <Text style={styles.rotulo}>Hora</Text>
            <TextInput
              testID="campo-hora"
              style={styles.campo}
              value={textoHora}
              onChangeText={setTextoHora}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        <TouchableOpacity onPress={preencherDaquiATresMinutos}>
          <Text style={styles.link}>Teste: preencher com daqui a 3 minutos</Text>
        </TouchableOpacity>

        <Text style={styles.rotulo}>Duração</Text>
        <View style={styles.opcoes}>
          {DURACOES.map((d) => (
            <Opcao
              key={d}
              testID={`duracao-${d}`}
              texto={`${d} min`}
              selecionada={duracao === d}
              onPress={() => setDuracao(d)}
            />
          ))}
        </View>

        {!!erro && (
          <Text style={styles.erro} testID="mensagem-erro">
            {erro}
          </Text>
        )}

        <TouchableOpacity
          testID="botao-confirmar"
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoTexto}>{remarcando ? 'Salvar nova data' : 'Agendar'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Opcao({ texto, selecionada, onPress, desabilitada, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityState={{ selected: !!selecionada }}
      style={[styles.opcao, selecionada && styles.opcaoSelecionada, desabilitada && !selecionada && styles.opcaoApagada]}
      onPress={onPress}
      disabled={desabilitada}
    >
      <Text style={[styles.opcaoTexto, selecionada && styles.opcaoTextoSelecionada]}>{texto}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.md, paddingBottom: espaco.lg * 2 },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textoFraco,
    marginTop: espaco.md,
    marginBottom: espaco.xs,
  },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 20,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  opcaoSelecionada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  opcaoApagada: { opacity: 0.4 },
  opcaoTexto: { color: cores.texto, fontSize: 14 },
  opcaoTextoSelecionada: { color: '#FFFFFF', fontWeight: '600' },
  linha: { flexDirection: 'row', gap: espaco.sm },
  colunaLarga: { flex: 2 },
  coluna: { flex: 1 },
  campo: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 4,
    fontSize: 15,
    color: cores.texto,
  },
  link: {
    color: cores.primaria,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: espaco.sm,
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.md,
    alignItems: 'center',
    marginTop: espaco.lg,
  },
  botaoDesabilitado: { opacity: 0.6 },
  erro: { color: cores.erro, marginTop: espaco.md },
  botaoTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
