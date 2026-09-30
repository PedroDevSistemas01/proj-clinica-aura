import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { obterToken } from '../../services/sessao';
import { cores, espaco } from '../../theme';

// Login com biometria (Aula 6, Passo 3).
//
// O conceito da tela inteira: a biometria NÃO autentica na API da clínica.
// Ela destranca, no próprio aparelho, o token que a Aula 4 já guardou no
// cofre. Quem diz "esta pessoa pode entrar" continua sendo o servidor, pelo
// token. A digital nunca chega ao app: o sistema responde só "sim" ou "não".

const ROTA_INICIAL = 'Menu';

function nomeDoSensor(tipos) {
  const T = LocalAuthentication.AuthenticationType;
  if (tipos.includes(T.FACIAL_RECOGNITION)) return 'reconhecimento facial';
  if (tipos.includes(T.FINGERPRINT)) return 'digital';
  if (tipos.includes(T.IRIS)) return 'íris';
  return 'biometria';
}

export default function LoginBiometrico({ navigation }) {
  // null = ainda verificando. Evita piscar a mensagem errada.
  const [estado, setEstado] = useState(null);
  const [autenticando, setAutenticando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  function irParaLoginComSenha() {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  // As três checagens antes de oferecer o botão (item 12).
  useEffect(() => {
    let ativo = true;

    async function verificar() {
      const [temSensor, cadastrada, token, tipos] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        obterToken(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      if (!ativo) return;

      // Sem token guardado não há sessão para destrancar: vai direto para o
      // login com e-mail e senha (item 13).
      if (!token) {
        irParaLoginComSenha();
        return;
      }

      setEstado({ temSensor, cadastrada, sensor: nomeDoSensor(tipos) });
    }

    verificar().catch(() => {
      // Falha lendo o sensor: trata como "sem biometria"; a senha continua lá.
      if (ativo) setEstado({ temSensor: false, cadastrada: false, sensor: 'biometria' });
    });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrarComBiometria() {
    setMensagem(null);
    setAutenticando(true);
    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        // Diz o que está sendo liberado (item 15).
        promptMessage: 'Confirme que é você para destrancar sua sessão na Clínica Aura',
        cancelLabel: 'Usar e-mail e senha',
        // Deixa o sistema oferecer o PIN/padrão do aparelho se a digital falhar.
        disableDeviceFallback: false,
      });

      if (resultado.success) {
        // O token continua no cofre; o api.js o lê em cada requisição. Se ele
        // tiver expirado no servidor, o 401 do api.js manda de volta ao login.
        navigation.reset({ index: 0, routes: [{ name: ROTA_INICIAL }] });
        return;
      }

      // Cancelar é escolha, não erro: nada de mensagem alarmante (item 16).
      // O botão de cancelar se chama "Usar e-mail e senha", então é para lá
      // que a pessoa vai.
      if (resultado.error === 'user_cancel') {
        irParaLoginComSenha();
        return;
      }
      // O sistema interrompeu (app foi para segundo plano, chegou ligação...).
      if (resultado.error === 'system_cancel' || resultado.error === 'app_cancel') {
        setMensagem({ tipo: 'neutra', texto: 'Tudo bem. Toque de novo quando quiser, ou entre com e-mail e senha.' });
        return;
      }
      if (resultado.error === 'lockout') {
        setMensagem({ tipo: 'erro', texto: 'Muitas tentativas. Aguarde um pouco ou entre com e-mail e senha.' });
        return;
      }
      setMensagem({ tipo: 'erro', texto: 'Não foi possível confirmar a biometria. Tente de novo ou entre com e-mail e senha.' });
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Biometria indisponível agora. Entre com e-mail e senha.' });
    } finally {
      setAutenticando(false);
    }
  }

  if (estado === null) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  const podeUsarBiometria = estado.temSensor && estado.cadastrada;

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.container}>
        <Text style={styles.titulo}>Clínica Aura</Text>
        <Text style={styles.subtitulo}>Bem-vindo de volta</Text>

        {podeUsarBiometria ? (
          // Botão só aparece com sensor, biometria cadastrada e token (item 14).
          <TouchableOpacity
            style={[styles.botao, autenticando && styles.botaoDesabilitado]}
            onPress={entrarComBiometria}
            disabled={autenticando}
          >
            <Text style={styles.botaoTexto}>
              {autenticando ? 'Aguardando confirmação...' : `Entrar com ${estado.sensor}`}
            </Text>
          </TouchableOpacity>
        ) : (
          // Mensagem diz QUAL dos dois é o caso.
          <Text style={styles.info}>
            {estado.temSensor
              ? 'Este aparelho tem sensor biométrico, mas nenhuma biometria está cadastrada nos ajustes do sistema. Cadastre uma para entrar sem senha da próxima vez.'
              : 'Este aparelho não tem sensor biométrico. Entre com e-mail e senha.'}
          </Text>
        )}

        {mensagem && (
          <Text style={mensagem.tipo === 'erro' ? styles.erro : styles.neutra}>
            {mensagem.texto}
          </Text>
        )}

        {/* Sempre visível: biometria é atalho, nunca requisito (item 17). */}
        <TouchableOpacity style={styles.link} onPress={irParaLoginComSenha}>
          <Text style={styles.linkTexto}>Entrar com e-mail e senha</Text>
        </TouchableOpacity>

        <Text style={styles.rodape}>
          Sua digital ou seu rosto são conferidos pelo próprio aparelho e nunca são enviados à
          clínica.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  carregando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cores.fundo,
  },
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
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
    marginBottom: espaco.lg,
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.md,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    backgroundColor: cores.primariaClara,
    color: cores.texto,
    borderRadius: 10,
    padding: espaco.md,
    fontSize: 14,
  },
  erro: {
    color: cores.erro,
    marginTop: espaco.md,
  },
  neutra: {
    color: cores.textoFraco,
    marginTop: espaco.md,
  },
  link: {
    marginTop: espaco.lg,
    paddingVertical: espaco.sm,
    alignItems: 'center',
  },
  linkTexto: {
    color: cores.primaria,
    fontWeight: '700',
    fontSize: 15,
  },
  rodape: {
    marginTop: espaco.lg,
    color: cores.textoFraco,
    fontSize: 12,
    textAlign: 'center',
  },
});
