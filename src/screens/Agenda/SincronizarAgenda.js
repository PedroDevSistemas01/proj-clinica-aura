import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { cores, espaco } from '../../theme';
import { get, SessaoExpirada } from '../../services/api';
import {
  detectarConflitos,
  detectarConflitosIngenuo,
  gerarConsultasDeTeste,
} from '../../services/conflitos';
import useTarefaPesada from '../../hooks/useTarefaPesada';

// Verificação de conflitos da agenda (Aula 10, Passo 5).
//
// O critério de hoje não é "ficou rápido": é "a interface continuou
// respondendo enquanto processava". Por isso a tela tem, lado a lado:
//   - a versão ingênua e bloqueante (para ver o indicador congelar);
//   - a versão fatiada, com barra de progresso e botão Cancelar;
//   - um contador de toques, a prova de que a tela responde durante o cálculo.
//
// Repare: buscar da API com await NÃO trava (é espera). O cálculo é que
// precisa ser fatiado.

const FATIAS = [100, 500, 5000];
const FATIA_PADRAO = 500; // escolha justificada no README

export default function SincronizarAgenda({ navigation }) {
  const [consultas, setConsultas] = useState([]);
  const [origemDados, setOrigemDados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState(null);

  const [tamanhoFatia, setTamanhoFatia] = useState(FATIA_PADRAO);
  const [toques, setToques] = useState(0);

  const [ingenuo, setIngenuo] = useState(null);
  const [rodandoIngenuo, setRodandoIngenuo] = useState(false);

  const tarefa = useCallback(
    async (sinal, aoProgredir) => {
      const inicio = Date.now();
      const saida = await detectarConflitos(consultas, { tamanhoFatia, aoProgredir, sinal });
      // O tempo vai no resultado: o hook só o entrega se a tela ainda existir.
      return { ...saida, tempo: Date.now() - inicio, tamanhoFatia };
    },
    [consultas, tamanhoFatia]
  );
  const { executar, cancelar, rodando, progresso, resultado, erro } = useTarefaPesada(tarefa);

  async function buscarDaApi() {
    setBuscando(true);
    setErroBusca(null);
    try {
      const dados = await get('/consultas');
      setConsultas(dados);
      setOrigemDados('API');
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErroBusca(`Não foi possível buscar as consultas. ${e.message}`);
    } finally {
      setBuscando(false);
    }
  }

  // Alternativa do Passo 1: gerar o volume direto no app.
  function gerarNaMemoria() {
    setConsultas(gerarConsultasDeTeste(3000));
    setOrigemDados('gerada no app');
  }

  // Passo 2: bloqueante de propósito. O setTimeout deixa o indicador
  // aparecer antes; depois ele CONGELA até o laço terminar.
  function verificarIngenuo() {
    setRodandoIngenuo(true);
    setTimeout(() => {
      const inicio = Date.now();
      const saida = detectarConflitosIngenuo(consultas);
      setIngenuo({ ...saida, tempo: Date.now() - inicio });
      setRodandoIngenuo(false);
    }, 50);
  }

  const mesmosConflitos =
    ingenuo && resultado
      ? JSON.stringify(ingenuo.conflitos) === JSON.stringify(resultado.conflitos)
      : null;

  const n = consultas.length;
  const ocupado = rodando || rodandoIngenuo;

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cartao}>
          <Text style={styles.titulo}>1. Dados</Text>
          <Text style={styles.texto}>
            {n > 0
              ? `${n} consultas (${origemDados}). Comparações da versão ingênua: ${((n * (n - 1)) / 2).toLocaleString('pt-BR')}.`
              : 'Busque as consultas da API (rode antes npm run gerar-consultas) ou gere 3000 na memória.'}
          </Text>
          {n > 0 && n < 2000 && (
            <Text style={styles.aviso}>Menos de 2 mil consultas: nada vai travar e a medição não diz nada.</Text>
          )}
          {!!erroBusca && <Text style={styles.erro}>{erroBusca}</Text>}
          <View style={styles.linha}>
            <Botao texto="Buscar da API" onPress={buscarDaApi} carregando={buscando} desabilitado={ocupado} />
            <Botao texto="Gerar 3000" onPress={gerarNaMemoria} secundario desabilitado={ocupado} />
          </View>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.titulo}>2. Versão ingênua (bloqueante)</Text>
          <Text style={styles.texto}>Todas com todas. Observe o indicador: ele congela durante o cálculo.</Text>
          <View style={styles.linha}>
            <Botao texto="Verificar travando" onPress={verificarIngenuo} desabilitado={!n || ocupado} perigo />
            {rodandoIngenuo && <ActivityIndicator color={cores.primaria} />}
          </View>
          {!!ingenuo && (
            <Text style={styles.resultado}>
              {ingenuo.conflitos.length} conflitos em {ingenuo.tempo} ms · {ingenuo.comparacoes.toLocaleString('pt-BR')} comparações
            </Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.titulo}>3. Sem travar (agrupada, ordenada e fatiada)</Text>
          <Text style={styles.texto}>Tamanho da fatia:</Text>
          <View style={styles.linha}>
            {FATIAS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, tamanhoFatia === f && styles.chipAtivo]}
                onPress={() => setTamanhoFatia(f)}
                disabled={ocupado}
              >
                <Text style={[styles.chipTexto, tamanhoFatia === f && styles.chipTextoAtivo]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.barraFundo}>
            <View style={[styles.barra, { width: `${Math.round(progresso * 100)}%` }]} />
          </View>
          <Text style={styles.texto}>{Math.round(progresso * 100)}%</Text>

          <View style={styles.linha}>
            {rodando ? (
              <>
                <ActivityIndicator color={cores.primaria} />
                <Botao texto="Cancelar" onPress={cancelar} perigo />
              </>
            ) : (
              <Botao texto="Verificar sem travar" onPress={() => executar()} desabilitado={!n || ocupado} />
            )}
          </View>

          {!!erro && <Text style={styles.aviso}>{erro}</Text>}
          {!!resultado && !rodando && (
            <Text style={styles.resultado}>
              {resultado.conflitos.length} conflitos em {resultado.tempo} ms · {resultado.comparacoes.toLocaleString('pt-BR')} comparações · fatia {resultado.tamanhoFatia}
            </Text>
          )}
          {mesmosConflitos !== null && !rodando && (
            <Text style={mesmosConflitos ? styles.ok : styles.erro}>
              {mesmosConflitos
                ? 'As duas versões encontraram os mesmos conflitos.'
                : 'ATENÇÃO: as versões encontraram conflitos diferentes.'}
            </Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.titulo}>A tela está viva?</Text>
          <Text style={styles.texto}>Toque durante a verificação. Na fatiada o número sobe; na ingênua, não.</Text>
          <Botao texto={`Toques: ${toques}`} onPress={() => setToques((t) => t + 1)} secundario />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Botao({ texto, onPress, carregando, desabilitado, secundario, perigo }) {
  return (
    <TouchableOpacity
      style={[
        styles.botao,
        secundario && styles.botaoSecundario,
        perigo && styles.botaoPerigo,
        desabilitado && styles.botaoDesabilitado,
      ]}
      onPress={onPress}
      disabled={desabilitado || carregando}
    >
      {carregando ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.botaoTexto, secundario && styles.botaoSecundarioTexto, perigo && styles.botaoPerigoTexto]}>
          {texto}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.md, gap: espaco.md, paddingBottom: espaco.lg * 2 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    gap: espaco.sm,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 13, color: cores.textoFraco },
  resultado: { fontSize: 14, color: cores.texto, fontWeight: '600' },
  aviso: { fontSize: 13, color: cores.aviso },
  erro: { fontSize: 13, color: cores.erro },
  ok: { fontSize: 13, color: cores.sucesso, fontWeight: '600' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 20,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs + 2,
  },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { color: cores.texto },
  chipTextoAtivo: { color: '#FFFFFF', fontWeight: '600' },
  barraFundo: { height: 10, backgroundColor: cores.primariaClara, borderRadius: 5, overflow: 'hidden' },
  barra: { height: 10, backgroundColor: cores.primaria },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    paddingHorizontal: espaco.md,
    alignItems: 'center',
    minWidth: 120,
  },
  botaoSecundario: { backgroundColor: cores.primariaClara },
  botaoPerigo: { backgroundColor: cores.erroClaro },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: '#FFFFFF', fontWeight: '600' },
  botaoSecundarioTexto: { color: cores.primaria },
  botaoPerigoTexto: { color: cores.erro },
});
