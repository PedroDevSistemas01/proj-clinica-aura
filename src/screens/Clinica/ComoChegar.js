import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CLINICA } from '../../config/clinica';
import { lerCoordenadasEmCache } from '../../services/localizacaoClinica';
import {
  LocalizacaoDesligada,
  PermissaoNegada,
  consultarPermissao,
  distanciaKm,
  estimarTempo,
  formatarDistancia,
  obterPosicaoAtual,
  obterUltimaPosicaoConhecida,
} from '../../services/localizacao';
import { cores, espaco } from '../../theme';

// Tela "Como chegar" (Aula 6, Passo 4).
// Nenhuma chamada ao expo-location aqui: tudo passa por services/localizacao.
// Regra da tela: sem GPS ela continua útil. O endereço da clínica aparece
// SEMPRE, com ou sem permissão.

// Fases da localização. 'verificando' existe para não piscar "negada" para
// quem já tinha concedido.
const FASE = {
  VERIFICANDO: 'verificando',
  EXPLICAR: 'explicar', // ainda não pedimos: explicar antes do pop-up
  LENDO: 'lendo',
  PRONTA: 'pronta',
  NEGADA: 'negada', // pode perguntar de novo
  BLOQUEADA: 'bloqueada', // canAskAgain false: só pelos ajustes
  DESLIGADA: 'desligada', // localização do aparelho desligada
  ERRO: 'erro',
};

export default function ComoChegar() {
  const { endereco } = CLINICA;
  const enderecoTexto = `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, ${endereco.cep}`;

  const [fase, setFase] = useState(FASE.VERIFICANDO);
  const [posicao, setPosicao] = useState(null);
  const [posicaoAnterior, setPosicaoAnterior] = useState(false);
  const [destino, setDestino] = useState(CLINICA.coordenadas);

  // Coordenadas da clínica: as do geocoding (Aula 5) quando já estão no
  // cache; senão, as escritas em config/clinica.js.
  useEffect(() => {
    lerCoordenadasEmCache(endereco).then((emCache) => {
      if (emCache) setDestino(emCache);
    });
  }, [endereco]);

  const lerPosicao = useCallback(async () => {
    setFase((atual) => (atual === FASE.PRONTA ? atual : FASE.LENDO));
    try {
      const atual = await obterPosicaoAtual();
      setPosicao(atual);
      setPosicaoAnterior(false);
      setFase(FASE.PRONTA);
    } catch (e) {
      if (e instanceof PermissaoNegada) {
        setFase(e.canAskAgain ? FASE.NEGADA : FASE.BLOQUEADA);
      } else if (e instanceof LocalizacaoDesligada) {
        setFase(FASE.DESLIGADA);
      } else {
        console.log('Falha ao ler a posição.');
        setFase(FASE.ERRO);
      }
    }
  }, []);

  // Ao abrir: se a permissão já foi dada, mostra a última posição conhecida
  // na hora e busca a atual. Se não foi, explica antes de pedir.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { concedida, podePerguntar } = await consultarPermissao();
      if (!ativo) return;

      if (concedida) {
        const ultima = await obterUltimaPosicaoConhecida();
        if (!ativo) return;
        if (ultima) {
          setPosicao(ultima);
          setPosicaoAnterior(true);
          setFase(FASE.PRONTA);
        }
        lerPosicao();
      } else {
        setFase(podePerguntar ? FASE.EXPLICAR : FASE.BLOQUEADA);
      }
    })().catch(() => ativo && setFase(FASE.ERRO));
    return () => {
      ativo = false;
    };
  }, [lerPosicao]);

  function abrirNoAppDeMapas() {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoTexto)}`
    );
  }

  const km = posicao ? distanciaKm(posicao, destino) : null;
  const tempo = km !== null ? estimarTempo(km) : null;

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* Sempre visível: recurso negado não pode virar tela vazia. */}
        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Endereço da clínica</Text>
          <Text style={styles.valor}>{enderecoTexto}</Text>
          <Text style={[styles.rotulo, styles.espacoAcima]}>Telefone</Text>
          <Text style={styles.valor}>{CLINICA.telefone}</Text>
          <TouchableOpacity style={styles.botaoSecundario} onPress={abrirNoAppDeMapas}>
            <Text style={styles.botaoSecundarioTexto}>Abrir no app de mapas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Distância até a clínica</Text>
          {renderizarLocalizacao()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function renderizarLocalizacao() {
    switch (fase) {
      case FASE.VERIFICANDO:
        return <ActivityIndicator color={cores.primaria} style={styles.indicador} />;

      case FASE.EXPLICAR:
        return (
          <>
            <Text style={styles.texto}>
              Para calcular a distância, o app usa a sua localização só enquanto esta tela está
              aberta. Ela não é gravada nem enviada à clínica.
            </Text>
            <TouchableOpacity style={styles.botao} onPress={lerPosicao}>
              <Text style={styles.botaoTexto}>Usar minha localização</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.LENDO:
        return (
          <View style={styles.linha}>
            <ActivityIndicator color={cores.primaria} />
            <Text style={styles.textoFraco}>
              Procurando sua posição... a primeira leitura pode demorar.
            </Text>
          </View>
        );

      case FASE.NEGADA:
        return (
          <>
            <Text style={styles.aviso}>
              Sem a sua localização não dá para calcular a distância. O endereço acima continua
              valendo para você chegar.
            </Text>
            <TouchableOpacity style={styles.botao} onPress={lerPosicao}>
              <Text style={styles.botaoTexto}>Permitir localização</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.BLOQUEADA:
        // Pedir de novo não faz nada: o sistema nem mostra a caixa.
        return (
          <>
            <Text style={styles.aviso}>
              A localização está bloqueada para este app nos ajustes do aparelho. Se quiser ver a
              distância, libere por lá.
            </Text>
            <TouchableOpacity style={styles.botao} onPress={() => Linking.openSettings()}>
              <Text style={styles.botaoTexto}>Abrir os ajustes do aparelho</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.DESLIGADA:
        return (
          <>
            <Text style={styles.aviso}>
              A localização do aparelho está desligada. Ligue-a e tente de novo.
            </Text>
            <TouchableOpacity style={styles.botao} onPress={lerPosicao}>
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.ERRO:
        return (
          <>
            <Text style={styles.aviso}>Não foi possível obter a sua posição agora.</Text>
            <TouchableOpacity style={styles.botao} onPress={lerPosicao}>
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.PRONTA:
      default:
        return (
          <>
            <Text style={styles.distancia}>{formatarDistancia(km)}</Text>
            <Text style={styles.textoFraco}>em linha reta</Text>

            <View style={styles.tempos}>
              {tempo.aPe && <Text style={styles.valor}>A pé: cerca de {tempo.aPe}</Text>}
              <Text style={styles.valor}>De carro: cerca de {tempo.carro}</Text>
            </View>

            <Text style={styles.textoFraco}>
              Precisão da sua posição: ± {Math.round(posicao.precisao ?? 0)} m
              {posicaoAnterior ? ' (última posição conhecida, atualizando...)' : ''}
            </Text>

            {/* Prometer precisão que não se tem é falha de UX. */}
            <Text style={styles.nota}>
              A distância é em linha reta e o tempo é só uma estimativa: o caminho real pelas ruas
              é maior e depende do trânsito.
            </Text>

            <TouchableOpacity style={styles.botaoSecundario} onPress={lerPosicao}>
              <Text style={styles.botaoSecundarioTexto}>Atualizar posição</Text>
            </TouchableOpacity>
          </>
        );
    }
  }
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: espaco.md,
    gap: espaco.md,
  },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espaco.md,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textoFraco,
    marginBottom: espaco.xs,
  },
  espacoAcima: {
    marginTop: espaco.md,
  },
  valor: {
    fontSize: 15,
    color: cores.texto,
  },
  texto: {
    fontSize: 14,
    color: cores.texto,
  },
  textoFraco: {
    fontSize: 12,
    color: cores.textoFraco,
    marginTop: espaco.xs,
    marginLeft: espaco.xs,
    flexShrink: 1,
  },
  distancia: {
    fontSize: 36,
    fontWeight: '700',
    color: cores.primaria,
  },
  tempos: {
    marginTop: espaco.md,
    marginBottom: espaco.sm,
    gap: espaco.xs,
  },
  nota: {
    fontSize: 12,
    color: cores.textoFraco,
    fontStyle: 'italic',
    marginTop: espaco.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicador: {
    alignSelf: 'flex-start',
  },
  aviso: {
    backgroundColor: cores.avisoClaro,
    color: cores.aviso,
    fontSize: 13,
    borderRadius: 8,
    padding: espaco.sm,
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm + 4,
    alignItems: 'center',
    marginTop: espaco.md,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: espaco.sm,
    alignItems: 'center',
    marginTop: espaco.md,
  },
  botaoSecundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
  },
});
