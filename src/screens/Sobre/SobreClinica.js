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
import { ATRIBUICAO_OSM } from '../../services/geocoding';
import { obterCoordenadasClinica } from '../../services/localizacaoClinica';
import { cores, espaco } from '../../theme';

// Tela "Sobre a clínica" (Aula 5, Trilha B).
// Mostra o endereço e as coordenadas obtidas pelo Nominatim. Na Aula 12 o
// bloco de coordenadas vira um mapa de verdade (ADR 003); o dado já está aqui.
export default function SobreClinica() {
  const { endereco } = CLINICA;

  const [coordenadas, setCoordenadas] = useState(null);
  const [doCache, setDoCache] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState(null);
  // Depois de um 429 não oferecemos "tentar de novo": insistir piora o bloqueio.
  const [limiteAtingido, setLimiteAtingido] = useState(false);

  const carregar = useCallback(
    async ({ ignorarCache = false } = {}) => {
      setCarregando(true);
      setAviso(null);
      try {
        const resultado = await obterCoordenadasClinica(endereco, { ignorarCache });
        setCoordenadas(resultado.coordenadas);
        setDoCache(resultado.doCache);
        if (!resultado.coordenadas) {
          setAviso('O serviço de localização não encontrou este endereço.');
        }
      } catch (e) {
        setAviso(e.message);
        setLimiteAtingido(Boolean(e.limiteAtingido));
      } finally {
        setCarregando(false);
      }
    },
    [endereco]
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enderecoTexto = `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade} - ${endereco.uf}, ${endereco.cep}`;

  // Plano B do mapa (ADR 003): abre o app de mapas do próprio aparelho,
  // com coordenadas se houver, ou com o endereço em texto se não houver.
  function abrirNoAppDeMapas() {
    const destino = coordenadas
      ? `${coordenadas.latitude},${coordenadas.longitude}`
      : enderecoTexto;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>{CLINICA.nome}</Text>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Endereço</Text>
          <Text style={styles.valor}>{enderecoTexto}</Text>
          <Text style={[styles.rotulo, styles.espacoAcima]}>Telefone</Text>
          <Text style={styles.valor}>{CLINICA.telefone}</Text>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Localização</Text>

          {carregando ? (
            <View style={styles.linha}>
              <ActivityIndicator color={cores.primaria} />
              <Text style={styles.textoFraco}>Localizando a clínica...</Text>
            </View>
          ) : coordenadas ? (
            <>
              <Text style={styles.valor}>Latitude: {coordenadas.latitude.toFixed(6)}</Text>
              <Text style={styles.valor}>Longitude: {coordenadas.longitude.toFixed(6)}</Text>
              <Text style={styles.textoFraco}>
                {doCache ? 'Guardado neste aparelho.' : 'Consultado agora.'}
              </Text>
            </>
          ) : null}

          {aviso && !carregando && (
            <>
              <Text style={styles.aviso}>{aviso}</Text>
              {!limiteAtingido && (
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={() => carregar({ ignorarCache: true })}
                >
                  <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity style={styles.botao} onPress={abrirNoAppDeMapas}>
            <Text style={styles.botaoTexto}>Abrir no app de mapas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Atribuição exigida pela política do Nominatim / licença ODbL. */}
      <View style={styles.rodape}>
        <Text
          style={styles.atribuicao}
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        >
          Dados de localização {ATRIBUICAO_OSM}
        </Text>
      </View>
    </SafeAreaView>
  );
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
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: cores.primaria,
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
  textoFraco: {
    fontSize: 12,
    color: cores.textoFraco,
    marginTop: espaco.xs,
    marginLeft: espaco.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: espaco.sm,
  },
  botaoSecundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
  },
  rodape: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  atribuicao: {
    fontSize: 12,
    color: cores.textoFraco,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
