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

// Aula 4: toda requisição passa pelo cliente único (src/services/api.js), que
// anexa o token e trata o 401. O endereço da API fica configurado lá.

export default function Paciente({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Passo 3 — leitura: GET /pacientes (mesmo padrão da tela de médicos)
  const buscarPacientes = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await get('/pacientes');
      setPacientes(dados);
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErro(
        `Não foi possível carregar a lista de pacientes. ${e.message} Confira se a API está no ar.`
      );
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      buscarPacientes();
    }, [buscarPacientes])
  );

  // Passo 7 (extensão) — escrita nos endpoints /pacientes
  function confirmarExclusao(paciente) {
    Alert.alert(
      'Excluir paciente',
      `Excluir o cadastro de ${paciente.nome}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluirPaciente(paciente.id),
        },
      ]
    );
  }

  async function excluirPaciente(id) {
    try {
      await remover(`/pacientes/${id}`);

      await buscarPacientes();
    } catch (e) {
      if (e instanceof SessaoExpirada) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Erro ao excluir', e.message);
    }
  }

  function formatarNascimento(valor) {
    if (!valor) return null;
    const [ano, mes, dia] = valor.split('-');
    if (!ano || !mes || !dia) return valor;
    return `${dia}/${mes}/${ano}`;
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <ActivityIndicator size="large" color={cores.primaria} />
        <Text style={styles.textoCarregando}>Carregando pacientes...</Text>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={[styles.tela, styles.centralizado]}>
        <View style={styles.caixaErro}>
          <Text style={styles.tituloErro}>Falha na comunicação</Text>
          <Text style={styles.mensagemErro}>{erro}</Text>
          <TouchableOpacity style={styles.botaoPrimario} onPress={buscarPacientes}>
            <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.barraTopo}>
        <Text style={styles.contador}>
          {pacientes.length} {pacientes.length === 1 ? 'paciente' : 'pacientes'}
        </Text>
        <TouchableOpacity
          style={styles.botaoNovo}
          onPress={() => navigation.navigate('CadastroEdicaoPaciente')}
        >
          <Text style={styles.botaoNovoTexto}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pacientes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.conteudoLista}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            Nenhum paciente cadastrado ainda. Toque em "+ Novo" para começar.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cartao}>
            <Text style={styles.nome}>{item.nome}</Text>
            {!!item.cpf && <Text style={styles.detalhe}>CPF {item.cpf}</Text>}
            {!!item.dataNascimento && (
              <Text style={styles.detalhe}>
                Nascimento {formatarNascimento(item.dataNascimento)}
              </Text>
            )}
            {!!item.telefone && <Text style={styles.detalhe}>{item.telefone}</Text>}
            {!!item.convenio && <Text style={styles.convenio}>{item.convenio}</Text>}

            <View style={styles.acoes}>
              <TouchableOpacity
                style={styles.botaoSecundario}
                onPress={() =>
                  navigation.navigate('CadastroEdicaoPaciente', { paciente: item })
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
    justifyContent: 'space-between',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  contador: {
    fontSize: 13,
    color: cores.textoFraco,
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
  detalhe: {
    fontSize: 13,
    color: cores.textoFraco,
    marginTop: 2,
  },
  convenio: {
    fontSize: 13,
    color: cores.primaria,
    marginTop: espaco.xs,
    fontWeight: '600',
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
