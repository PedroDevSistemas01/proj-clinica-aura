# Pendências do projeto (atualizado na Aula 13)

Lista única do que ficou em aberto até aqui. Cada item aponta onde está o detalhe.

## Precisa de aparelho físico ou development build

- [ ] **Bluetooth em modo real (Aula 7):** trocar `MODO_SIMULADO` para `false` em `src/services/bluetooth.js` e testar num development build (`npx expo run:android` ou EAS) com um medidor de frequência cardíaca de verdade. Detalhes: `docs/aula7-checklist-bluetooth.md`.
- [ ] **Lembrete local no aparelho (Aula 8):** com `ANTECEDENCIA_TESTE_MINUTOS = 1`, conferir o disparo com o app fechado, o toque com o app fechado abrindo a consulta e a lista de pendentes vazia depois de cancelar. Detalhes: `docs/aula8-checklist-notificacoes.md`.
- [ ] **Demonstrar a Aula 10 no aparelho:** indicador congelando no ingênuo e animando no fatiado, contador de toques subindo durante a verificação e as medições do celular na tabela de `docs/aula10-checklist-responsividade.md`.
- [ ] **Tarefa em background no aparelho (Aula 11):** `BACKGROUND_REAL = true` em `src/services/tarefaBackground.js`, development build e conferir no histórico uma entrada com origem `background`. A primeira execução espontânea pode demorar horas. Roteiro: `docs/aula11-background.md`.
- [ ] **Conferir câmera, biometria e GPS num celular (Aula 6):** os itens abertos estão em `docs/aula6-checklist-perifericos.md`.
- [ ] **Development build para push (Aula 9):** conta Expo/EAS (`eas init` preenche `extra.eas.projectId`), `android.package` no `app.json`, projeto Firebase com credencial FCM V1 (`eas credentials`) e um aparelho Android (ADR 004). O mesmo build serve ao Bluetooth real. Sem isso o código está pronto, mas nenhum push foi recebido de verdade: só o envio com token inventado foi conferido (`HTTP 200` + `DeviceNotRegistered`). Roteiro: `docs/aula9-checklist-push.md`.

## Precisa de conta, chave ou decisão da squad

- [ ] **Chave do Google Maps (Aula 12, até 22/10/2026):** conta Google Cloud com faturamento, chave restrita ao pacote do app, guardada no `.env` (ADR 003).
- [ ] **SMS no aparelho (Aula 13):** celular com chip para ver o app de mensagens abrir com o texto pronto. O envio pelo servidor usa um gateway **simulado**: nenhuma mensagem sai de verdade. Gateway real (Zenvia ou Twilio, ADR 005) só se a clínica quiser, com a chave no `.env` do servidor.
- [ ] **Percorrer o fluxo inteiro num aparelho (Aula 13):** a lista de `docs/aula13-problemas-fluxo.md` foi feita lendo o código e com `curl`, sem aparelho.
- [ ] **Dividir os responsáveis (Aula 13):** a matriz de consolidação tem todos os recursos com o mesmo responsável.
- [ ] **Mapa da Aula 12:** não implementado; o material da Aula 12 não foi recebido. Quebra a etapa 3 do fluxo do desafio.
- [x] ~~**Integração na `main`**~~: as Aulas 5 a 11 já estão na `main`. A Aula 11 entrou pelo PR #5 e levou junto as Aulas 8, 9 e 10, que estavam empilhadas nela.
- [ ] **Revisão cruzada da Aula 8:** conferir que nenhuma tela importa `expo-notifications`, que cancelar a consulta cancela o lembrete e que o texto não expõe dado sensível.
- [ ] **Nomes da squad:** o README e os ADRs ainda usam "Luiz" como responsável e têm placeholders de integrantes.

## Dívidas técnicas conscientes

- [ ] **Foto de perfil é só a URI do cache (Aula 6):** some se o sistema limpar o cache e não abre em outro aparelho. Solução: upload da imagem para o servidor.
- [ ] **Quem pode ver a foto do paciente:** hoje qualquer pessoa logada. Depende de perfis (recepção × médico) na API.
- [ ] **Coordenadas da clínica no código:** `src/config/clinica.js`. Viram marcador de mapa na Aula 12.
- [ ] **Sinais vitais fora da tela de consulta (Aula 7):** a tela de consulta passou a existir na Aula 8 (`DetalheConsulta`); falta levar a importação para lá.
- [ ] **Lembrete preso ao aparelho (Aula 8):** se a recepção cancela pelo sistema, o lembrete local dispara assim mesmo até o paciente abrir a lista de consultas (`sincronizarLembretes`). Resolve-se com push (Aula 9).
- [ ] **Token ligado ao usuário, não ao paciente (Aula 9):** o app é usado pela equipe (recepção/médico), então `lembretes-do-dia` avisa todo aparelho registrado. Com login de paciente na API, filtrar por paciente.
- [ ] **Recibos lidos na hora (Aula 9):** o script espera 15 s; em produção os recibos devem ser lidos mais tarde, por uma tarefa agendada no servidor.
- [ ] **Lembrete local com o app fechado (Aula 9):** o push de cancelamento apaga o lembrete local só com o app aberto ou depois do toque; com o app fechado ele ainda pode disparar.
- [ ] **Verificação de conflitos no aparelho (Aula 10):** baixa a agenda inteira. A decisão é mover para o servidor quando houver API real (ADR 006); até lá, filtrar por médico/período na consulta.
- [x] ~~**Última verificação não fica guardada (Aula 10)**~~: resolvido na Aula 11. A tela de Sincronização abre com o último resultado gravado em disco. A tela de conflitos da Aula 10 continua sem ele.
- [ ] **Biblioteca de background do SDK 51 (Aula 11):** usamos `expo-background-fetch` porque o `expo-background-task` só existe no SDK 53+. Ao subir de SDK: trocar a biblioteca, mudar `minimumInterval` de segundos para minutos e usar o gatilho de teste dela. Atenção: no SDK 53+ o push deixa de funcionar no Expo Go no Android.
- [ ] **Sincronização baixa tudo (Aula 11):** `GET /consultas` inteiro a cada execução. Em rede móvel isso custa ao usuário; filtrar por período quando a API permitir.
- [ ] **Abrir o app não sincroniza (Aula 13, P2):** a sincronização só dispara ao voltar do segundo plano, não na abertura a frio.
- [ ] **Sessão meio viva (Aula 13, P3):** sessões da API de autenticação ficam em memória; reiniciá-la deixa o token velho valendo no json-server e só o SMS devolve ao login.
- [ ] **SMS de cancelamento com dados do app (Aula 13, P4):** como a consulta já foi apagada, o app manda `pacienteId` e `dataHora`; o número vem do cadastro. Com API real, o cancelamento deveria ser lógico (status) e o servidor enviaria sozinho.
- [ ] **Status do SMS não volta para o app (Aula 13):** o app mostra "enfileirado"; consultar `GET /mensagens/:id` do gateway pela nossa API ficaria para uma próxima versão.
- [ ] **Antecedência fixa (Aula 8):** 1 hora para todos. Extensões não feitas: paciente escolher (1 hora / 1 dia) e segundo lembrete na véspera.
- [ ] **Data digitada à mão (Aula 8):** o agendamento usa campos DD/MM/AAAA e HH:MM; um seletor de data nativo exigiria mais uma biblioteca.
- [ ] **Biometria ativa para todos:** oferecer como opção nos ajustes do app (extensão da Aula 6).
- [ ] **Extensões de Bluetooth:** nível de bateria do periférico (0x180F) e reconexão automática com limite de tentativas.
- [ ] **API real com HTTPS:** o mock local continua em HTTP (Aula 4).
