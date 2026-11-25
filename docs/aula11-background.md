# Aula 11 — Sincronização em segundo plano: entregável, decisões e ética

> O PDF da Aula 11 recebido traz os slides (sem checklist de fechamento).
> Este documento segue o "Entregável de hoje" e os cuidados dos slides.
> Legenda: **[x]** implementado e conferido no código e no bundle Android ·
> **[ ]** depende de development build ou aparelho.

## Entregável

- [x] `src/services/sincronizacao.js` com `sincronizarAgenda(origem)`, sem `useState`, `Alert` ou navegação: funciona com e sem tela. Reaproveita `api.js` (Aula 4), `detectarConflitos` (Aula 10) e `sincronizarLembretes` (Aula 8).
- [x] Sincronização ao voltar para o app: `src/hooks/useSincronizacao.js` compara o estado **antes e depois** do `AppState` e respeita o intervalo mínimo de 15 min (`precisaSincronizar`). Roda no Expo Go.
- [x] Tela mostrando a última sincronização e o que ela encontrou: Menu → **Sincronização** ("há 12 min", origem, consultas, conflitos, lembretes ajustados e histórico).
- [x] Tarefa periódica registrada para quem tiver development build: `src/services/tarefaBackground.js`, `defineTask` no escopo do módulo do `App.js`, `isTaskRegisteredAsync` antes de registrar.
- [ ] Ver a tarefa rodar sozinha num aparelho com development build (`BACKGROUND_REAL = true`). *(a primeira execução espontânea pode demorar horas)*

## Três portas, uma função só

| Porta | Quem chama | Intervalo mínimo |
| --- | --- | --- |
| `manual` | Botão "Sincronizar agora" e puxar para atualizar | **Não** se aplica: o usuário pediu |
| `voltou ao app` | `useSincronizacao` (Menu e tela de Sincronização) | 15 min desde a última bem-sucedida |
| `background` | Tarefa periódica do sistema | O sistema decide (`minimumInterval` é um pedido) |

Duas portas disparando juntas compartilham a mesma execução (`emAndamento`),
em vez de baixar a agenda duas vezes.

## Decisões

- **SDK 51 → `expo-background-fetch`.** O `expo-background-task` dos slides só existe a partir do SDK 53. Usamos o antecessor, com a mesma ideia; no `background-fetch` o `minimumInterval` é em **segundos** (15 × 60), no `background-task` é em minutos. A troca fica no PENDENCIAS.md para quando o projeto subir de SDK.
- **`BACKGROUND_REAL = false` por padrão.** Mesmo padrão do `MODO_SIMULADO` da Aula 7: as bibliotecas só são carregadas quando ele é `true`, e o Expo Go não quebra. A tela diz por que a tarefa não está disponível.
- **Orçamento curto:** em background o cálculo é cancelado aos 20 s (o sistema dá ~30 s). O registro grava "tempo esgotado" e a tarefa devolve `Failed`, sem deixar exceção escapar.
- **A tarefa também limpa lembretes:** `sincronizarLembretes` roda dentro da sincronização (só com permissão já concedida, porque em background não há tela para pedir). É o que faltava na Aula 9: lembrete de consulta cancelada pela recepção sai do aparelho mesmo sem o paciente abrir o app, quando o sistema executar a tarefa.
- **Sem sessão, nada roda:** sem token no cofre a sincronização só registra "sem sessão". No logout a tarefa é desregistrada.
- **Depuração:** o histórico em disco (`clinica.sincronizacao.historico`) guarda data, origem, duração e resultado, limitado a 20 entradas.

## Ética e expectativa

- A tela **não** promete "atualizado a cada 15 minutos". Ela mostra "Última atualização: há N min" e deixa puxar para atualizar.
- O usuário pode **desligar** a sincronização em segundo plano (chave na tela; a tarefa é desregistrada).
- Baixa só a coleção de consultas; em produção, filtrar por período (rede móvel custa dinheiro).
- Texto e dados não saem do aparelho além do que o app já mostra; nada é logado no console.

## Como testar

**Expo Go (sem build):**
1. Entre no app, abra Menu → Sincronização e toque em "Sincronizar agora": aparece "agora há pouco · manual" com consultas e conflitos.
2. Mande o app para o fundo e volte: nada novo no histórico (intervalo de 15 min).
3. Para ver a porta "voltou ao app", troque `INTERVALO_MINIMO_MINUTOS` para `0` em `sincronizacao.js`, saia e volte. Desfaça depois.
4. "Teste: rodar o código da tarefa agora" executa o mesmo corpo da tarefa, com orçamento de background.

**Development build:**
1. `BACKGROUND_REAL = true` em `src/services/tarefaBackground.js` e gere o build (`npx expo run:android`).
2. A tela deve dizer "Tarefa registrada no sistema".
3. Para não esperar a janela do sistema no Android, dá para forçar o job pelo `adb shell cmd jobscheduler` (o id do job varia; conferir na documentação do expo-background-fetch). Ou deixar o aparelho carregando, com Wi-Fi, e ter paciência.
4. Confira o histórico: uma entrada com origem `background`.
