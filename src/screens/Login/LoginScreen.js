import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { salvarToken } from '../../services/sessao';
import { cores, espaco } from '../../theme';

// Tela de login (Aula 4, Passo 2).
// Faz POST /login na API de autenticação, guarda o token pelo módulo de sessão
// e, no sucesso, entra no app com navigation.reset (não navigate) — assim o
// gesto de "voltar" não devolve o usuário para o Login.

// URL da API de AUTENTICAÇÃO (Aula 4) — sempre na 3001, porque o json-server
// (3000) não tem /login. Em celular físico com Expo Go, troque 'localhost'
// pelo IP da máquina (ipconfig -> IPv4 do Wi-Fi). No emulador Android: 10.0.2.2.
const AUTH_URL = 'http://localhost:3001';

// Para onde ir depois de logar. É o nome da rota principal no Stack.Navigator.
const ROTA_INICIAL = 'Menu';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState(null);

  async function entrar() {
    setErro(null);

    // Validação ANTES da rede: campo vazio não merece requisição — e a senha
    // não sai à toa pela rede (Passo 2, item 3).
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }

    setEntrando(true);
    try {
      const resposta = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      });

      // 401 tratado à parte: credencial inválida. A mensagem NÃO diz qual campo
      // errou — isso confirmaria a um atacante que aquele e-mail existe (item 5).
      if (resposta.status === 401) {
        setErro('E-mail ou senha inválidos.');
        return;
      }
      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();

      // Guarda o token pelo módulo de sessão — nenhuma tela fala com o
      // SecureStore direto (Passo 3, item 11).
      await salvarToken(dados.token);

      // A senha não precisa continuar na memória do app (Passo 2, item 6).
      setSenha('');

      // reset, não navigate: o usuário não pode "voltar" para o Login com o
      // gesto de voltar (Passo 5, item 22).
      navigation.reset({ index: 0, routes: [{ name: ROTA_INICIAL }] });
    } catch (e) {
      // Erro de rede / API fora do ar — separado do 401.
      setErro('Não foi possível entrar. Verifique se a API está no ar.');
      // NÃO logamos o token nem a senha (varredura do Passo 6).
      console.log('Falha no login.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Clínica Aura</Text>
          <Text style={styles.subtitulo}>Acesso restrito</Text>
        </View>

        <View style={styles.grupo}>
          <Text style={styles.rotulo}>E-mail</Text>
          <TextInput
            style={styles.campo}
            value={email}
            onChangeText={setEmail}
            // autoCapitalize="none": a primeira maiúscula automática já quebrou
            // muito login (Passo 2, item 2).
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="voce@clinica.com"
            placeholderTextColor={cores.textoFraco}
            editable={!entrando}
          />
        </View>

        <View style={styles.grupo}>
          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            style={styles.campo}
            value={senha}
            onChangeText={setSenha}
            // secureTextEntry esconde a senha de quem olha a tela. Ele NÃO
            // protege o que trafega na rede — isso é papel do HTTPS.
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
            placeholderTextColor={cores.textoFraco}
            editable={!entrando}
          />
        </View>

        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity
          style={[styles.botao, entrando && styles.botaoDesabilitado]}
          onPress={entrar}
          // Enquanto a requisição corre, o botão fica travado (Passo 2, item 7).
          disabled={entrando}
        >
          <Text style={styles.botaoTexto}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.dica}>Teste: recepcao@clinica.com / clinica123</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
  },
  cabecalho: {
    marginBottom: espaco.lg,
  },
  titulo: {
    fontSize: 30,
    fontWeight: '700',
    color: cores.primaria,
  },
  subtitulo: {
    fontSize: 14,
    color: cores.textoFraco,
    marginTop: espaco.xs,
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
  erro: {
    color: cores.erro,
    marginBottom: espaco.sm,
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
  dica: {
    marginTop: espaco.lg,
    color: cores.textoFraco,
    fontSize: 12,
    textAlign: 'center',
  },
});
