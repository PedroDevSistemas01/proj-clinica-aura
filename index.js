import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e garante que o ambiente esteja configurado corretamente,
// seja rodando com Expo Go ou em uma build nativa.
registerRootComponent(App);
