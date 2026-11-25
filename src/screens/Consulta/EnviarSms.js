import React, { useEffect, useState } from 'react';
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
import { get, SessaoExpirada } from '../../services/api';
import {
  avaliarTexto,
  montarTextoSms,
  normalizarNumero,
  pedirEnvioPeloAparelho,
  pedirEnvioPeloServidor,
  smsDisponivelNoAparelho,
} from '../../services/sms';

// Tela de envio de SMS, usada pela recepção (Aula 13, Passo 3).
//
// Params: { consulta, tipo } — tipo é 'confirmacao', 'lembrete' ou
// 'cancelamento'. Os dois caminhos ficam lado a lado, cada um com a
// explicação de quem envia e quem paga.

const TITULOS = {
  confirmacao: 'Confirmação da consulta',
  lembrete: 'Lembrete da consulta',
  cancelamento: 'Cancelamento da consulta',
};

const formatarReais = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function EnviarSms({ route, navigation }) {
  const { consulta, tipo = 'confirmacao' } = route.params ?? {};

  const [paciente, setPaciente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [disponivel, setDisponivel] = useState(false);
  const [texto, setTexto] = useState(() => (consulta ? montarTextoSms(tipo, consulta.dataHora) : ''));
  const [enviando, setEnviando] = useState(null); // 'aparelho' | 'servidor' | null
  const [retorno, setRetorno] = useState(null);

  // O texto do servidor é sempre o modelo padrão, montado lá.
  const textoPadrao = consulta ? montarTextoSms(tipo, consulta.dataHora) : '';
  const avaliacao = avaliarTexto(texto);
  const avaliacaoPadrao = avaliarTexto(textoPadrao);
  const numero = normalizarNumero(paciente?.telefone);

  useEffect(() => {
    navigation.setOptions({ title: 'Enviar SMS' });
    let ativo = true;
    (async () => {
      try {
        const [p, pode] = await Promise.all([
          get(`/pacientes/${consulta.pacienteId}`),
          smsDisponivelNoAparelho(),
        ]);
        if (!ativo) return;
        setPaciente(p);
        setDisponivel(pode);
      } catch (e) {
        if (e instanceof SessaoExpirada) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        if (ativo) setRetorno({ tipo: 'erro', texto: `Não foi possível carregar o paciente. ${e.message}` });
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [consulta, navigation]);

  // Item 13: honestidade. sendSMSAsync só abre o app de mensagens; o
  // resultado no Android é quase sempre 'unknown'. Não dizemos "enviado".
  async function enviarPeloAparelho() {
    setEnviando('aparelho');
    setRetorno(null);
    try {
      const { disponivel: pode } = await pedirEnvioPeloAparelho(numero, texto);
      if (!pode) {
        setRetorno({ tipo: 'aviso', texto: 'Este aparelho não envia SMS (sem chip, tablet ou emulador).' });
      } else {
        setRetorno({
          tipo: 'aviso',
          texto: 'Confira no seu app de mensagens se o SMS foi enviado. O app não consegue saber.',
        });
      }
    } finally {
      setEnviando(null);
    }
  }

  // Item 12: gastar dinheiro da clínica merece um passo a mais.
  function confirmarEnvioPeloServidor() {
    Alert.alert(
      'Enviar pela clínica?',
      `Serão cobrados ${avaliacaoPadrao.segmentos} SMS (${formatarReais(avaliacaoPadrao.custo)}) na conta da clínica.`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Enviar', onPress: enviarPeloServidor },
      ]
    );
  }

  async function enviarPeloServidor() {
    setEnviando('servidor');
    setRetorno(null);
    try {
      const resposta = await pedirEnvioPeloServidor(consulta.id, tipo, {
        pacienteId: consulta.pacienteId,
        dataHora: consulta.dataHora,
      });
      // Item 14: 202 é "enfileirado", não "entregue".
      setRetorno({
        tipo: 'ok',
        texto: `SMS enfileirado no gateway (${resposta.segmentos} segmento(s), ${formatarReais(resposta.custo)}). A confirmação de entrega chega depois.`,
      });
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setRetorno({ tipo: 'erro', texto: `Não foi possível pedir o envio. ${e.message}` });
    } finally {
      setEnviando(null);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]} testID="tela-enviar-sms">
        <ActivityIndicator size="large" color={cores.primaria} testID="carregando" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} testID="tela-enviar-sms">
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>{TITULOS[tipo]}</Text>
        <Text style={styles.texto}>
          Para: {paciente?.nome ?? 'paciente'} · {numero ?? 'sem celular válido no cadastro'}
        </Text>

        {/* Item 15: quem digita precisa ler isto. */}
        <View style={styles.alerta}>
          <Text style={styles.alertaTexto}>
            Não escreva dado clínico (médico, especialidade, exame, motivo). O SMS aparece na tela
            bloqueada do paciente, à vista de quem estiver perto. Evite acento: ele derruba o limite de
            160 para 70 caracteres.
          </Text>
        </View>

        <Text style={styles.rotulo}>Texto</Text>
        <TextInput
          testID="campo-texto-sms"
          style={styles.campo}
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        {/* Item 11: contador com destaque acima de um segmento. */}
        <Text
          testID="contador-sms"
          style={[styles.contador, avaliacao.segmentos > 1 && styles.contadorDestaque]}
        >
          {avaliacao.caracteres} caracteres · {avaliacao.segmentos} segmento(s) · {avaliacao.codificacao}
        </Text>
        {!!avaliacao.alerta && <Text style={styles.aviso}>{avaliacao.alerta}</Text>}

        {/* Item 10: dois botões, cada um com a diferença explicada. */}
        <View style={styles.opcao}>
          <TouchableOpacity
            testID="botao-sms-aparelho"
            style={[styles.botao, styles.botaoSecundario, (!disponivel || !numero || !!enviando) && styles.desabilitado]}
            onPress={enviarPeloAparelho}
            disabled={!disponivel || !numero || !!enviando}
          >
            {enviando === 'aparelho' ? (
              <ActivityIndicator color={cores.primaria} />
            ) : (
              <Text style={styles.botaoSecundarioTexto}>Abrir app de mensagens</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.explicacao}>
            {disponivel
              ? 'Sai do número deste celular, com o texto acima. Quem paga é o plano deste aparelho. O paciente responde para este número, e o app não fica sabendo se você enviou.'
              : 'Indisponível: este aparelho não envia SMS (sem chip, tablet ou emulador).'}
          </Text>
        </View>

        <View style={styles.opcao}>
          <TouchableOpacity
            testID="botao-sms-servidor"
            style={[styles.botao, (!numero || !!enviando) && styles.desabilitado]}
            onPress={confirmarEnvioPeloServidor}
            disabled={!numero || !!enviando}
          >
            {enviando === 'servidor' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>Enviar pela clínica</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.explicacao}>
            Sai do número da clínica com o texto padrão ({avaliacaoPadrao.segmentos} segmento,{' '}
            {formatarReais(avaliacaoPadrao.custo)}). Quem paga é a clínica. O gateway confirma a entrega
            depois.
          </Text>
        </View>

        {!!retorno && (
          <Text
            testID={retorno.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-retorno'}
            style={retorno.tipo === 'erro' ? styles.erro : retorno.tipo === 'ok' ? styles.ok : styles.aviso}
          >
            {retorno.texto}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.md, gap: espaco.sm, paddingBottom: espaco.lg * 2 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 14, color: cores.textoFraco },
  alerta: { backgroundColor: cores.avisoClaro, borderRadius: 10, padding: espaco.sm + 2 },
  alertaTexto: { color: cores.aviso, fontSize: 13 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.textoFraco, marginTop: espaco.sm },
  campo: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    padding: espaco.md,
    fontSize: 15,
    color: cores.texto,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  contador: { fontSize: 12, color: cores.textoFraco, textAlign: 'right' },
  contadorDestaque: { color: cores.erro, fontWeight: '700' },
  opcao: { marginTop: espaco.md, gap: espaco.xs },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
  },
  botaoTexto: { color: '#FFFFFF', fontWeight: '600' },
  botaoSecundario: { backgroundColor: cores.primariaClara },
  botaoSecundarioTexto: { color: cores.primaria, fontWeight: '600' },
  desabilitado: { opacity: 0.5 },
  explicacao: { fontSize: 12, color: cores.textoFraco },
  aviso: { fontSize: 13, color: cores.aviso },
  erro: { fontSize: 13, color: cores.erro },
  ok: { fontSize: 13, color: cores.sucesso, fontWeight: '600' },
});
