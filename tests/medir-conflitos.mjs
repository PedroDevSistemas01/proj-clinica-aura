// Medição da verificação de conflitos no Node (Aula 10, Passos 2, 3 e 4).
// Rodar com: npm run medir   (opcional: npm run medir -- 5000)
//
// Mede o tempo total e, no modo fatiado, o MAIOR bloqueio contínuo da thread
// (o tempo mais longo sem ceder a vez). É esse segundo número que diz se a
// interface congela: acima de ~16 ms a tela perde quadros; acima de ~100 ms o
// toque já parece ignorado.
import {
  detectarConflitos,
  detectarConflitosIngenuo,
  detectarConflitosOtimizado,
  gerarConsultasDeTeste,
} from '../src/services/conflitos.js';

const n = Number(process.argv[2] || 3000);
const consultas = gerarConsultasDeTeste(n);

let t = Date.now();
const ingenuo = detectarConflitosIngenuo(consultas);
const tIngenuo = Date.now() - t;

t = Date.now();
const otimizado = detectarConflitosOtimizado(consultas);
const tOtimizado = Date.now() - t;

const iguais = JSON.stringify(ingenuo.conflitos) === JSON.stringify(otimizado.conflitos);
console.log(`${n} consultas, ${ingenuo.conflitos.length} conflitos (versões iguais: ${iguais})`);
console.log(`ingênuo:   ${tIngenuo} ms, ${ingenuo.comparacoes} comparações (bloqueia tudo)`);
console.log(`otimizado: ${tOtimizado} ms, ${otimizado.comparacoes} comparações`);

for (const tamanhoFatia of [100, 500, 5000]) {
  let maiorBloqueio = 0;
  let ultimo = performance.now();
  let fatias = 0;
  const inicio = performance.now();
  await detectarConflitos(consultas, {
    tamanhoFatia,
    aoProgredir: () => {
      const agora = performance.now();
      maiorBloqueio = Math.max(maiorBloqueio, agora - ultimo);
      fatias += 1;
      // o próximo trecho começa depois do setTimeout(0)
      setTimeout(() => { ultimo = performance.now(); }, 0);
    },
  });
  const total = performance.now() - inicio;
  console.log(
    `fatiado ${String(tamanhoFatia).padStart(4)}: ${total.toFixed(1)} ms no total, ${fatias} fatias, maior bloqueio ${maiorBloqueio.toFixed(2)} ms`
  );
}
