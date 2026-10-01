import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { post, SessaoExpirada } from '../../services/api';
import { criarServicoBle, MODO_SIMULADO } from '../../services/bluetooth';
import { frequenciaPlausivel, mediaDasLeituras } from '../../services/frequenciaCardiaca';
import { cores, espaco } from '../../theme';

// Tela de sinais vitais da pré-consulta (Aula 7, Passo 3).
//
// Regra de ouro: esta tela só conhece o service de src/services/bluetooth.js.
// Ela não sabe qual biblioteca está por trás, nem como o valor viaja no ar.
// É por isso que roda igual no modo simulado (Expo Go) e no real.

const ETAPA = {
  PROCURANDO: 'procurando',
  CONECTANDO: 'conectando',
  CONECTADO: 'conectado',
  MANUAL: 'manual',
};

// Sem leitura nova por este tempo, o valor na tela deixa de ser "atual".
const LIMITE_SEM_LEITURA_MS = 5000;
// Abaixo disso a média ainda não diz muito.
const MINIMO_LEITURAS = 3;

function formatarHora(data) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SinaisVitais({ route, navigation }) {
  const paciente = route.params?.paciente;

  // O service vive num useRef: uma instância por tela, criada uma vez.
  const servico = useRef(null);

  const [etapa, setEtapa] = useState(ETAPA.PROCURANDO);
  const [buscando, setBuscando] = useState(false);
  const [aparelhos, setAparelhos] = useState([]);
  const [aparelhoAtual, setAparelhoAtual] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [agora, setAgora] = useState(Date.now());
  const [falha, setFalha] = useState(null); // { mensagem, permissao? }
  const [importando, setImportando] = useState(false);
  const [valorManual, setValorManual] = useState('');

  // Cria o service ao entrar e DESCONECTA ao sair: sair da tela libera o
  // aparelho (item 13).
  useEffect(() => {
    servico.current = criarServicoBle();
    procurar();
    return () => {
      servico.current?.desconectar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Relógio da tela: percebe quando as leituras param de chegar.
  useEffect(() => {
    if (etapa !== ETAPA.CONECTADO) return undefined;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, [etapa]);

  async function procurar() {
    setFalha(null);
    setAparelhos([]);
    setBuscando(true);
    try {
      await servico.current.procurar((encontrado) => {
        // O mesmo aparelho anuncia várias vezes: a lista não repete.
        setAparelhos((lista) =>
          lista.some((a) => a.id === encontrado.id) ? lista : [...lista, encontrado]
        );
      });
    } catch (e) {
      setFalha({ mensagem: e.message, permissao: e.tipo === 'permissao' });
    } finally {
      setBuscando(false);
    }
  }

  async function conectar(aparelho, { manterLeituras = false } = {}) {
    setFalha(null);
    setAparelhoAtual(aparelho);
    setEtapa(ETAPA.CONECTANDO);
    try {
      await servico.current.conectar(aparelho.id);
      if (!manterLeituras) setLeituras([]);
      setAgora(Date.now());
      setEtapa(ETAPA.CONECTADO);
      servico.current.monitorarFrequencia(
        (bpm) => {
          if (!frequenciaPlausivel(bpm)) return;
          setLeituras((anteriores) => [...anteriores, { bpm, em: new Date() }]);
        },
        (erro) => setFalha({ mensagem: erro.message })
      );
    } catch (e) {
      // Mensagem útil, que diz o que fazer, e não só "erro".
      setFalha({ mensagem: e.message || 'Não foi possível conectar ao aparelho.' });
      setEtapa(ETAPA.PROCURANDO);
    }
  }

  // Conexão caiu: encerra a anterior (assinatura incluída) antes de conectar
  // de novo, e mantém as leituras que já tinham chegado.
  async function reconectar() {
    await servico.current.desconectar();
    conectar(aparelhoAtual, { manterLeituras: true });
  }

  async function trocarDeAparelho() {
    await servico.current.desconectar();
    setAparelhoAtual(null);
    setLeituras([]);
    setEtapa(ETAPA.PROCURANDO);
    procurar();
  }

  async function digitarManualmente() {
    // Se o Bluetooth falhar, a consulta não para.
    await servico.current?.desconectar();
    setFalha(null);
    setEtapa(ETAPA.MANUAL);
  }

  // Enquanto o valor está só na memória da tela, ele não é registro médico.
  // Só vira prontuário quando a API autenticada confirma a gravação.
  async function gravarNoProntuario(registro) {
    setImportando(true);
    try {
      await post('/sinaisVitais', {
        pacienteId: paciente?.id ?? null,
        tipo: 'frequenciaCardiaca',
        unidade: 'bpm',
        registradoEm: new Date().toISOString(),
        ...registro,
      });
      await servico.current?.desconectar();
      Alert.alert('Importado', 'Sinais vitais gravados no prontuário.');
      navigation.goBack();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert(
        'Não foi gravado',
        `O prontuário não confirmou a gravação (${e.message}). As leituras continuam na tela: tente de novo.`
      );
    } finally {
      setImportando(false);
    }
  }

  function importarMedia() {
    const media = mediaDasLeituras(leituras);
    gravarNoProntuario({
      valor: media,
      quantidadeLeituras: leituras.length,
      primeiraLeituraEm: leituras[0].em.toISOString(),
      ultimaLeituraEm: leituras[leituras.length - 1].em.toISOString(),
      origem: MODO_SIMULADO ? 'aparelho-simulado' : 'aparelho',
      aparelho: aparelhoAtual?.nome ?? null,
    });
  }

  function importarManual() {
    const bpm = Number(valorManual);
    if (!frequenciaPlausivel(bpm)) {
      Alert.alert('Valor inválido', 'Informe a frequência cardíaca entre 30 e 220 bpm.');
      return;
    }
    const em = new Date().toISOString();
    gravarNoProntuario({
      valor: bpm,
      quantidadeLeituras: 1,
      primeiraLeituraEm: em,
      ultimaLeituraEm: em,
      origem: 'manual',
      aparelho: null,
    });
  }

  // ---------------------------------------------------------------------------

  const ultima = leituras[leituras.length - 1];
  const referencia = ultima ? ultima.em.getTime() : null;
  const segundosSemLeitura = referencia ? Math.floor((agora - referencia) / 1000) : 0;
  const sinalPerdido =
    etapa === ETAPA.CONECTADO &&
    (falha !== null || (referencia !== null && agora - referencia > LIMITE_SEM_LEITURA_MS));
  const media = mediaDasLeituras(leituras);

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView
        style={styles.tela}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.titulo}>Frequência cardíaca</Text>
          {!!paciente && <Text style={styles.subtitulo}>Paciente: {paciente.nome}</Text>}
          {MODO_SIMULADO && etapa !== ETAPA.MANUAL && (
            <Text style={styles.selo}>Modo simulado: aparelhos e leituras de demonstração</Text>
          )}

          {etapa === ETAPA.PROCURANDO && renderizarBusca()}
          {etapa === ETAPA.CONECTANDO && (
            <View style={styles.cartao}>
              <ActivityIndicator size="large" color={cores.primaria} />
              <Text style={styles.centro}>Conectando a {aparelhoAtual?.nome}...</Text>
            </View>
          )}
          {etapa === ETAPA.CONECTADO && renderizarConectado()}
          {etapa === ETAPA.MANUAL && renderizarManual()}

          {/* Sempre visível: Bluetooth é atalho, a consulta não depende dele. */}
          {etapa !== ETAPA.MANUAL && (
            <TouchableOpacity style={styles.link} onPress={digitarManualmente}>
              <Text style={styles.linkTexto}>Digitar os valores manualmente</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderizarBusca() {
    return (
      <View style={styles.cartao}>
        <View style={styles.linha}>
          <Text style={styles.rotulo}>Aparelhos por perto</Text>
          {buscando && <ActivityIndicator color={cores.primaria} />}
        </View>

        {aparelhos.map((aparelho) => (
          <TouchableOpacity
            key={aparelho.id}
            style={styles.aparelho}
            onPress={() => conectar(aparelho)}
          >
            <Text style={styles.aparelhoNome}>{aparelho.nome}</Text>
            <Text style={styles.aparelhoAcao}>Conectar</Text>
          </TouchableOpacity>
        ))}

        {buscando && !aparelhos.length && (
          <Text style={styles.textoFraco}>Procurando... deixe o aparelho ligado e perto do celular.</Text>
        )}

        {/* Lista vazia depois da busca é um resultado, e diz o que fazer. */}
        {!buscando && !aparelhos.length && !falha && (
          <Text style={styles.aviso}>
            Nenhum aparelho encontrado. Ligue o medidor, coloque-o perto do celular (e em modo de
            pareamento, se ele tiver) e toque em "Procurar de novo". Se não der, digite os
            valores manualmente.
          </Text>
        )}

        {falha && <Text style={styles.erro}>{falha.mensagem}</Text>}
        {falha?.permissao && (
          <TouchableOpacity style={styles.botaoSecundario} onPress={() => Linking.openSettings()}>
            <Text style={styles.botaoSecundarioTexto}>Abrir os ajustes do aparelho</Text>
          </TouchableOpacity>
        )}

        {!buscando && (
          <TouchableOpacity style={styles.botaoSecundario} onPress={procurar}>
            <Text style={styles.botaoSecundarioTexto}>Procurar de novo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderizarConectado() {
    return (
      <View style={styles.cartao}>
        <Text style={styles.rotulo}>Conectado a {aparelhoAtual?.nome}</Text>

        {!ultima ? (
          <View style={styles.linha}>
            <ActivityIndicator color={cores.primaria} />
            <Text style={styles.textoFraco}>Aguardando a primeira leitura...</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.valorAoVivo, sinalPerdido && styles.valorVelho]}>
              {ultima.bpm} <Text style={styles.unidade}>bpm</Text>
            </Text>
            <Text style={styles.textoFraco}>
              {sinalPerdido
                ? `Último valor recebido às ${formatarHora(ultima.em)}: não é atual.`
                : 'Ao vivo'}
            </Text>
          </>
        )}

        <Text style={styles.contagem}>
          {leituras.length} {leituras.length === 1 ? 'leitura recebida' : 'leituras recebidas'}
          {media !== null ? ` · média ${media} bpm` : ''}
        </Text>

        {/* Conexão perdida no meio: a tela percebe e avisa. */}
        {sinalPerdido && (
          <>
            <Text style={styles.aviso}>
              {falha
                ? `${falha.mensagem} `
                : `Sem leituras há ${segundosSemLeitura} s: a conexão pode ter caído. `}
              Confira o aparelho e reconecte, ou importe a média do que já chegou.
            </Text>
            <TouchableOpacity style={styles.botaoSecundario} onPress={reconectar}>
              <Text style={styles.botaoSecundarioTexto}>Reconectar</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.botao,
            (leituras.length < MINIMO_LEITURAS || importando) && styles.botaoDesabilitado,
          ]}
          onPress={importarMedia}
          disabled={leituras.length < MINIMO_LEITURAS || importando}
        >
          <Text style={styles.botaoTexto}>
            {importando
              ? 'Gravando no prontuário...'
              : leituras.length < MINIMO_LEITURAS
              ? `Aguardando ${MINIMO_LEITURAS} leituras para a média`
              : `Importar média (${media} bpm) para o prontuário`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botaoSecundario} onPress={trocarDeAparelho}>
          <Text style={styles.botaoSecundarioTexto}>Desconectar e escolher outro aparelho</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderizarManual() {
    return (
      <View style={styles.cartao}>
        <Text style={styles.rotulo}>Frequência cardíaca (bpm)</Text>
        <TextInput
          style={styles.campo}
          value={valorManual}
          onChangeText={(texto) => setValorManual(texto.replace(/\D/g, '').slice(0, 3))}
          keyboardType="numeric"
          placeholder="72"
          placeholderTextColor={cores.textoFraco}
          editable={!importando}
        />
        <TouchableOpacity
          style={[styles.botao, importando && styles.botaoDesabilitado]}
          onPress={importarManual}
          disabled={importando}
        >
          <Text style={styles.botaoTexto}>
            {importando ? 'Gravando no prontuário...' : 'Gravar no prontuário'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={trocarDeAparelho}>
          <Text style={styles.linkTexto}>Voltar a procurar aparelhos</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: espaco.md,
    gap: espaco.md,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.primaria,
  },
  subtitulo: {
    fontSize: 14,
    color: cores.textoFraco,
  },
  selo: {
    alignSelf: 'flex-start',
    backgroundColor: cores.primariaClara,
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 8,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    gap: espaco.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textoFraco,
  },
  centro: {
    textAlign: 'center',
    color: cores.texto,
  },
  aparelho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    padding: espaco.md,
  },
  aparelhoNome: {
    fontSize: 15,
    color: cores.texto,
    flexShrink: 1,
  },
  aparelhoAcao: {
    color: cores.primaria,
    fontWeight: '700',
  },
  valorAoVivo: {
    fontSize: 56,
    fontWeight: '700',
    color: cores.primaria,
  },
  valorVelho: {
    color: cores.textoFraco,
    textDecorationLine: 'line-through',
  },
  unidade: {
    fontSize: 20,
    fontWeight: '600',
  },
  contagem: {
    fontSize: 14,
    color: cores.texto,
  },
  textoFraco: {
    fontSize: 13,
    color: cores.textoFraco,
    flexShrink: 1,
  },
  aviso: {
    backgroundColor: cores.avisoClaro,
    color: cores.aviso,
    fontSize: 13,
    borderRadius: 8,
    padding: espaco.sm,
  },
  erro: {
    backgroundColor: cores.erroClaro,
    color: cores.erro,
    fontSize: 13,
    borderRadius: 8,
    padding: espaco.sm,
  },
  campo: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 4,
    fontSize: 18,
    color: cores.texto,
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.md,
    alignItems: 'center',
    marginTop: espaco.sm,
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
  },
  link: {
    paddingVertical: espaco.sm,
    alignItems: 'center',
  },
  linkTexto: {
    color: cores.primaria,
    fontWeight: '700',
    fontSize: 15,
  },
});
