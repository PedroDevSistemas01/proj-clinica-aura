// jest.afterEnv.js - configuração da Testing Library (Aula 14).
//
// O teto padrão de espera do findBy/waitFor é 1000 ms. Com vários arquivos
// rodando em paralelo, o PRIMEIRO teste de cada arquivo demora mais (carga
// dos módulos) e estourava esse teto sem bug nenhum. Subimos o TETO para
// 5000 ms: não é pausa, a espera termina assim que a condição vale.
import { configure } from '@testing-library/react-native';

configure({ asyncUtilTimeout: 5000 });
