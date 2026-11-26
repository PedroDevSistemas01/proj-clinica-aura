// Unidade — validações de formulário (Aula 14, Passo 3, item 12).
import { validarAgendamento, validarLogin, validarMedico, validarPaciente } from './regras';

describe('validarLogin', () => {
  it('recusa e-mail ou senha vazios', () => {
    expect(validarLogin('', 'clinica123')).toBe('Preencha e-mail e senha.');
    expect(validarLogin('ana@clinica.com', '')).toBe('Preencha e-mail e senha.');
  });

  it('recusa campo só com espaços', () => {
    expect(validarLogin('   ', 'clinica123')).toBe('Preencha e-mail e senha.');
  });

  it('recusa e-mail sem arroba', () => {
    expect(validarLogin('ana.clinica.com', 'clinica123')).toBe('Informe um e-mail válido.');
  });

  it('recusa senha com 5 caracteres', () => {
    expect(validarLogin('ana@clinica.com', '12345')).toContain('6 caracteres');
  });

  it('aceita senha com exatamente 6 caracteres', () => {
    expect(validarLogin('ana@clinica.com', '123456')).toBeNull();
  });
});

describe('validarMedico e validarPaciente', () => {
  it('exigem nome e CRM no médico', () => {
    expect(validarMedico({ nome: 'Ana', crm: '' })).toMatch(/CRM/);
    expect(validarMedico({ nome: 'Ana', crm: 'CRM-SP 1' })).toBeNull();
  });

  it('exigem nome e CPF no paciente, sem aceitar só espaços', () => {
    expect(validarPaciente({ nome: '  ', cpf: '123' })).toMatch(/CPF/);
    expect(validarPaciente({ nome: 'Helena', cpf: '123.456.789-00' })).toBeNull();
  });
});

describe('validarAgendamento', () => {
  const agora = new Date(2026, 10, 25, 10, 0).getTime();

  it('barra o agendamento sem paciente ou sem médico', () => {
    expect(validarAgendamento({ pacienteId: null, medicoId: '1', dataHora: new Date(agora + 1) }, agora)).toBe(
      'Escolha o paciente e o médico.'
    );
  });

  it('barra data inválida', () => {
    expect(validarAgendamento({ pacienteId: '1', medicoId: '1', dataHora: null }, agora)).toMatch(/DD\/MM/);
  });

  it('barra horário exatamente igual a agora (não é futuro)', () => {
    expect(validarAgendamento({ pacienteId: '1', medicoId: '1', dataHora: new Date(agora) }, agora)).toMatch(
      /futuro/
    );
  });

  it('aceita um horário um minuto no futuro', () => {
    expect(
      validarAgendamento({ pacienteId: '1', medicoId: '1', dataHora: new Date(agora + 60000) }, agora)
    ).toBeNull();
  });
});
