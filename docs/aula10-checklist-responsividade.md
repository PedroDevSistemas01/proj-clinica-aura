# Aula 10 — Checklist de responsividade da interface e arguição

> Legenda: **[x]** implementado e conferido (testes no Node, medição no Node
> e bundle Android) · **[ ]** depende de demonstração no aparelho.
> O critério de hoje não é velocidade: é a interface continuar respondendo.

## A interface continua viva

- [x] A verificação roda sobre volume real: `npm run gerar-consultas` grava 3000 (até 5000) no `db_clinica.json`, ou "Gerar 3000" na própria tela.
- [x] A barra de progresso avança aos poucos: teste `o progresso avança aos poucos` confere mais de 10 marcas antes de 100%.
- [ ] Durante o processamento, tocar em "Toques: N" aumenta o número. *(demonstrar no aparelho)*
- [ ] O indicador continua animando durante o cálculo fatiado e congela no ingênuo. *(demonstrar no aparelho)*
- [x] O botão Cancelar interrompe o laço de verdade: o Metro mostra `[processamento] laço interrompido no item X de Y`; coberto por teste.
- [x] Sair da tela cancela o trabalho: o retorno do `useEffect` do `useTarefaPesada` chama `cancelar()`.
- [x] Sem aviso de componente desmontado: ref `montado` no hook; só a execução mais recente atualiza o estado.

## Algoritmo e medição

- [x] A versão ingênua (`detectarConflitosIngenuo`) foi implementada e medida antes da otimização.
- [x] As medições estão no README (seção da Aula 10).
- [x] O algoritmo melhorado agrupa por médico (`Map`) e ordena por horário.
- [x] As versões encontram os mesmos conflitos: teste com 3000 consultas e aviso na tela ("As duas versões encontraram os mesmos conflitos").
- [x] Fatia testada com 100, 500 e 5000; escolha justificada no README (500).
- [ ] O Pull Request traz os números. *(a squad ainda não abriu PR; os números estão no README e na mensagem do commit)*

## Código

- [x] `src/services/processamento.js` com `cederAVez`, `processarEmFatias` e `criarSinalDeCancelamento`.
- [x] `cederAVez` usa `setTimeout(0)`; o porquê está no comentário e na arguição 3.
- [x] Hook `src/hooks/useTarefaPesada.js` embrulha progresso, resultado, erro e cancelamento.
- [x] A busca na API não foi fatiada: `await get('/consultas')` é espera, não trabalho.

## Uma correção que o teste pegou

Comparar cada consulta **só com a seguinte** perde conflitos quando as
durações variam: uma consulta de 60 min às 10:00 conflita com a de 10:00 e
também com a de 10:30, mas a de 10:30 não é a "seguinte" dela. O otimizado
continua comparando enquanto a próxima começa antes de a atual terminar. Com
a agenda ordenada isso quase sempre para na primeira ou segunda vizinha, e o
resultado fica idêntico ao ingênuo (teste `consulta longa que engole a
seguinte`).

## Arguição

**1. "Coloquei async/await e agora roda em outra thread." O que está errado?**
async/await não cria thread. A função continua na thread do JavaScript; o
await só libera a thread enquanto **espera** algo (rede, disco). Um laço de
CPU dentro de uma função async trava a tela do mesmo jeito.

**2. O fatiado demorou o mesmo que o bloqueante, às vezes mais. O que melhorou?**
A responsividade, não a velocidade. O tempo total até cresce (cada
`setTimeout` custa um ciclo do laço de eventos), mas a tela desenha e
responde a toques entre as fatias, e o usuário pode cancelar.

**3. Por que setTimeout funciona e Promise.resolve() não?**
`Promise.resolve()` agenda uma microtarefa, e a fila de microtarefas é
esvaziada inteira antes de o motor voltar ao laço de eventos: a tela não
ganha a vez. `setTimeout(0)` agenda uma macrotarefa; entre duas, o React
Native processa toques e desenha.

**4. Fatia 10 vezes maior? 10 vezes menor?**
Com 5000 (10 × 500), cada médico vira uma fatia só: o maior bloqueio volta a
crescer com o volume e, com uma agenda maior ou cálculo mais pesado, a tela
volta a travar. Com 50 (10 × menor), são centenas de `setTimeout`: no Node
do Windows cada um custa ~15 ms, e só a fatia de 100 já levou o total de
~156 ms para ~530 ms. Tempo desperdiçado esperando o relógio.

**5. Essa verificação deveria rodar no celular?**
Não, em produção: ver `docs/decisoes/006-verificacao-de-conflitos.md`. O
servidor recusa o conflito na gravação, o que nenhum celular consegue
garantir quando dois aparelhos agendam ao mesmo tempo.

## A ordem certa das perguntas

1. Precisa acontecer no aparelho? (ADR 006: em produção, não.)
2. Dá para fazer menos? (Filtrar por médico e período na API.)
3. Dá para fazer melhor? (Passo 3: de 4,5 milhões para ~4,5 mil comparações.)
4. Só então: como não monopolizar a thread? (Passo 4: fatias.)

## Comparação entre squads

| Squad | Nº de consultas | Tempo ingênuo | Tempo otimizado | Tamanho da fatia |
| --- | --- | --- | --- | --- |
| proj-clinica-aura (Node, PC) | 3000 | 469 ms | 5 ms | 500 |
| proj-clinica-aura (aparelho) | 3000 | *a medir* | *a medir* | 500 |
