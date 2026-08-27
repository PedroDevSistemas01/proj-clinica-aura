import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Menu from './src/screens/Menu/Menu';
import Medico from './src/screens/Medico/Medico';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';
import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoPacienteScreen from './src/screens/Paciente/CadastroEdicaoPacienteScreen';
import { cores } from './src/theme';

const Stack = createNativeStackNavigator();

// Componente raiz do projeto da squad.
// A partir da Aula 3 nenhuma lista sai daqui por prop: cada tela
// busca os proprios dados na API RESTful da clinica.
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Menu"
        screenOptions={{
          headerStyle: { backgroundColor: cores.primaria },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="Menu" component={Menu} options={{ headerShown: false }} />
        <Stack.Screen name="Medicos" component={Medico} options={{ title: 'Médicos' }} />
        <Stack.Screen name="CadastroEdicaoMedico" component={CadastroEdicaoMedicoScreen} />
        <Stack.Screen name="Pacientes" component={Paciente} options={{ title: 'Pacientes' }} />
        <Stack.Screen name="CadastroEdicaoPaciente" component={CadastroEdicaoPacienteScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
