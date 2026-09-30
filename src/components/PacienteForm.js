import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { cepValido, consultarCep, somenteDigitosCep } from '../services/viacep';

const CAMPOS = [
  { chave: 'nome', rotulo: 'Nome completo', placeholder: 'Helena Ribeiro' },
  { chave: 'cpf', rotulo: 'CPF', placeholder: '123.456.789-00', teclado: 'numeric' },
  {
    chave: 'dataNascimento',
    rotulo: 'Data de nascimento (AAAA-MM-DD)',
    placeholder: '1988-03-14',
  },
  {
    chave: 'telefone',
    rotulo: 'Telefone',
    placeholder: '(16) 98111-2233',
    teclado: 'phone-pad',
  },
  {
    chave: 'email',
    rotulo: 'E-mail',
    placeholder: 'nome@email.com',
    teclado: 'email-address',
  },
  { chave: 'convenio', rotulo: 'Convênio', placeholder: 'Unimed / Particular' },
];

// Campos de endereço (Aula 5, Trilha A). Preenchidos pelo CEP, mas sempre
// editáveis: se o ViaCEP falhar, o cadastro continua possível à mão.
const CAMPOS_ENDERECO = [
  { chave: 'logradouro', rotulo: 'Logradouro', placeholder: 'Rua Nove de Julho' },
  { chave: 'numero', rotulo: 'Número', placeholder: '1500', teclado: 'numeric' },
  { chave: 'complemento', rotulo: 'Complemento', placeholder: 'Apto 12 (opcional)' },
  { chave: 'bairro', rotulo: 'Bairro', placeholder: 'Centro' },
  { chave: 'cidade', rotulo: 'Cidade', placeholder: 'São Carlos' },
  { chave: 'uf', rotulo: 'UF', placeholder: 'SP', maiusculas: true, maximo: 2 },
];

// Formata "13560042" como "13560-042" enquanto a pessoa digita.
function formatarCep(valor) {
  const digitos = somenteDigitosCep(valor).slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export default function PacienteForm({ paciente, onSave }) {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    nome: paciente?.nome ?? '',
    cpf: paciente?.cpf ?? '',
    dataNascimento: paciente?.dataNascimento ?? '',
    telefone: paciente?.telefone ?? '',
    email: paciente?.email ?? '',
    convenio: paciente?.convenio ?? '',
    cep: paciente?.cep ?? '',
    logradouro: paciente?.logradouro ?? '',
    numero: paciente?.numero ?? '',
    complemento: paciente?.complemento ?? '',
    bairro: paciente?.bairro ?? '',
    cidade: paciente?.cidade ?? '',
    uf: paciente?.uf ?? '',
  });

  const [salvando, setSalvando] = useState(false);

  // Estado da consulta de CEP: indicador enquanto corre e AVISO (não erro
  // fatal) quando falha.
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState(null);

  // Último CEP consultado: sair e voltar do campo sem mudar nada não gasta
  // outra consulta de um serviço que não é nosso.
  const ultimoCepConsultado = useRef(somenteDigitosCep(paciente?.cep));

  function atualizarCampo(chave, valor) {
    setFormData((anterior) => ({ ...anterior, [chave]: valor }));
  }

  // Disparada no onBlur do CEP, nunca a cada tecla: isso queimaria cota e
  // atrapalharia quem digita.
  async function buscarEnderecoPeloCep() {
    const digitos = somenteDigitosCep(formData.cep);

    if (!digitos) {
      setAvisoCep(null);
      return;
    }
    if (!cepValido(digitos)) {
      setAvisoCep('O CEP deve ter 8 dígitos. Você pode preencher o endereço à mão.');
      return;
    }
    if (digitos === ultimoCepConsultado.current) {
      return;
    }

    setConsultandoCep(true);
    setAvisoCep(null);
    try {
      const endereco = await consultarCep(digitos);
      ultimoCepConsultado.current = digitos;

      if (!endereco) {
        setAvisoCep('CEP não encontrado. Confira o número ou preencha o endereço à mão.');
        return;
      }

      // Preenche só o que veio do serviço; número e complemento são da pessoa.
      // CEP geral de cidade vem com logradouro vazio: não apaga o que já estava.
      setFormData((anterior) => ({
        ...anterior,
        cep: endereco.cep,
        logradouro: endereco.logradouro || anterior.logradouro,
        bairro: endereco.bairro || anterior.bairro,
        cidade: endereco.cidade || anterior.cidade,
        uf: endereco.uf || anterior.uf,
      }));
    } catch (e) {
      // ServicoExternoIndisponivel já traz a mensagem dizendo QUAL serviço
      // falhou. O cadastro NÃO para: é só um aviso.
      setAvisoCep(`${e.message} Preencha o endereço à mão.`);
    } finally {
      setConsultandoCep(false);
    }
  }

  async function handleSubmit() {
    if (!formData.nome.trim() || !formData.cpf.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha ao menos o nome e o CPF.');
      return;
    }

    try {
      setSalvando(true);
      await onSave(formData);

      Alert.alert(
        'Tudo certo',
        paciente ? 'Cadastro do paciente atualizado.' : 'Paciente cadastrado.'
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro ao salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  function renderizarCampo(campo) {
    return (
      <View key={campo.chave} style={styles.grupo}>
        <Text style={styles.rotulo}>{campo.rotulo}</Text>
        <TextInput
          style={styles.campo}
          value={formData[campo.chave]}
          onChangeText={(valor) =>
            atualizarCampo(campo.chave, campo.maiusculas ? valor.toUpperCase() : valor)
          }
          placeholder={campo.placeholder}
          placeholderTextColor={cores.textoFraco}
          keyboardType={campo.teclado ?? 'default'}
          autoCapitalize={
            campo.chave === 'email' ? 'none' : campo.maiusculas ? 'characters' : 'sentences'
          }
          maxLength={campo.maximo}
          editable={!salvando}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {CAMPOS.map(renderizarCampo)}

        <Text style={styles.secao}>Endereço</Text>

        <View style={styles.grupo}>
          <Text style={styles.rotulo}>CEP</Text>
          <View style={styles.linhaCep}>
            <TextInput
              style={[styles.campo, styles.campoCep]}
              value={formData.cep}
              onChangeText={(valor) => atualizarCampo('cep', formatarCep(valor))}
              onBlur={buscarEnderecoPeloCep}
              placeholder="13560-042"
              placeholderTextColor={cores.textoFraco}
              keyboardType="numeric"
              maxLength={9}
              editable={!salvando}
            />
            {consultandoCep && (
              <View style={styles.indicadorCep}>
                <ActivityIndicator color={cores.primaria} />
                <Text style={styles.indicadorTexto}>Consultando CEP...</Text>
              </View>
            )}
          </View>
          {avisoCep && <Text style={styles.aviso}>{avisoCep}</Text>}
        </View>

        {CAMPOS_ENDERECO.map(renderizarCampo)}

        <TouchableOpacity
          style={[styles.botao, (salvando || consultandoCep) && styles.botaoDesabilitado]}
          onPress={handleSubmit}
          disabled={salvando || consultandoCep}
        >
          <Text style={styles.botaoTexto}>
            {salvando
              ? 'Salvando...'
              : paciente
              ? 'Salvar alterações'
              : 'Cadastrar paciente'}
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
  secao: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.primaria,
    marginTop: espaco.sm,
    marginBottom: espaco.md,
  },
  linhaCep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campoCep: {
    flex: 1,
  },
  indicadorCep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: espaco.sm,
  },
  indicadorTexto: {
    fontSize: 12,
    color: cores.textoFraco,
    marginLeft: espaco.xs,
  },
  aviso: {
    backgroundColor: cores.avisoClaro,
    color: cores.aviso,
    fontSize: 13,
    borderRadius: 8,
    padding: espaco.sm,
    marginTop: espaco.sm,
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
