# Aula 9 — Push notifications: o que foi feito, o que falta e ética

> O PDF da Aula 9 recebido traz os slides (sem o checklist de fechamento).
> Este documento segue o "Entregável de hoje" e as falhas dos slides.
> Legenda: **[x]** implementado e conferido · **[ ]** depende de development
> build, aparelho físico ou conta.

## Entregável

- [x] `src/services/push.js` obtém o token (`getExpoPushTokenAsync` com `projectId`) e registra o dispositivo na API da clínica (`/dispositivos`), vinculado ao usuário logado (`usuarioId`, guardado no login em `sessao.js`).
- [x] Registro a cada abertura do app (`Menu` → `registrarDispositivo()`), tratado como atualização: mesmo token → mesmo registro (`GET ?token=` e `PUT`, senão `POST`).
- [x] Não quebra quando o push está indisponível: emulador (`Device.isDevice`), sem permissão, sem `projectId` ou Expo Go devolvem um motivo, mostrado no rodapé do Menu ("Avisos da clínica indisponíveis: ... O lembrete local continua valendo.").
- [x] Toque no push leva à consulta, inclusive com o app fechado: os mesmos caminhos A e B da Aula 8, porque o servidor manda `data: { consultaId, tela }`.
- [x] Envio disparado do terminal: `servidor/enviar-push.js` (`teste`, `cancelamento`, `lembretes-do-dia`).
- [ ] Teste em aparelho físico com development build. *(precisa de conta EAS, projectId e credencial FCM)*

## O problema da Aula 8, resolvido pelo servidor

`node servidor/enviar-push.js cancelamento <consultaId>` faz o que a recepção
faria: apaga a consulta **na API** e avisa o aparelho
(`tipo: 'consulta-cancelada'`). No app:

- com o app aberto, o listener de recebida (`ouvirPushRecebido`) cancela o lembrete local daquela consulta;
- ao tocar, a `DetalheConsulta` recebe 404, explica que a consulta não existe mais e também cancela o lembrete local;
- ao abrir a lista, `sincronizarLembretes` (Aula 8) alinha o resto.

Limite honesto: com o app **fechado** e sem toque, o lembrete local ainda
pode disparar. Apagar um lembrete local em segundo plano exigiria uma tarefa
de notificação em background (ver Aula 11).

## Falhas tratadas no script de envio

| Falha (slides) | Como o script reage |
| --- | --- |
| HTTP 200 mente | Lê o `status` de **cada ticket**, não o HTTP. Conferido: token inventado → `HTTP 200` + `DeviceNotRegistered` |
| Aceito não é entregue | Guarda os ids e consulta `getReceipts` depois (`ESPERA_RECIBO_MS`) |
| Token velho no banco | `DeviceNotRegistered` no envio **ou** no recibo → `DELETE /dispositivos/:id` |
| Limite do serviço | Envio em lotes de 100 mensagens; recibos em lotes de 1000 |
| `channelId` diferente | O script manda `channelId: 'lembretes-consulta'`, o mesmo canal criado em `lembretes.js` |
| Sem permissão / emulador | O app não registra e mostra o motivo; nada é enviado para um token que não existe |

Execução real com token inventado (json-server de teste):

```
Consulta 2 cancelada na API.
Enviando 1 mensagem(ns) em 1 lote(s).
Lote de 1: HTTP 200 (isso NAO diz se deu certo)
Recusado no envio (DeviceNotRegistered) para ExponentPushToken[tokenInv...
  token removido do banco: ExponentPushToken[tokenInv...
0 de 1 aceitos para entrega (aceito != entregue).
```

## Ética

- **Ninguém pediu esta mensagem:** o script só envia lembrete de consulta e aviso de cancelamento. Nada de promoção.
- **Conteúdo:** os textos dizem só data e hora ("Sua consulta de 02/12 às 14:30 foi cancelada pela clínica"). Sem médico, especialidade ou nome.
- **O token é dado do paciente:** sai do servidor no logout (`desregistrarDispositivo`) e quando morre (`DeviceNotRegistered`). Nenhum log imprime o token inteiro.

## Como testar no aparelho (quando houver build)

1. `npm install -g eas-cli`, `eas login` e `eas init` (preenche `extra.eas.projectId` no `app.json`).
2. Definir `android.package` no `app.json`, criar o projeto Firebase e enviar a credencial FCM V1 com `eas credentials`.
3. `eas build --profile development --platform android` (ou `npx expo run:android`) e instalar no celular.
4. Subir `npm run api`, entrar no app e conferir no rodapé do Menu: "Avisos da clínica ativos".
5. Pegar o token em http://localhost:3000/dispositivos e rodar `node servidor/enviar-push.js teste <token>` com o app fechado. Tocar no aviso: abre a consulta.
6. `node servidor/enviar-push.js cancelamento 1` com o app aberto: o aviso aparece e "Lembretes pendentes" deixa de ter a consulta 1.
