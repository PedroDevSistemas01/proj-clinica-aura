# Aula 14 — Plano de testes

> O modelo `A14_05_Plano_de_Testes.docx` não veio no material recebido; este
> plano segue o que o roteiro pede no Passo 1 (fluxos críticos e a pirâmide)
> e entra na documentação técnica da Aula 15.

## Como rodar

```bash
npm test                 # unidade e integração (Jest + Testing Library)
npm test -- regras       # só os arquivos cujo caminho contém "regras"
npm test -- -t fronteira # só os testes cujo nome contém "fronteira"
npm run test:coverage    # cobertura em coverage/
```

Não precisa de emulador, aparelho, servidor nem internet. Resultado atual:
**17 arquivos, 86 testes, todos passando** (~25 s com o cache frio).

## Ferramentas e uma decisão de versão

- `jest-expo ~51` e `jest 29`, instalados com `npx expo install` (versão casada com o SDK 51).
- `@testing-library/react-native` **13.3** em vez da 14 do material: a 14 exige React 19 e React Native 0.78, e o projeto está no SDK 51 (React 18.2). A 13.3 já traz `renderAsync` e `fireEventAsync`; o `src/test-utils.js` as exporta como `render` e `fireEvent`. Os testes ficam escritos como na 14 (tudo com `await`) e não mudam quando o projeto subir de SDK.
- Teto de espera do `findBy`/`waitFor` subido para 5000 ms (`jest.afterEnv.js`). Teto, não pausa: com vários arquivos em paralelo, o primeiro teste de cada arquivo estourava o padrão de 1000 ms sem bug nenhum.
- Dublês comuns em `jest.setup.js` (AsyncStorage, cofre, notificações, expo-device) e em `src/test-utils.js` (API falsa em memória, API fora do ar, `entrar()`).

## Fluxos críticos

| # | Fluxo | Por que é crítico | Onde está o teste |
| --- | --- | --- | --- |
| 1 | Login | Porta de entrada; sem ele nada funciona | `LoginScreen.test.js`, `App.test.js` |
| 2 | Agendamento | É o objetivo do app | `AgendarConsulta.test.js`, `App.test.js` |
| 3 | Cancelamento | "A consulta cancelada que continua avisando" é o bug mais comum do semestre | `Consultas.test.js` |
| 4 | Lembrete da consulta | Precisa acompanhar agendar/remarcar/cancelar | `AgendarConsulta.test.js`, `Consultas.test.js` |
| 5 | SMS | Custa dinheiro e não se desfaz | `EnviarSms.test.js`, `regrasSms.test.js` |

## A pirâmide

| Degrau | Arquivos | O que pega |
| --- | --- | --- |
| **Unidade** (ms, sem tela) | `regras.test.js`, `conflitos.test.js`, `regrasSms.test.js`, `localizacao.test.js`, `dataHora.test.js`, `frequenciaCardiaca.test.js` | Fronteiras: senha com exatamente 6 caracteres passa, 5 não; consultas que se **encostam** (09:00–09:30 e 09:30–10:00) não conflitam; 160 caracteres = 1 SMS, 161 = 2; 70 com acento; número com e sem DDI, com máscara e inválido; 1 grau de latitude = 111,19 km |
| **Integração** (s, tela em memória) | `ComoChegar`, `MedicoForm`, `LoginBiometrico`, `SinaisVitais`, `AgendarConsulta`, `Consultas`, `Paciente`, `LoginScreen`, `EnviarSms`, `useSincronizacao`, `App` | Cenários de falha dos periféricos e os três fluxos críticos, com o erro antes do caminho feliz |
| **E2E** (min, aparelho) | — | Não feito (fica como conceito, como diz a aula). O README modelo cita Maestro; não há `.maestro/` no projeto |

Prova de que a fronteira está coberta: trocando `<` por `<=` em `conflita()`,
o teste "não conflita quando uma termina onde a outra começa" falha
(conferido; a alteração foi desfeita).

## Cenários de falha dos periféricos (Passo 4)

| Periférico | Dublê | O que o teste confere |
| --- | --- | --- |
| GPS negado | `services/localizacao` → `PermissaoNegada` | Mensagem, botão para os ajustes (quando bloqueado) **e** o endereço da clínica continua na tela |
| Câmera cancelada | `expo-image-picker` → `{ canceled: true }` | O formulário não quebra e o cadastro sai com `fotoUri: null` |
| Biometria sem sensor | `expo-local-authentication` → `hasHardwareAsync: false` | O botão de biometria não aparece; "Entrar com e-mail e senha" continua visível |
| Bluetooth sem aparelhos | service BLE com `procurar` vazio | A tela diz o que fazer ("Ligue o medidor...") e oferece procurar de novo e digitar à mão |
| Bluetooth instável | service BLE que emite uma leitura e para | Depois de 6 s (relógio falso) o valor deixa de ser "Ao vivo", aparece o aviso e "Reconectar" |
| Notificação sem permissão | `expo-notifications` → `granted: false, canAskAgain: false` | Avisa que não haverá lembrete, não promete o aviso e não agenda nada; a consulta é gravada |
| API fora do ar | `global.fetch` que rejeita | Erro na tela, "Tentar novamente" funciona, nada fica preso em "Carregando" |

## O que a suíte NÃO cobre, e por quê

- **Hardware de verdade:** câmera, GPS, biometria, Bluetooth, notificação disparando com o app fechado, push e SMS pelo aparelho. Os testes trocam o periférico por um dublê; o comportamento real só se confere no aparelho (checklists das Aulas 6 a 13).
- **Servidores:** `auth-api.js`, `gateway-sms.js` e `enviar-push.js` não têm testes automatizados; foram conferidos com `curl` e com execução real (Aulas 9 e 13).
- **Tarefa em background:** o sistema operacional decide quando roda; não há como simular isso no Jest.
- **End-to-end:** não há Maestro/Detox no projeto.
- **Navegação pelo toque na notificação com o app fechado** (Aula 8): depende do sistema abrir o app.
