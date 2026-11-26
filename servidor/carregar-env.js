// carregar-env.js - le o .env da raiz do projeto para os servidores Node.
//
// O Expo carrega o .env sozinho para o app; os servidores (auth-api,
// gateway, enviar-push) nao. Este arquivo faz o minimo: KEY=VALOR por linha,
// ignora comentarios e linhas vazias e NUNCA sobrescreve uma variavel que ja
// veio do terminal ($env:NOME = "..." no PowerShell continua valendo mais).
// Sem dependencias: nao precisa de npm install.

const fs = require('fs');
const path = require('path');

function carregarEnv(arquivo = path.join(__dirname, '..', '.env')) {
  let texto;
  try {
    texto = fs.readFileSync(arquivo, 'utf8');
  } catch (e) {
    return 0; // sem .env: tudo segue com os padroes de laboratorio
  }
  let carregadas = 0;
  for (const linha of texto.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linha);
    if (!m) continue;
    let valor = m[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (valor === '' || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = valor;
    carregadas += 1;
  }
  return carregadas;
}

module.exports = { carregarEnv };
