import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { cores, espaco } from '../theme';

const CAMPOS = [
  { chave: 'nome', rotulo: 'Nome completo', placeholder: 'Ana Beatriz Souza' },
  { chave: 'crm', rotulo: 'CRM', placeholder: 'CRM-SP 123456' },
  { chave: 'especialidade', rotulo: 'Especialidade', placeholder: 'Cardiologia' },
  {
    chave: 'telefone',
    rotulo: 'Telefone',
    placeholder: '(16) 99123-4567',
    teclado: 'phone-pad',
  },
  {
    chave: 'email',
    rotulo: 'E-mail',
    placeholder: 'nome@clinicaaura.com.br',
    teclado: 'email-address',
  },
];

export default function MedicoForm({ medico, onSave }) {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    nome: medico?.nome ?? '',
    crm: medico?.crm ?? '',
    especialidade: medico?.especialidade ?? '',
    telefone: medico?.telefone ?? '',
    email: medico?.email ?? '',
  });

  // Passo 4, item 13 — trava o botão enquanto a requisição está em curso.
  const [salvando, setSalvando] = useState(false);

  function atualizarCampo(chave, valor) {
    setFormData((anterior) => ({ ...anterior, [chave]: valor }));
  }

  async function handleSubmit() {
    if (!formData.nome.trim() || !formData.crm.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha ao menos o nome e o CRM.');
      return;
    }

    try {
      setSalvando(true);

      // O await é o ponto central do passo: só seguimos adiante
      // depois que o servidor confirmar a gravação.
      await onSave(formData);

      Alert.alert(
        'Tudo certo',
        medico ? 'Cadastro do médico atualizado.' : 'Médico cadastrado.'
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro ao salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {CAMPOS.map((campo) => (
          <View key={campo.chave} style={styles.grupo}>
            <Text style={styles.rotulo}>{campo.rotulo}</Text>
            <TextInput
              style={styles.campo}
              value={formData[campo.chave]}
              onChangeText={(valor) => atualizarCampo(campo.chave, valor)}
              placeholder={campo.placeholder}
              placeholderTextColor={cores.textoFraco}
              keyboardType={campo.teclado ?? 'default'}
              autoCapitalize={campo.chave === 'email' ? 'none' : 'sentences'}
              editable={!salvando}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={handleSubmit}
          disabled={salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando ? 'Salvando...' : medico ? 'Salvar alterações' : 'Cadastrar médico'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    padding: espaco.md,
    paddingBottom: espaco.lg,
  },
  grupo: {
    marginBottom: espaco.md,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textoFraco,
    marginBottom: espaco.xs,
  },
  campo: {
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 4,
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
  },
});
