import React, { useLayoutEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import MedicoForm from '../../components/MedicoForm';
import { cores } from '../../theme';
import { post, put } from '../../services/api';

export default function CadastroEdicaoMedicoScreen({ route, navigation }) {
  // Sem médico em route.params -> cadastro. Com médico -> edição.
  const medico = route.params?.medico;
  const editando = Boolean(medico);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editando ? 'Editar médico' : 'Novo médico',
    });
  }, [navigation, editando]);

  // Escrita na API (Aula 4). Agora pelo cliente único: ele anexa o token,
  // serializa o corpo e trata os erros HTTP — por isso sumiram o fetch e o
  // BASE_URL daqui. Esta função continua NÃO mostrando Alert nem chamando
  // goBack(): quem avisa o usuário é o MedicoForm, quando o servidor confirmar.
  async function handleSave(dados) {
    if (editando) {
      return put(`/medicos/${medico.id}`, { ...dados, id: medico.id });
    }
    return post('/medicos', dados);
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
