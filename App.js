import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Componente raiz do projeto da squad.
// Sistema de agendamento de consultas para clínica médica.
// A partir daqui serão adicionadas as telas de Login,
// Cadastro de Paciente e Cadastro de Médico (navegação com
// React Navigation nas próximas aulas).
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clínica App</Text>
      <Text style={styles.subtitle}>Projeto Expo inicializado — Aula 1</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});
