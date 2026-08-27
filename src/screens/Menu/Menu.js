import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { cores, espaco } from '../../theme';

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
];

export default function Menu({ navigation }) {
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
});
