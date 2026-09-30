import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/Login/LoginScreen';
import LoginBiometrico from './src/screens/Login/LoginBiometrico';
import Menu from './src/screens/Menu/Menu';
import Medico from './src/screens/Medico/Medico';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';
import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoPacienteScreen from './src/screens/Paciente/CadastroEdicaoPacienteScreen';
import SobreClinica from './src/screens/Sobre/SobreClinica';
import { estaLogado } from './src/services/sessao';
import { cores } from './src/theme';

const Stack = createNativeStackNavigator();

// Componente raiz do projeto da squad.
// A partir da Aula 4 o app deixa de ser aberto a qualquer um: antes de decidir
// a tela inicial, ele verifica se ja existe uma sessao guardada no cofre.
export default function App() {
  // null = ainda verificando; true/false = resultado de estaLogado().
  const [logado, setLogado] = useState(null);

  useEffect(() => {
    estaLogado().then(setLogado);
  }, []);

  // Enquanto verifica, mostra um indicador. Sem isso, o app pisca a tela de
  // Login para quem ja estava autenticado (Passo 5, item 20).
  if (logado === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        // Quem tem sessao guardada destranca com biometria (Aula 6); quem nao
        // tem ve o Login com e-mail e senha.
        initialRouteName={logado ? 'LoginBiometrico' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: cores.primaria },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LoginBiometrico" component={LoginBiometrico} options={{ headerShown: false }} />
        <Stack.Screen name="Menu" component={Menu} options={{ headerShown: false }} />
        <Stack.Screen name="Medicos" component={Medico} options={{ title: 'Médicos' }} />
        <Stack.Screen name="CadastroEdicaoMedico" component={CadastroEdicaoMedicoScreen} />
        <Stack.Screen name="Pacientes" component={Paciente} options={{ title: 'Pacientes' }} />
        <Stack.Screen name="CadastroEdicaoPaciente" component={CadastroEdicaoPacienteScreen} />
        <Stack.Screen name="SobreClinica" component={SobreClinica} options={{ title: 'Sobre a clínica' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
