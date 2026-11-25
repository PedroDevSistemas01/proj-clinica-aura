import React from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { cores, espaco } from '../theme';

// Campo de foto de perfil (Aula 6, Passo 2).
// Um componente só, usado pelo MedicoForm e pelo PacienteForm: é assim que a
// mesma lógica serve aos dois cadastros sem copiar e colar.
//
// expo-image-picker (e não expo-camera): para um campo de formulário basta
// abrir a câmera do sistema e receber a foto de volta.
//
// Dívida técnica consciente: o que guardamos é a URI, um endereço que aponta
// para o CACHE do app. Se o sistema limpar o cache, a foto some. Resolver de
// verdade exige upload para o servidor (extensão da aula).

const OPCOES_CAMERA = {
  allowsEditing: true,
  aspect: [1, 1], // já recorta no formato de avatar
  quality: 0.6, // foto de celular tem vários MB; ninguém precisa disso num avatar
};

function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

// Explica ANTES do pop-up do sistema. Pedir sem contexto é o caminho mais
// curto para o "negar".
function explicarAntes(titulo, mensagem) {
  return new Promise((resolver) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Agora não', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Continuar', onPress: () => resolver(true) },
    ]);
  });
}

async function garantirPermissaoCamera() {
  const atual = await ImagePicker.getCameraPermissionsAsync();
  if (atual.granted) return true;

  if (atual.canAskAgain) {
    // Ainda dá para perguntar: explicamos o porquê e só então o sistema pede.
    const seguir = await explicarAntes(
      'Acesso à câmera',
      'Para tirar a foto de perfil, o app vai pedir acesso à câmera. A foto fica só neste cadastro.'
    );
    if (!seguir) return false;

    const pedido = await ImagePicker.requestCameraPermissionsAsync();
    if (pedido.granted) return true;
    if (pedido.canAskAgain) {
      Alert.alert(
        'Câmera não autorizada',
        'Sem a câmera não dá para tirar a foto agora. Você pode escolher uma da galeria ou salvar o cadastro sem foto.'
      );
      return false;
    }
  }

  // Negada para sempre: pedir de novo não faz nada, o sistema nem mostra a
  // caixa. O único caminho é levar a pessoa aos ajustes.
  Alert.alert(
    'Câmera bloqueada',
    'O acesso à câmera foi negado nos ajustes do aparelho. Você pode liberar por lá, escolher uma foto da galeria ou salvar sem foto.',
    [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

export default function FotoPerfil({ uri, nome, onChange, desabilitado = false }) {
  async function tirarFoto() {
    try {
      if (!(await garantirPermissaoCamera())) return;

      const resultado = await ImagePicker.launchCameraAsync(OPCOES_CAMERA);

      // Fechar a câmera sem tirar foto é normal. Sem esta checagem:
      // "Cannot read property uri of undefined".
      if (resultado.canceled || !resultado.assets?.length) return;

      onChange(resultado.assets[0].uri);
    } catch (e) {
      // Emulador sem câmera, câmera ocupada por outro app...
      console.log('Falha ao abrir a câmera.');
      Alert.alert('Câmera indisponível', 'Não foi possível abrir a câmera neste aparelho.');
    }
  }

  // Plano B para quem não quer (ou não pode) usar a câmera. O seletor de
  // fotos do sistema dispensa permissão nas versões recentes do Android e iOS.
  async function escolherDaGaleria() {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        ...OPCOES_CAMERA,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      onChange(resultado.assets[0].uri);
    } catch (e) {
      console.log('Falha ao abrir a galeria.');
      Alert.alert('Galeria indisponível', 'Não foi possível abrir a galeria.');
    }
  }

  function escolherFoto() {
    const opcoes = [
      { text: 'Tirar foto', onPress: tirarFoto },
      { text: 'Escolher da galeria', onPress: escolherDaGaleria },
    ];
    if (uri) {
      opcoes.push({ text: 'Remover foto', style: 'destructive', onPress: () => onChange(null) });
    }
    // O Alert do Android mostra no máximo 3 botões: lá o "Cancelar" vira tocar
    // fora da caixa. No iOS o botão de cancelar é obrigatório.
    if (Platform.OS === 'ios') {
      opcoes.push({ text: 'Cancelar', style: 'cancel' });
    }
    Alert.alert('Foto de perfil', 'A foto é opcional.', opcoes, { cancelable: true });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={escolherFoto}
        disabled={desabilitado}
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.espacoReservado]}>
            <Text style={styles.iniciais}>{iniciais(nome)}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={escolherFoto} disabled={desabilitado}>
        <Text style={styles.acao}>{uri ? 'Trocar foto' : 'Adicionar foto (opcional)'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const TAMANHO = 112;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: espaco.lg,
  },
  foto: {
    width: TAMANHO,
    height: TAMANHO,
    borderRadius: TAMANHO / 2,
    borderWidth: 3,
    borderColor: cores.primariaClara,
  },
  espacoReservado: {
    backgroundColor: cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: {
    fontSize: 36,
    fontWeight: '700',
    color: cores.primaria,
  },
  acao: {
    marginTop: espaco.sm,
    color: cores.primaria,
    fontWeight: '600',
  },
});
