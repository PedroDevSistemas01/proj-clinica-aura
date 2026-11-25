// src/services/viacep.js
// Consulta de CEP no ViaCEP (Aula 5, Trilha A). Decisão: docs/decisoes/001.
//
// A tela nunca vê o formato do ViaCEP: consultarCep() devolve um objeto no
// NOSSO vocabulário (localidade -> cidade). Trocar de fornecedor (ex.:
// BrasilAPI, o plano B) significa reescrever só este arquivo.

import { buscarExterno } from './httpExterno';

const NOME_SERVICO = 'ViaCEP';

// Deixa só os dígitos: aceita "13560-042", "13560042" ou "13.560-042".
export function somenteDigitosCep(cep) {
  return String(cep ?? '').replace(/\D/g, '');
}

// Validação local ANTES de qualquer requisição: economiza uma viagem à rede
// e uma unidade de cota de um serviço que não é nosso.
export function cepValido(cep) {
  return /^\d{8}$/.test(somenteDigitosCep(cep));
}

// Devolve { cep, logradouro, bairro, cidade, uf } ou null quando o CEP não
// existe. Lança Error para CEP mal formado e ServicoExternoIndisponivel
// (vindo do httpExterno) quando o serviço falha.
export async function consultarCep(cep) {
  const digitos = somenteDigitosCep(cep);

  if (!cepValido(digitos)) {
    throw new Error('O CEP deve ter 8 dígitos.');
  }

  // Os casos "não respondeu", "não é JSON" e "erro HTTP" já são tratados
  // pelo buscarExterno.
  const dados = await buscarExterno(
    NOME_SERVICO,
    `https://viacep.com.br/ws/${digitos}/json/`
  );

  // O caso traiçoeiro: 200 OK, resposta.ok true, e mesmo assim não há
  // endereço. Sucesso de transporte não é sucesso de negócio. O ViaCEP já
  // mandou `erro` como string "true" e como booleano true: aceitamos os dois.
  if (!dados || dados.erro === true || dados.erro === 'true') {
    return null;
  }

  // Tradução para o nosso vocabulário.
  return {
    cep: dados.cep ?? `${digitos.slice(0, 5)}-${digitos.slice(5)}`,
    logradouro: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    uf: dados.uf ?? '',
  };
}
