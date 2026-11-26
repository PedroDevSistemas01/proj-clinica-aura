// app.config.js — configuração do app (Aula 15; substitui o app.json).
//
// Por que .js e não .json: daqui dá para ler variáveis de ambiente. Chave e
// identificador de conta NÃO ficam escritos neste arquivo (ele vai para o
// Git). Os valores vêm de:
//   - .env na máquina de quem desenvolve (fora do Git; modelo: .env.example).
//     O Expo CLI carrega o .env sozinho antes de ler este arquivo;
//   - EAS Secrets na nuvem, no build: eas secret:create --name <NOME> --value "..."
//
// Variáveis lidas aqui (todas opcionais no laboratório):
//   EAS_PROJECT_ID       -> projectId do EAS; sem ele o token de push falha (Aula 9)
//   GOOGLE_MAPS_API_KEY  -> chave do Maps SDK for Android (Aula 12, ADR 003)
//   ANDROID_PACKAGE      -> identificador do app na loja (padrão abaixo)
//   GOOGLE_SERVICES_JSON -> caminho do google-services.json do Firebase (push
//                           no Android, FCM V1). Sem a variável, usa
//                           ./google-services.json se o arquivo existir.
//                           No EAS: secret do tipo arquivo (ver docs/CONTAS_E_CHAVES.md)
//   API_URL, AUTH_API_URL -> endereço do json-server (3000) e da API de
//                           autenticação (3001). No celular físico: IP da máquina.
//   CLINICA_LATITUDE, CLINICA_LONGITUDE -> coordenadas da clínica
//                           (padrão em src/config/clinica.js)
//
// Passo a passo das contas: docs/CONTAS_E_CHAVES.md

const fs = require('fs');
const path = require('path');

const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'com.clinicaaura.app';

// Firebase: o arquivo nunca vai para o Git (.gitignore). Sem ele o build
// sai normalmente, só o push no Android não recebe nada.
function arquivoFirebase() {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  const local = path.join(__dirname, 'google-services.json');
  return fs.existsSync(local) ? './google-services.json' : undefined;
}

module.exports = {
  expo: {
    name: 'Clínica Aura',
    slug: 'proj-clinica-aura',
    // version é o que o usuário vê (1.0.0). O versionCode do Android (número
    // inteiro que a loja exige que sempre suba) é controlado pelo EAS:
    // "appVersionSource": "remote" + "autoIncrement" no perfil production.
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: ANDROID_PACKAGE,
      infoPlist: {
        UIBackgroundModes: ['fetch'], // Aula 11
      },
    },
    android: {
      package: ANDROID_PACKAGE,
      googleServicesFile: arquivoFirebase(),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      config: {
        // Aula 12 (mapa) ainda não implementada; a chave já tem lugar certo.
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // Lidos no app por src/config/ambiente.js. Vazio = padrão de laboratório.
      apiUrl: process.env.API_URL || undefined,
      authApiUrl: process.env.AUTH_API_URL || undefined,
      clinica: {
        latitude: process.env.CLINICA_LATITUDE || undefined,
        longitude: process.env.CLINICA_LONGITUDE || undefined,
      },
      // Chaves de teste no aparelho (docs/TESTES_APARELHO.md). Só valem num
      // development build; no Expo Go o código nativo não existe.
      bluetoothReal: process.env.BLUETOOTH_REAL || undefined,
      backgroundReal: process.env.BACKGROUND_REAL || undefined,
      lembreteTesteMinutos: process.env.LEMBRETE_TESTE_MINUTOS || undefined,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
    plugins: [
      [
        'expo-image-picker',
        {
          cameraPermission:
            'A Clínica Aura usa a câmera só para tirar a foto de perfil de médicos e pacientes.',
          photosPermission:
            'A Clínica Aura acessa suas fotos só quando você escolhe uma imagem para a foto de perfil.',
        },
      ],
      [
        'expo-local-authentication',
        {
          faceIDPermission:
            'A Clínica Aura usa o Face ID para destrancar a sua sessão neste aparelho. O seu rosto nunca sai do aparelho.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'A Clínica Aura usa sua localização só enquanto a tela Como chegar está aberta, para calcular a distância até a clínica. Ela não é enviada a ninguém.',
        },
      ],
      [
        'react-native-ble-plx',
        {
          isBackgroundEnabled: false,
          modes: [],
          bluetoothAlwaysPermission:
            'A Clínica Aura usa o Bluetooth só para ler os sinais vitais de um aparelho de medição durante a pré-consulta.',
        },
      ],
      ['expo-notifications', { color: '#0E5C63' }],
    ],
  },
};
