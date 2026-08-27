import React, { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import PacienteForm from '../../components/PacienteForm';
import { cores } from '../../theme';

const BASE_URL = 'http://localhost:3000';

export default function CadastroEdicaoPacienteScreen({ route, navigation }) {
  const paciente = route.params?.paciente;
  const editando = Boolean(paciente);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editando ? 'Editar paciente' : 'Novo paciente',
    });
  }, [navigation, editando]);

  async function handleSave(dados) {
    const url = editando
      ? `${BASE_URL}/pacientes/${paciente.id}`
      : `${BASE_URL}/pacientes`;
    const method = editando ? 'PUT' : 'POST';
    const corpo = editando ? { ...dados, id: paciente.id } : dados;

    const resposta = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível salvar o paciente. O servidor respondeu ${resposta.status}.`
      );
    }

    return resposta.json();
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
