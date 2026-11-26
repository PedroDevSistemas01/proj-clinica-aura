# Aula 14 — Relatório de bugs

> O modelo `A14_06_Relatorio_de_Bugs.docx` não veio no material recebido.
> Cada item tem passos de reprodução: um bug sem eles é um boato.
> Situação: **corrigido** (com teste que impede a volta) · **aberto** ·
> **dívida** (de arquitetura, registrada como achado).

| # | Bug | Passos para reproduzir | Situação | Teste |
| --- | --- | --- | --- | --- |
| B1 | Abrir o app do zero não sincronizava a agenda (problema P2 da Aula 13) | Fechar o app por completo, abrir: Sincronização mostrava a data antiga | **corrigido**: o hook também sincroniza ao montar, respeitando os 15 min | `useSincronizacao.test.js` |
| B2 | O login mandava à rede e-mail sem `@` e senha de 1 caractere | E-mail `ana`, senha `1`, Entrar: a requisição saía e voltava 401 | **corrigido**: `validarLogin` em `src/regras.js` barra antes da rede | `regras.test.js`, `LoginScreen.test.js` |
| B3 | Erro do agendamento só aparecia num `Alert`, sem nada na tela | Agendar sem escolher o médico | **corrigido**: mensagem com `testID="mensagem-erro"` na tela | `AgendarConsulta.test.js` |
| B4 | A confirmação do agendamento não mostrava o resumo do que foi gravado | Agendar uma consulta | **corrigido**: o aviso traz paciente, médico, data, hora e duração | `AgendarConsulta.test.js`, `App.test.js` |
| B5 | Sessão "meio viva" depois de reiniciar a API de autenticação (P3 da Aula 13) | Entrar, reiniciar `npm run auth-api`, destrancar com biometria, enviar SMS pela clínica | **aberto** na API (sessões em memória); o app trata o 401 e volta ao login | `EnviarSms.test.js` |
| B6 | `FotoPerfil` chama o `expo-image-picker` direto | — | **dívida**: o teste precisa mockar a biblioteca, não um service nosso | `MedicoForm.test.js` |
| B7 | `LoginBiometrico` chama o `expo-local-authentication` direto | — | **dívida**: mesma situação do B6 | `LoginBiometrico.test.js` |
| B8 | Avisos `not wrapped in act(...)` no console ao rodar `npm test` (animação do `TouchableOpacity` e carga das listas) | `npm test` | **aberto**: não falham os testes; somem com a Testing Library 14 ou envolvendo as animações | — |
| B9 | Testes dependiam da ordem: o mock de permissão negada vazava para o teste seguinte | Rodar `AgendarConsulta.test.js` inteiro | **corrigido** no teste: cada um redefine o mock no `beforeEach` | `AgendarConsulta.test.js` |

## Itens da lista da Aula 13 que não viraram teste

| Problema | Por quê |
| --- | --- |
| P1 — não há mapa | A funcionalidade não existe (Aula 12 não implementada) |
| P5 — foto é só a URI do cache | Dívida de servidor (upload), não de código do app |
| P6 — sinais vitais fora da consulta | Mudança de fluxo, não bug |
| P7 — push de cancelamento não sai sozinho | Depende de servidor real que envie ao cancelar |
