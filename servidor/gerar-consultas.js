// gerar-consultas.js - volume para a Aula 10 (Passo 1)
//
// Sem volume nada trava, e a aula nao acontece. Este script grava de 2 mil a
// 5 mil consultas no db_clinica.json: medicoId de 1 a 10, dataHora espalhada
// por 30 dias, 30 ou 60 minutos e alguns horarios repetidos de proposito
// (senao nao ha conflito para encontrar).
//
//   node servidor/gerar-consultas.js          -> 3000 consultas
//   node servidor/gerar-consultas.js 5000     -> 5000 consultas
//   node servidor/gerar-consultas.js limpar   -> remove as geradas
//
// Pare o json-server antes (ele reescreve o arquivo) e suba de novo depois.
// As consultas geradas levam "gerada": true: o app nao agenda lembrete para
// elas, e o "limpar" tira so elas, sem tocar nas consultas de verdade.
// Nao commitem o db com as geradas: o repositorio fica com a base pequena.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ARQUIVO = path.join(__dirname, '..', 'db_clinica.json');

async function principal() {
  const arg = process.argv[2];
  const db = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  const reais = (db.consultas || []).filter((c) => !c.gerada);

  if (arg === 'limpar') {
    db.consultas = reais;
    fs.writeFileSync(ARQUIVO, JSON.stringify(db, null, 2) + '\n');
    console.log(`Consultas geradas removidas. Ficaram ${reais.length}.`);
    return;
  }

  const quantidade = Math.min(Math.max(Number(arg) || 3000, 2000), 5000);
  const { gerarConsultasDeTeste } = await import(
    pathToFileURL(path.join(__dirname, '..', 'src', 'services', 'conflitos.js')).href
  );
  const geradas = gerarConsultasDeTeste(quantidade);
  db.consultas = [...reais, ...geradas];
  fs.writeFileSync(ARQUIVO, JSON.stringify(db, null, 2) + '\n');
  console.log(`${geradas.length} consultas geradas (total ${db.consultas.length}).`);
  console.log('Suba o json-server e confira: http://localhost:3000/consultas');
}

principal().catch((e) => {
  console.log(`Falhou: ${e.message}`);
  process.exitCode = 1;
});
