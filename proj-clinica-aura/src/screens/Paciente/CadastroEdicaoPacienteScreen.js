import React, { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import PacienteForm from '../../components/PacienteForm';
import { cores } from '../../theme';
import { post, put } from '../../services/api';

export default function CadastroEdicaoPacienteScreen({ route, navigation }) {
  const paciente = route.params?.paciente;
  const editando = Boolean(paciente);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editando ? 'Editar paciente' : 'Novo paciente',
    });
  }, [navigation, editando]);

  // Escrita na API (Aula 4) pelo cliente único: ele anexa o token, serializa o
  // corpo e trata os erros HTTP. Quem avisa o usuário é o PacienteForm.
  async function handleSave(dados) {
    if (editando) {
      return put(`/pacientes/${paciente.id}`, { ...dados, id: paciente.id });
    }
    return post('/pacientes', dados);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <PacienteForm paciente={paciente} onSave={handleSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
});
