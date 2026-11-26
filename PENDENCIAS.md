# Pendências do projeto (atualizado na Aula 12, 26/11/2026)

Lista única do que ficou em aberto até aqui. Cada item aponta onde está o detalhe.

## O que só o Luiz pode fazer (contas)

O código já recebe todas as chaves pelo `.env`. Passo a passo de cada conta em
`docs/CONTAS_E_CHAVES.md`; roteiro de teste no celular em `docs/TESTES_APARELHO.md`.

- [ ] **Conta Expo/EAS:** `eas login`, `eas init`, `EAS_PROJECT_ID` no `.env` e no `eas env`. Libera o development build (Bluetooth, background e push).
- [ ] **Firebase:** `google-services.json` na raiz (fora do Git) e chave FCM V1 em `eas credentials`. Libera o push no Android.
- [ ] **Google Cloud:** chave do Maps restrita ao pacote. O mapa já existe (Aula 12): sem a chave, ele fica cinza no build do Android.
- [ ] **Twilio ou Zenvia (opcional):** só se a clínica quiser SMS real. `SMS_PROVEDOR` + chaves no `.env` do servidor.
- [ ] **Primeiro `eas build --profile development --platform android`** e percorrer `docs/TESTES_APARELHO.md`, Parte E.

## Precisa de aparelho físico ou development build

- [ ] **Mapa com leitor de tela (Aula 12):** percorrer a tela Como chegar com TalkBack ou VoiceOver e anotar no README (seção "Mapa e chave do Google Maps") o que foi corrigido. É critério de aprovação da aula.
- [ ] **Mapa sem rede (Aula 12):** desligar Wi-Fi e dados, reabrir Como chegar e conferir que endereço, telefone e o botão Como chegar continuam úteis.
- [ ] **Como chegar no aparelho (Aula 12):** tocar no botão num celular físico e ver o app de mapas abrir na clínica (`geo:` no Android, `maps:` no iOS). Conferir também o efeito do delta e do `edgePadding`. Roteiro: `docs/aula12-mapa.md` e `docs/TESTES_APARELHO.md`, item 3.

- [ ] **Bluetooth em modo real (Aula 7):** `BLUETOOTH_REAL=1` no `.env` (antes era editar `MODO_SIMULADO` no código) e testar num development build (`npx expo run:android` ou EAS) com um medidor de frequência cardíaca de verdade. Detalhes: `docs/aula7-checklist-bluetooth.md`.
- [ ] **Lembrete local no aparelho (Aula 8):** com `LEMBRETE_TESTE_MINUTOS=1` no `.env`, conferir o disparo com o app fechado, o toque com o app fechado abrindo a consulta e a lista de pendentes vazia depois de cancelar. Detalhes: `docs/aula8-checklist-notificacoes.md`.
- [ ] **Demonstrar a Aula 10 no aparelho:** indicador congelando no ingênuo e animando no fatiado, contador de toques subindo durante a verificação e as medições do celular na tabela de `docs/aula10-checklist-responsividade.md`.
- [ ] **Tarefa em background no aparelho (Aula 11):** `BACKGROUND_REAL=1` no `.env`, development build e conferir no histórico uma entrada com origem `background`. A primeira execução espontânea pode demorar horas. Roteiro: `docs/aula11-background.md`.
- [ ] **Conferir câmera, biometria e GPS num celular (Aula 6):** os itens abertos estão em `docs/aula6-checklist-perifericos.md`.
- [ ] **Development build para push (Aula 9):** conta Expo/EAS (`eas init`; o `projectId` vai em `EAS_PROJECT_ID` no `.env`, lido pelo `app.config.js`), confirmar o `ANDROID_PACKAGE` (padrão `com.clinicaaura.app`), projeto Firebase (o `app.config.js` já lê o `google-services.json`; o `expo-dev-client` já está instalado) com credencial FCM V1 (`eas credentials`) e um aparelho Android (ADR 004). O mesmo build serve ao Bluetooth real. Sem isso o código está pronto, mas nenhum push foi recebido de verdade: só o envio com token inventado foi conferido (`HTTP 200` + `DeviceNotRegistered`). Roteiro: `docs/aula9-checklist-push.md`.

## Precisa de conta, chave ou decisão da squad

- [ ] **Chave do Google Maps (Aula 12):** conta Google Cloud com faturamento, chave restrita ao pacote do app, `GOOGLE_MAPS_API_KEY` no `.env` e no `eas env` (ADR 003), e um build novo do Android para conferir que o mapa não fica cinza. Responsável: Luiz. Passo a passo: `docs/CONTAS_E_CHAVES.md`, seção 3.
- [ ] **SMS no aparelho (Aula 13):** celular com chip para ver o app de mensagens abrir com o texto pronto. O envio pelo servidor usa um gateway **simulado**: nenhuma mensagem sai de verdade. O envio real já está integrado como opção (`SMS_PROVEDOR=twilio` ou `zenvia`, `servidor/provedores-sms.js`), mas só foi testado com respostas simuladas: falta o primeiro envio real contra o provedor.
- [ ] **Percorrer o fluxo inteiro num aparelho (Aula 13):** a lista de `docs/aula13-problemas-fluxo.md` foi feita lendo o código e com `curl`, sem aparelho.
- [ ] **Dividir os responsáveis (Aula 13):** a matriz de consolidação tem todos os recursos com o mesmo responsável.
- [x] ~~**Mapa da Aula 12**~~: feito na branch `feat/aula12-mapas` (`src/screens/Clinica/MapaClinica.js`). Resolve a etapa 3 do fluxo do desafio (P1).
- [x] ~~**Integração na `main`**~~: as Aulas 5 a 15 estão na `main` (PRs #5, #6, #8 e #9), com o fechamento do projeto por cima.
- [ ] **Revisão cruzada da Aula 8:** conferir que nenhuma tela importa `expo-notifications`, que cancelar a consulta cancela o lembrete e que o texto não expõe dado sensível.
- [ ] **Nomes da squad:** o README e os ADRs ainda usam "Luiz" como responsável e têm placeholders de integrantes.

## Build e documentação (Aula 15)

- [ ] **Nenhum build gerado ainda:** `eas.json` tem os perfis `development`, `preview` e `production` (com `autoIncrement` e `appVersionSource: remote`), mas falta a conta EAS para rodar `eas build`. Para a Aula 16, o perfil `preview` gera um APK que instala direto.
- [ ] **Roteiro da Aula 15 não recebido:** só vieram o modelo de README técnico (A15_03) e o gabarito dos exercícios (A15_10). O README técnico, o manual de uso (`docs/manual-de-uso.md`), o `app.config.js` e o `eas.json` seguem esses dois.
- [ ] **API real em produção:** o endereço já é configurável (`API_URL` e `AUTH_API_URL` no `.env`/`eas env`), mas só existem os mocks locais em HTTP. Falta uma API hospedada com HTTPS.
- [ ] **Equipe no README:** dois integrantes ainda são placeholders.

## Dívidas técnicas conscientes

- [x] ~~**Foto de perfil no cache (Aula 6)**~~: resolvido no fechamento. A foto é copiada para o `documentDirectory` (`src/services/fotos.js`) e sobrevive à limpeza de cache.
- [ ] **Foto só neste aparelho:** não abre em outro celular. Solução: upload da imagem para o servidor.
- [ ] **Fotos órfãs:** trocar ou remover a foto deixa o arquivo antigo na pasta. `apagarFoto` existe; falta os formulários chamarem depois de salvar.
- [ ] **Cadastros antigos com URI do cache:** não são migrados; a foto antiga pode sumir até ser tirada de novo.
- [ ] **Quem pode ver a foto do paciente:** hoje qualquer pessoa logada. Depende de perfis (recepção × médico) na API.
- [x] ~~**Coordenadas da clínica no código**~~: resolvido no fechamento. `CLINICA_LATITUDE` e `CLINICA_LONGITUDE` no `.env`; sem elas, valem as de reserva de `src/config/clinica.js`. São o marcador do mapa desde a Aula 12.
- [ ] **Extensões da Aula 12 não feitas:** mapa com várias unidades (a clínica tem uma só e o `gabarito_MapaUnidades.js` não veio), medição de 200 marcadores com e sem `useMemo` (exige aparelho) e coordenadas vindas da API (a API mock não tem endpoint da clínica).
- [ ] **Material da Aula 12 incompleto:** o demo `A12_03` e os gabaritos `A12_06` não foram recebidos; a tela segue os exemplos dos slides.
- [ ] **Sinais vitais fora da tela de consulta (Aula 7):** a tela de consulta passou a existir na Aula 8 (`DetalheConsulta`); falta levar a importação para lá.
- [ ] **Lembrete preso ao aparelho (Aula 8):** se a recepção cancela pelo sistema, o lembrete local dispara assim mesmo até o paciente abrir a lista de consultas (`sincronizarLembretes`). Resolve-se com push (Aula 9).
- [ ] **Token ligado ao usuário, não ao paciente (Aula 9):** o app é usado pela equipe (recepção/médico), então `lembretes-do-dia` avisa todo aparelho registrado. Com login de paciente na API, filtrar por paciente.
- [ ] **Recibos lidos na hora (Aula 9):** o script espera 15 s; em produção os recibos devem ser lidos mais tarde, por uma tarefa agendada no servidor.
- [ ] **Lembrete local com o app fechado (Aula 9):** o push de cancelamento apaga o lembrete local só com o app aberto ou depois do toque; com o app fechado ele ainda pode disparar.
- [ ] **Verificação de conflitos no aparelho (Aula 10):** baixa a agenda inteira. A decisão é mover para o servidor quando houver API real (ADR 006); até lá, filtrar por médico/período na consulta.
- [x] ~~**Última verificação não fica guardada (Aula 10)**~~: resolvido na Aula 11. A tela de Sincronização abre com o último resultado gravado em disco. A tela de conflitos da Aula 10 continua sem ele.
- [ ] **Biblioteca de background do SDK 51 (Aula 11):** usamos `expo-background-fetch` porque o `expo-background-task` só existe no SDK 53+. Ao subir de SDK: trocar a biblioteca, mudar `minimumInterval` de segundos para minutos e usar o gatilho de teste dela. Atenção: no SDK 53+ o push deixa de funcionar no Expo Go no Android.
- [ ] **Sincronização baixa tudo (Aula 11):** `GET /consultas` inteiro a cada execução. Em rede móvel isso custa ao usuário; filtrar por período quando a API permitir.
- [x] ~~**Abrir o app não sincroniza (Aula 13, P2)**~~: corrigido na Aula 14, com teste (`useSincronizacao.test.js`).
- [ ] **Sessão meio viva (Aula 13, P3):** sessões da API de autenticação ficam em memória; reiniciá-la deixa o token velho valendo no json-server e só o SMS devolve ao login.
- [ ] **SMS de cancelamento com dados do app (Aula 13, P4):** como a consulta já foi apagada, o app manda `pacienteId` e `dataHora`; o número vem do cadastro. Com API real, o cancelamento deveria ser lógico (status) e o servidor enviaria sozinho.
- [ ] **Status do SMS não volta para o app (Aula 13):** o app mostra "enfileirado"; consultar `GET /mensagens/:id` do gateway pela nossa API ficaria para uma próxima versão.
- [ ] **Testing Library 13.3 no lugar da 14 (Aula 14):** a 14 exige React 19 (SDK 53+). Os testes já usam a forma assíncrona; ao subir de SDK, trocar o pacote e apagar os apelidos em `src/test-utils.js`.
- [ ] **Avisos `act(...)` no console do `npm test` (Aula 14, B8):** não derrubam testes, mas poluem a saída.
- [ ] **Periféricos chamados direto nas telas (Aula 14, B6 e B7):** `FotoPerfil` (expo-image-picker) e `LoginBiometrico` (expo-local-authentication) não têm service próprio; os testes mockam a biblioteca.
- [ ] **Poucos testes de servidor e nenhum E2E (Aula 14):** só `provedores-sms.js` tem teste (fechamento). `auth-api.js`, `gateway-sms.js` e `enviar-push.js` só foram conferidos com `curl`; não há Maestro/Detox.
- [ ] **Antecedência fixa (Aula 8):** 1 hora para todos. Extensões não feitas: paciente escolher (1 hora / 1 dia) e segundo lembrete na véspera.
- [ ] **Data digitada à mão (Aula 8):** o agendamento usa campos DD/MM/AAAA e HH:MM; um seletor de data nativo exigiria mais uma biblioteca.
- [ ] **Biometria ativa para todos:** oferecer como opção nos ajustes do app (extensão da Aula 6).
- [ ] **Extensões de Bluetooth:** nível de bateria do periférico (0x180F) e reconexão automática com limite de tentativas.
- [ ] **API real com HTTPS:** o mock local continua em HTTP (Aula 4).
