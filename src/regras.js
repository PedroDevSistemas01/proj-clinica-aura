// src/regras.js
// Regras de negócio puras (Aula 14, Passo 2, itens 9 e 10).
//
// Estavam dentro dos componentes (LoginScreen, MedicoForm, PacienteForm,
// AgendarConsulta). Aqui ficam testáveis em milissegundos, sem tela, rede ou
// disco: mesma entrada, mesma saída. Cada função devolve null quando está
// tudo certo, ou a mensagem que a tela mostra.

export const SENHA_MINIMA = 6;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarLogin(email, senha) {
  const e = (email ?? '').trim();
  if (!e || !senha) return 'Preencha e-mail e senha.';
  if (!EMAIL.test(e)) return 'Informe um e-mail válido.';
  if (senha.length < SENHA_MINIMA) return `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.`;
  return null;
}

export function validarMedico(dados) {
  if (!dados?.nome?.trim() || !dados?.crm?.trim()) return 'Preencha ao menos o nome e o CRM.';
  return null;
}

export function validarPaciente(dados) {
  if (!dados?.nome?.trim() || !dados?.cpf?.trim()) return 'Preencha ao menos o nome e o CPF.';
  return null;
}

// dataHora: Date (ou null se a data digitada for inválida).
export function validarAgendamento({ pacienteId, medicoId, dataHora }, agora = Date.now()) {
  if (!pacienteId || !medicoId) return 'Escolha o paciente e o médico.';
  if (!dataHora) return 'Use o formato DD/MM/AAAA e a hora HH:MM.';
  if (dataHora.getTime() <= agora) return 'A consulta precisa ser em um horário futuro.';
  return null;
}
