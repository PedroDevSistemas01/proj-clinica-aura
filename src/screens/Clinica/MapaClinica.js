import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

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
import {
  BORDA_ENQUADRAMENTO,
  DURACAO_ANIMACAO_MS,
  enderecoEmTexto,
  regiaoDaClinica,
  urlAppDeMapas,
} from '../../services/mapaClinica';
import { cores, espaco } from '../../theme';

// Tela "Como chegar" com mapa (Aula 12). Evolução da ComoChegar da Aula 6:
// o mapa ocupa a parte de cima e o painel de texto fica embaixo.
//
// Regra da aula: a informação vive no TEXTO. Sem rede o mapa vira um
// retângulo cinza e o leitor de tela não "vê" o mapa; por isso nome,
// endereço, telefone e distância ficam sempre no painel. O mapa é a forma
// agradável de mostrar, nunca a fonte.
//
// Nenhuma chamada ao expo-location aqui: a posição vem de
// services/localizacao (Aula 6), sem nenhum GPS novo.

// Cores dos pinos: pinColor é a forma mais barata de diferenciar marcadores
// (um View dentro do Marker custa bem mais).
const PINO_CLINICA = cores.primaria;
const PINO_USUARIO = '#E07A1C';

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

export default function MapaClinica() {
  const enderecoTexto = enderecoEmTexto(CLINICA.endereco);
  const mapaRef = useRef(null);

  const [fase, setFase] = useState(FASE.VERIFICANDO);
  const [posicao, setPosicao] = useState(null);
  const [posicaoAnterior, setPosicaoAnterior] = useState(false);
  const [destino, setDestino] = useState(CLINICA.coordenadas);

  // Coordenadas da clínica: se vieram do .env (CLINICA_LATITUDE/LONGITUDE),
  // elas mandam. Senão, as do geocoding (Aula 5) quando já estão no cache; e,
  // na falta delas, as de reserva de config/clinica.js.
  useEffect(() => {
    if (CLINICA.origemCoordenadas === 'configuracao') return;
    lerCoordenadasEmCache(CLINICA.endereco).then((emCache) => {
      if (emCache) setDestino(emCache);
    });
  }, []);

  // Coordenadas memorizadas: um objeto novo a cada render faria o
  // react-native-maps redesenhar o marcador (armadilha do Exemplo 6).
  const latClinica = destino.latitude;
  const lonClinica = destino.longitude;
  const pontoClinica = useMemo(
    () => ({ latitude: latClinica, longitude: lonClinica }),
    [latClinica, lonClinica]
  );
  const latUsuario = posicao?.latitude;
  const lonUsuario = posicao?.longitude;
  const pontoUsuario = useMemo(
    () =>
      latUsuario !== undefined ? { latitude: latUsuario, longitude: lonUsuario } : null,
    [latUsuario, lonUsuario]
  );

  // Os quatro números da região, centrados na clínica, delta 0.01.
  // Vão no initialRegion: ponto de partida, sem prender a câmera.
  const regiaoClinica = useMemo(() => regiaoDaClinica(pontoClinica), [pontoClinica]);

  // Ao obter a posição: enquadra você e a clínica juntos. fitToCoordinates
  // calcula centro e zoom sozinho; edgePadding dá respiro nas bordas.
  useEffect(() => {
    if (!pontoUsuario) return;
    mapaRef.current?.fitToCoordinates([pontoUsuario, pontoClinica], {
      edgePadding: BORDA_ENQUADRAMENTO,
      animated: true,
    });
  }, [pontoUsuario, pontoClinica]);

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

  // "Ver a clínica": animateToRegion move a câmera suavemente; trocar a
  // região de uma vez faria o mapa "pular".
  function voltarParaClinica() {
    mapaRef.current?.animateToRegion(regiaoClinica, DURACAO_ANIMACAO_MS);
  }

  // Rota delegada ao app de mapas do aparelho (ADR 007): geo: no Android,
  // maps: no iOS. Se o aparelho não tiver app de mapas (emulador), cai no
  // Google Maps pelo navegador, com o endereço.
  async function abrirComoChegar() {
    const url = urlAppDeMapas(Platform.OS, pontoClinica, CLINICA.nome);
    try {
      await Linking.openURL(url);
    } catch {
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoTexto)}`
      ).catch(() => {});
    }
  }

  const km = posicao ? distanciaKm(posicao, destino) : null;
  const tempo = km !== null ? estimarTempo(km) : null;

  return (
    <SafeAreaView style={styles.tela} testID="tela-mapa-clinica">
      <View style={styles.areaMapa}>
        {/* key: se a coordenada da clínica mudar (cache do geocoding), o mapa
            remonta já centrado nela. initialRegion, nunca region controlada. */}
        <MapView
          key={`${latClinica},${lonClinica}`}
          ref={mapaRef}
          style={styles.mapa}
          initialRegion={regiaoClinica}
          testID="mapa-clinica"
          accessibilityLabel={`Mapa mostrando a localização da ${CLINICA.nome}, na ${enderecoTexto}${
            pontoUsuario ? ', e a sua posição atual' : ''
          }. O endereço e o telefone estão em texto logo abaixo do mapa.`}
        >
          <Marker
            coordinate={pontoClinica}
            title={CLINICA.nome}
            description={enderecoTexto}
            pinColor={PINO_CLINICA}
            testID="marcador-clinica"
          >
            {/* O Callout é o balão: aceita qualquer componente. title e
                description acima continuam valendo para quem não o abre. */}
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitulo}>{CLINICA.nome}</Text>
                <Text style={styles.calloutTexto}>{enderecoTexto}</Text>
                <Text style={styles.calloutTexto}>{CLINICA.telefone}</Text>
              </View>
            </Callout>
          </Marker>

          {pontoUsuario && (
            <Marker
              coordinate={pontoUsuario}
              title="Você está aqui"
              description="Sua posição aproximada"
              pinColor={PINO_USUARIO}
              testID="marcador-usuario"
            />
          )}
        </MapView>

        <View style={styles.botoesMapa}>
          <TouchableOpacity
            style={styles.botaoMapa}
            onPress={lerPosicao}
            accessibilityRole="button"
            accessibilityLabel="Mostrar minha localização e a clínica no mapa"
            testID="botao-onde-estou"
          >
            <Text style={styles.botaoMapaTexto}>Onde estou?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoMapa}
            onPress={voltarParaClinica}
            accessibilityRole="button"
            accessibilityLabel="Centralizar o mapa na clínica"
            testID="botao-ver-clinica"
          >
            <Text style={styles.botaoMapaTexto}>Ver a clínica</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        {/* Painel de texto: a fonte da informação. Sempre visível, com ou sem
            rede, com ou sem permissão de localização. */}
        <View style={styles.cartao}>
          <Text style={styles.nomeClinica} accessibilityRole="header">
            {CLINICA.nome}
          </Text>
          <Text style={styles.rotulo}>Endereço</Text>
          <Text style={styles.valor} testID="endereco-clinica" selectable>
            {enderecoTexto}
          </Text>
          <Text style={[styles.rotulo, styles.espacoAcima]}>Telefone</Text>
          <Text style={styles.valor} testID="telefone-clinica" selectable>
            {CLINICA.telefone}
          </Text>
          <TouchableOpacity
            style={styles.botao}
            onPress={abrirComoChegar}
            accessibilityRole="button"
            accessibilityLabel={`Como chegar: abrir a rota até a ${CLINICA.nome} no app de mapas do aparelho`}
            testID="botao-como-chegar"
          >
            <Text style={styles.botaoTexto}>Como chegar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Distância até a clínica</Text>
          {renderizarLocalizacao()}
        </View>

        {/* Nota sobre a plataforma (Passo 5 do roteiro). */}
        <Text style={styles.nota} testID="nota-plataforma">
          {Platform.OS === 'ios'
            ? 'Mapa fornecido pelo Apple Maps.'
            : 'Mapa fornecido pelo Google Maps.'}{' '}
          Sem internet o mapa pode ficar cinza, mas o endereço e o telefone acima continuam
          valendo.
        </Text>
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
            <TouchableOpacity
              style={styles.botao}
              onPress={lerPosicao}
              accessibilityRole="button"
              accessibilityLabel="Usar minha localização para calcular a distância até a clínica"
              testID="botao-localizar"
            >
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
            <Text style={styles.aviso} testID="mensagem-erro">
              Sem a sua localização não dá para calcular a distância. O endereço acima continua
              valendo para você chegar.
            </Text>
            <TouchableOpacity
              style={styles.botao}
              onPress={lerPosicao}
              accessibilityRole="button"
              accessibilityLabel="Pedir de novo a permissão de localização"
              testID="botao-localizar"
            >
              <Text style={styles.botaoTexto}>Permitir localização</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.BLOQUEADA:
        // Pedir de novo não faz nada: o sistema nem mostra a caixa.
        return (
          <>
            <Text style={styles.aviso} testID="mensagem-erro">
              A localização está bloqueada para este app nos ajustes do aparelho. Se quiser ver a
              distância, libere por lá.
            </Text>
            <TouchableOpacity
              style={styles.botao}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Abrir os ajustes do aparelho para liberar a localização"
              testID="botao-ajustes"
            >
              <Text style={styles.botaoTexto}>Abrir os ajustes do aparelho</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.DESLIGADA:
        return (
          <>
            <Text style={styles.aviso} testID="mensagem-erro">
              A localização do aparelho está desligada. Ligue-a e tente de novo.
            </Text>
            <TouchableOpacity
              style={styles.botao}
              onPress={lerPosicao}
              accessibilityRole="button"
              accessibilityLabel="Tentar ler minha localização novamente"
              testID="botao-localizar"
            >
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.ERRO:
        return (
          <>
            <Text style={styles.aviso} testID="mensagem-erro">Não foi possível obter a sua posição agora.</Text>
            <TouchableOpacity
              style={styles.botao}
              onPress={lerPosicao}
              accessibilityRole="button"
              accessibilityLabel="Tentar ler minha localização novamente"
              testID="botao-localizar"
            >
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </>
        );

      case FASE.PRONTA:
      default:
        return (
          <>
            <Text
              style={styles.distancia}
              testID="distancia"
              accessibilityLabel={`${formatarDistancia(km)} em linha reta até a clínica`}
            >
              {formatarDistancia(km)}
            </Text>
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

            <TouchableOpacity
              style={styles.botaoSecundario}
              onPress={lerPosicao}
              accessibilityRole="button"
              accessibilityLabel="Atualizar minha posição e a distância até a clínica"
            >
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
  areaMapa: {
    height: '42%',
    minHeight: 220,
    backgroundColor: cores.borda, // o "retângulo cinza" quando não há rede
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  botoesMapa: {
    position: 'absolute',
    right: espaco.sm,
    bottom: espaco.sm,
    gap: espaco.sm,
  },
  botaoMapa: {
    backgroundColor: cores.superficie,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: espaco.md,
    minHeight: 44, // área de toque mínima recomendada
    justifyContent: 'center',
  },
  botaoMapaTexto: {
    color: cores.primaria,
    fontWeight: '700',
  },
  callout: {
    maxWidth: 240,
    padding: espaco.xs,
  },
  calloutTitulo: {
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 2,
  },
  calloutTexto: {
    fontSize: 12,
    color: cores.texto,
  },
  nomeClinica: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: espaco.sm,
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
