// jest.setup.js - preparação comum a todos os testes (Aula 14).
//
// Bibliotecas com código nativo não rodam no Node. Aqui ficam os dublês que
// TODOS os testes usam; cada arquivo de teste pode trocar o comportamento
// (mockResolvedValue / mockRejectedValue) para provocar a falha que quiser.

// AsyncStorage em memória, fornecido pela própria biblioteca.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Cofre do token em memória (o real é o Keychain/Keystore do aparelho).
jest.mock('expo-secure-store', () => {
  const cofre = new Map();
  return {
    setItemAsync: jest.fn(async (k, v) => void cofre.set(k, v)),
    getItemAsync: jest.fn(async (k) => (cofre.has(k) ? cofre.get(k) : null)),
    deleteItemAsync: jest.fn(async (k) => void cofre.delete(k)),
    __limpar: () => cofre.clear(),
  };
});

// Notificações: por padrão, permissão concedida e agendamento que funciona.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'notificacao-1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[teste]' })),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
}));

// Emulador/teste: não é aparelho físico (o push devolve o motivo e segue).
jest.mock('expo-device', () => ({ isDevice: false }));

// Sistema de arquivos (fotos de perfil fora do cache): pasta permanente falsa.
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documentos/',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
}));
