# Contas e chaves: o que você precisa criar

O código já está pronto para receber cada chave. O que falta é criar as contas,
que são pessoais (login, cartão, aceite de termos) e por isso ficam com você.
Cada chave entra **num lugar só**: o arquivo `.env` na raiz do projeto (modelo em
`.env.example`). O `.env` nunca vai para o Git.

```powershell
Copy-Item .env.example .env
```

| Conta | Para quê | Obrigatória? | Custo | Variáveis no `.env` |
|---|---|---|---|---|
| Expo / EAS | development build, push, APK | Sim, para BLE, background e push | Grátis (plano Free) | `EAS_PROJECT_ID`, `ANDROID_PACKAGE` |
| Firebase | entregar push no Android (FCM V1) | Só para push | Grátis | `GOOGLE_SERVICES_JSON` (arquivo) |
| Google Cloud | chave do Google Maps (Aula 12) | Só quando o mapa for feito | Exige cartão; uso de laboratório fica na cota grátis | `GOOGLE_MAPS_API_KEY` |
| Twilio **ou** Zenvia | SMS saindo de verdade pelo servidor | Não (o simulado cobre a aula) | Pago por mensagem | `SMS_PROVEDOR` + chaves do provedor |

> Ordem recomendada: **1 → 2** (já libera dev build e push). A 3 só quando a
> Aula 12 chegar. A 4 só se a clínica quiser SMS automático de verdade.

---

## 1. Expo / EAS (obrigatória para o development build)

1. Crie a conta em <https://expo.dev/signup>.
2. Instale a CLI e entre:
   ```powershell
   npm install -g eas-cli
   ```
   ```powershell
   eas login
   ```
3. Na pasta do projeto, crie o projeto no EAS:
   ```powershell
   eas init
   ```
   Como a configuração é um `app.config.js` (dinâmico), o `eas init` **não
   consegue escrever** o `projectId` sozinho. Ele mostra o valor (um UUID).
   Copie para o `.env`:
   ```
   EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
4. Confirme o identificador do app. O padrão é `com.clinicaaura.app`. Se
   preferir outro, defina `ANDROID_PACKAGE=` no `.env` **antes** do primeiro
   build: Firebase e Google Maps ficam presos a esse nome.
5. O `.env` **não sobe** para o build na nuvem (está no `.gitignore`). Cadastre
   as mesmas variáveis no EAS (o `projectId` não é segredo, pode ser `plaintext`):
   ```powershell
   eas env:create --name EAS_PROJECT_ID --value "SEU-UUID" --visibility plaintext --environment development --environment preview --environment production
   ```
   Confira com `eas env:list`.
6. Gere o primeiro build (roteiro completo em `docs/TESTES_APARELHO.md`):
   ```powershell
   eas build --profile development --platform android
   ```

## 2. Firebase (push no Android)

O Expo Push Service entrega no Android através do Firebase Cloud Messaging.

1. <https://console.firebase.google.com> → **Adicionar projeto** (pode recusar
   o Google Analytics).
2. No projeto: **Adicionar app → Android**. Nome do pacote: o mesmo do passo
   1.4 (`com.clinicaaura.app`). Baixe o **`google-services.json`** e coloque
   na raiz do projeto. Ele já está no `.gitignore`; o `app.config.js` acha o
   arquivo sozinho.
3. Para o build na nuvem, suba o arquivo como variável do tipo arquivo:
   ```powershell
   eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment development --environment preview --environment production
   ```
4. Credencial de envio (FCM V1): no Firebase, **Configurações do projeto →
   Contas de serviço → Gerar nova chave privada** (baixa um JSON; guarde fora
   do projeto). Depois:
   ```powershell
   eas credentials
   ```
   Android → perfil `development` → **Google Service Account** → **Manage your
   Google Service Account Key for Push Notifications (FCM V1)** → envie o JSON.
5. Opcional: se ligar "enhanced security for push" no expo.dev, crie um token
   em expo.dev → Account settings → Access tokens e ponha em
   `EXPO_ACCESS_TOKEN=` (lido só por `servidor/enviar-push.js`).

## 3. Google Cloud (chave do Google Maps, Aula 12)

O mapa da Aula 12 ainda não foi implementado; a chave já tem lugar no
`app.config.js` (`android.config.googleMaps.apiKey`).

1. <https://console.cloud.google.com> → crie um projeto e ative o
   faturamento (pede cartão; o uso de laboratório fica na cota gratuita
   mensal, mas configure um **alerta de orçamento** em Faturamento → Orçamentos).
2. **APIs e serviços → Biblioteca →** ative **Maps SDK for Android**.
3. **Credenciais → Criar credenciais → Chave de API.**
4. Restrinja a chave (ADR 003): **Apps Android** → nome do pacote
   `com.clinicaaura.app` + impressão digital SHA-1. A SHA-1 do build EAS
   aparece em `eas credentials` → Android → Keystore. Em **Restrições de
   API**, deixe só o Maps SDK for Android.
5. `.env`: `GOOGLE_MAPS_API_KEY=...` e no EAS:
   ```powershell
   eas env:create --name GOOGLE_MAPS_API_KEY --value "SUA-CHAVE" --visibility secret --environment development --environment preview --environment production
   ```
   A chave entra no binário: precisa de **um build novo** depois de definida.

## 4. Provedor de SMS (opcional)

Sem nada configurado, `SMS_PROVEDOR=simulado`: o servidor fala com o gateway
simulado (`npm run gateway`) e **nenhuma mensagem sai**. Para envio real, a
chave fica **só no `.env` do computador que roda o servidor**, nunca no app
(ADR 005). Ao subir, `npm run auth-api` mostra qual provedor está ativo.

**Twilio** (<https://www.twilio.com/try-twilio>)

1. Crie a conta (vem com crédito de teste). Na conta de teste só dá para
   mandar para números **verificados** em Phone Numbers → Verified Caller IDs.
2. Console → **Account Info**: copie *Account SID* e *Auth Token*.
3. Phone Numbers → **Buy a number** com capacidade SMS.
4. `.env`:
   ```
   SMS_PROVEDOR=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM=+15551234567
   ```

**Zenvia** (<https://app.zenvia.com>, mais comum no Brasil)

1. Crie a conta e ative o canal **SMS** (a Zenvia pede dados da empresa para
   liberar o envio).
2. **Integrações → API → Criar token.** O remetente (`from`) é o identificador
   que a Zenvia mostra para o canal SMS.
3. `.env`:
   ```
   SMS_PROVEDOR=zenvia
   ZENVIA_API_TOKEN=...
   ZENVIA_FROM=...
   ```

Faltou uma chave do provedor escolhido? O `POST /sms` responde **503** com o
nome do que falta, em vez de cair no simulado sem avisar.

> A integração com Twilio e Zenvia foi escrita pela documentação de cada API e
> testada com respostas simuladas (`servidor/provedores-sms.test.js`). O
> primeiro envio real é seu: comece mandando para o seu próprio número.

---

## Se uma chave vazar

Apagar do arquivo não basta: ela fica no histórico do Git. Revogue ou gere outra
no painel do serviço (Firebase, Google Cloud, Twilio, Zenvia, Expo) e atualize
o `.env` e o `eas env`.
