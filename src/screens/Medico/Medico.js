import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { cores, espaco } from '../../theme';
import { get, remover, SessaoExpirada } from '../../services/api';

// A partir da Aula 4 esta tela não fala mais com a rede direto: toda requisição
// passa pelo cliente único (src/services/api.js), que anexa o token e trata o
// 401. O endereço da API fica configurado lá, em um lugar só.

export default function Medico({ navigation }) {
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  // Passo 2 — leitura: GET /medicos
  const buscarMedicos = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await get('/medicos');
      setMedicos(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        // Sessão morta: o api.js já limpou o cofre. Volta para o Login.
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErro(
        `Não foi possível carregar a lista de médicos. ${e.message} Confira se a API está no ar.`
      );
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  // Passo 5, item 17 — useFocusEffect no lugar do useEffect:
  // a lista se recarrega toda vez que a tela recebe o foco,
  // inclusive ao voltar do formulário de cadastro/edição.
  useFocusEffect(
    useCallback(() => {
      buscarMedicos();
    }, [buscarMedicos])
  );

  // Agrupamento por letra inicial, alimentando a SectionList.
  const secoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrados = medicos.filter((medico) => {
      if (!termo) return true;
      const alvo = `${medico.nome} ${medico.especialidade ?? ''} ${medico.crm ?? ''}`;
      return alvo.toLowerCase().includes(termo);
    });

    const grupos = {};
    filtrados.forEach((medico) => {
      const letra = (medico.nome?.[0] ?? '#').toUpperCase();
      if (!grupos[letra]) grupos[letra] = [];
      grupos[letra].push(medico);
    });

    return Object.keys(grupos)
      .sort()
      .map((letra) => ({
        title: letra,
        data: grupos[letra].sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
  }, [medicos, busca]);

  // Passo 5 — exclusão: confirmação antes do DELETE
  function confirmarExclusao(medico) {
    Alert.alert(
      'Excluir médico',
      `Excluir o cadastro de ${medico.nome}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluirMedico(medico.id),
        },
      ]
    );
  }

  async function excluirMedico(id) {
    try {
      await remover(`/medicos/${id}`);

      // O servidor é a fonte da verdade: recarrega a lista em vez de
      // mexer no estado local.
      await buscarMedicos();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Erro ao excluir', e.message);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator size="large" color={cores.primaria} />
        <Text style={styles.textoCarregando}>Carregando médicos...</Text>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <View style={styles.caixaErro}>
          <Text style={styles.tituloErro}>Falha na comunicação</Text>
          <Text style={styles.mensagemErro}>{erro}</Text>
          <TouchableOpacity style={styles.botaoPrimario} onPress={buscarMedicos}>
            <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.barraTopo}>
        <TextInput
          style={styles.campoBusca}
          placeholder="Buscar por nome, CRM ou especialidade"
          placeholderTextColor={cores.textoFraco}
          value={busca}
          onChangeText={setBusca}
        />
        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => navigation.navigate('CadastroEdicaoMedico')}
        >
          <Text style={styles.botaoNovoTexto}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.conteudoLista}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.cabecalhoSecao}>{section.title}</Text>
        )}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            {busca
              ? 'Nenhum médico encontrado para essa busca.'
              : 'Nenhum médico cadastrado ainda. Toque em "+ Novo" para começar.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cartao}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.especialidade}>{item.especialidade}</Text>
            <Text style={styles.detalhe}>{item.crm}</Text>
            {!!item.telefone && <Text style={styles.detalhe}>{item.telefone}</Text>}

            <View style={styles.acoes}>
              <TouchableOpacity
                style={styles.botaoSecundario}
                onPress={() =>
                  navigation.navigate('CadastroEdicaoMedico', { medico: item })
                }
              >
                <Text style={styles.botaoSecundarioTexto}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoPerigo}
                onPress={() => confirmarExclusao(item)}
              >
                <Text style={styles.botaoPerigoTexto}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.lg,
  },
  textoCarregando: {
    marginTop: espaco.md,
    color: cores.textoFraco,
  },
  caixaErro: {
    backgroundColor: cores.erroClaro,
    borderRadius: 12,
    padding: espaco.md,
    width: '100%',
  },
  tituloErro: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.erro,
    marginBottom: espaco.sm,
  },
  mensagemErro: {
    fontSize: 14,
    color: cores.texto,
    marginBottom: espaco.md,
  },
  barraTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  campoBusca: {
    flex: 1,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 2,
    color: cores.texto,
  },
  botaoNovo: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 4,
  },
  botaoNovoTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  conteudoLista: {
    paddingHorizontal: espaco.md,
    paddingBottom: espaco.lg,
  },
  cabecalhoSecao: {
    fontSize: 13,
    fontWeight: '700',
    color: cores.primaria,
    marginTop: espaco.md,
    marginBottom: espaco.sm,
    letterSpacing: 1,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
    marginBottom: espaco.sm,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: cores.texto,
  },
  especialidade: {
    fontSize: 14,
    color: cores.primaria,
    marginTop: 2,
  },
  detalhe: {
    fontSize: 13,
    color: cores.textoFraco,
    marginTop: 2,
  },
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  botaoPrimario: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  botaoSecundario: {
    flex: 1,
    backgroundColor: cores.primariaClara,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
  },
  botaoPerigo: {
    flex: 1,
    backgroundColor: cores.erroClaro,
    borderRadius: 10,
    paddingVertical: espaco.sm + 2,
    alignItems: 'center',
  },
  botaoPerigoTexto: {
    color: cores.erro,
    fontWeight: '600',
  },
  listaVazia: {
    textAlign: 'center',
    color: cores.textoFraco,
    marginTop: espaco.lg,
  },
});
