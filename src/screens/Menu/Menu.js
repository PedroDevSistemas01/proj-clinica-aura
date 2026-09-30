import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { cores, espaco } from '../../theme';
import { limparToken } from '../../services/sessao';

// Menu principal do app. A partir daqui a squad chega nas telas
// de Médicos e Pacientes, que consomem a API RESTful da clínica.
const OPCOES = [
  {
    rota: 'Medicos',
    titulo: 'Médicos',
    descricao: 'Listar, cadastrar, editar e excluir o corpo clínico',
  },
  {
    rota: 'Pacientes',
    titulo: 'Pacientes',
    descricao: 'Listar, cadastrar, editar e excluir pacientes',
  },
  {
    rota: 'SobreClinica',
    titulo: 'Sobre a clínica',
    descricao: 'Endereço, telefone e localização da clínica',
  },
];

export default function Menu({ navigation }) {
  // Logout (Passo 5, item 23): apaga o token do cofre E volta para o Login.
  // As duas coisas, sempre — só navegar deixaria a sessão viva no cofre, e a
  // próxima pessoa que abrisse o aparelho entraria sem senha.
  async function sair() {
    await limparToken();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Clínica Aura</Text>
        <Text style={styles.subtitulo}>Agendamento de consultas</Text>
      </View>

      <View style={styles.lista}>
        {OPCOES.map((opcao) => (
          <TouchableOpacity
            key={opcao.rota}
            style={styles.cartao}
            onPress={() => navigation.navigate(opcao.rota)}
          >
            <Text style={styles.cartaoTitulo}>{opcao.titulo}</Text>
            <Text style={styles.cartaoDescricao}>{opcao.descricao}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.rodape}>
        <TouchableOpacity style={styles.botaoSair} onPress={sair}>
          <Text style={styles.botaoSairTexto}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  cabecalho: {
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
    paddingBottom: espaco.md,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: cores.primaria,
  },
  subtitulo: {
    fontSize: 14,
    color: cores.textoFraco,
    marginTop: espaco.xs,
  },
  lista: {
    paddingHorizontal: espaco.lg,
    gap: espaco.md,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
  },
  cartaoTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: cores.texto,
  },
  cartaoDescricao: {
    fontSize: 13,
    color: cores.textoFraco,
    marginTop: espaco.xs,
  },
  rodape: {
    marginTop: 'auto',
    paddingHorizontal: espaco.lg,
    paddingBottom: espaco.lg,
  },
  botaoSair: {
    borderWidth: 1,
    borderColor: cores.erro,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
  },
  botaoSairTexto: {
    color: cores.erro,
    fontWeight: '700',
  },
});
