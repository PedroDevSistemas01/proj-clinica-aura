import React, { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import MedicoForm from '../../components/MedicoForm';
import { cores } from '../../theme';

const BASE_URL = 'http://localhost:3000';

export default function CadastroEdicaoMedicoScreen({ route, navigation }) {
  // Sem médico em route.params -> cadastro. Com médico -> edição.
  const medico = route.params?.medico;
  const editando = Boolean(medico);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editando ? 'Editar médico' : 'Novo médico',
    });
  }, [navigation, editando]);

  // Passo 4 — escrita na API.
  // Repare que esta função NÃO mostra Alert nem chama goBack():
  // ela só grava e devolve o resultado. Quem avisa o usuário é o
  // MedicoForm, depois que o servidor confirmar.
  async function handleSave(dados) {
    const url = editando ? `${BASE_URL}/medicos/${medico.id}` : `${BASE_URL}/medicos`;
    const method = editando ? 'PUT' : 'POST';
    const corpo = editando ? { ...dados, id: medico.id } : dados;

    const resposta = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });

    if (!resposta.ok) {
      throw new Error(
        `Não foi possível salvar o médico. O servidor respondeu ${resposta.status}.`
      );
    }

    return resposta.json();
  }

  return (
    <SafeAreaView style={styles.tela}>
      <MedicoForm medico={medico} onSave={handleSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
});
