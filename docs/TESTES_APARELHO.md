# Guia: do zero ao teste no aparelho

Passo a passo para quem nunca rodou o projeto, até testar cada recurso nativo
num celular de verdade. Feito para **Windows + PowerShell + celular Android**.
Os comandos vão um por bloco; rode na ordem.

Resumo do que precisa de quê:

| Recurso | Expo Go | Development build |
|---|---|---|
| Câmera (foto de perfil) | Funciona | Funciona |
| Biometria | Funciona no Android (no iPhone, Face ID só no build) | Funciona |
| GPS (Como chegar) | Funciona | Funciona |
| SMS (app de mensagens) | Funciona (precisa de chip) | Funciona |
| Lembrete local | Funciona | Funciona |
| Push remoto | Não recomendado (precisa de `projectId` e FCM de todo jeito) | **Precisa** |
| Bluetooth real | **Não funciona** (sem código nativo do BLE) | **Precisa** |
| Background real | **Não funciona** | **Precisa** |

Por isso o caminho recomendado é: Parte A (instalar) → Parte B (testes
automáticos) → Parte C (Expo Go, para o que já funciona) → Parte D
(development build) → Parte E (cada recurso).

---

## Parte A. Instalar e configurar (uma vez)

**Programas:** [Node.js 20 LTS ou mais novo](https://nodejs.org), [Git](https://git-scm.com).
No celular: **Expo Go** (Play Store), para a Parte C.

1. Baixe o projeto:
   ```powershell
   git clone https://github.com/PedroDevSistemas01/proj-clinica-aura.git
   ```
   ```powershell
   cd proj-clinica-aura
   ```
2. Instale as dependências:
   ```powershell
   npm install
   ```
3. Crie o seu `.env` a partir do modelo:
   ```powershell
   Copy-Item .env.example .env
   ```
4. Descubra o IP do computador na rede Wi-Fi (procure "Endereço IPv4" do
   adaptador Wi-Fi):
   ```powershell
   ipconfig
   ```
   No `.env`, aponte o app para o computador (troque pelo seu IP):
   ```
   API_URL=http://192.168.0.15:3000
   AUTH_API_URL=http://192.168.0.15:3001
   ```
   `localhost` dentro do celular é o próprio celular: por isso o IP.
5. Celular e computador na **mesma rede Wi-Fi**. Na primeira vez que o
   Node abrir uma porta, o Firewall do Windows pergunta: marque **Redes
   privadas** e permita. (Rede da faculdade às vezes bloqueia aparelho falar
   com aparelho; nesse caso use o roteador do celular.)

## Parte B. Testes automáticos (sem celular)

```powershell
npm test
```

Esperado: **20 suítes, 101 testes passando**. Os avisos `act(...)` no meio da
saída são conhecidos (PENDENCIAS.md) e não derrubam nada. Se algum teste
falhar aqui, pare: o problema não é o aparelho.

## Parte C. Rodar no Expo Go

Abra **quatro** terminais na pasta do projeto, um comando em cada:

```powershell
npm run api:rede
```
```powershell
npm run auth-api
```
```powershell
npm run gateway
```
```powershell
npx expo start --go
```

- `api:rede` é o json-server aberto para a rede (o `npm run api` só aceita
  o próprio computador).
- O `auth-api` mostra na última linha qual provedor de SMS está ativo
  (deve ser `simulado`).
- Com o `expo-dev-client` instalado, o `npx expo start` puro espera um
  development build; o `--go` força o modo Expo Go.

Abra o Expo Go e leia o QR code. Login de teste:
`recepcao@clinica.com` / `clinica123`.

**Não carregou?** "Network request failed" no login = o celular não chega no
computador: confira o IP do `.env`, a mesma rede e o firewall. Depois de mudar
o `.env`, pare o `expo start` (Ctrl+C) e rode de novo.

## Parte D. Development build (para Bluetooth, background e push)

Um development build é um "Expo Go só do nosso app", com todo o código
nativo que usamos. Instala uma vez; depois o código JS continua vindo do seu
computador como no Expo Go.

1. Faça a **seção 1 de `docs/CONTAS_E_CHAVES.md`** (conta Expo, `eas init`,
   `EAS_PROJECT_ID`). Para push, faça também a **seção 2** (Firebase).
2. Gere o build na nuvem (de 10 a 30 minutos na fila grátis):
   ```powershell
   eas build --profile development --platform android
   ```
   Na primeira vez ele pergunta se pode gerar a keystore do Android: aceite
   (fica guardada no EAS).
3. No fim aparece um link e um QR code: abra no celular, baixe o APK e
   instale (o Android pede para permitir "instalar apps desconhecidos" do
   navegador).
4. Suba os servidores (os três primeiros comandos da Parte C) e o Metro:
   ```powershell
   npx expo start
   ```
   Abra o app **Clínica Aura** instalado (não o Expo Go). Ele lista o
   servidor do computador; toque nele ou leia o QR code.
5. Para ligar o modo real dos recursos, ponha no `.env` e reinicie o
   `npx expo start`:
   ```
   BLUETOOTH_REAL=1
   BACKGROUND_REAL=1
   ```
   Não precisa de build novo: essas chaves são lidas pelo JavaScript.
   Precisa de build novo só quando muda algo **nativo**: `ANDROID_PACKAGE`,
   `google-services.json`, `GOOGLE_MAPS_API_KEY`, permissões ou bibliotecas.

> Alternativa sem nuvem: `npx expo run:android` gera o build no seu PC, mas
> exige Android Studio, Android SDK e JDK 17 instalados.

---

## Parte E. Testar cada recurso

Marque o resultado no checklist da aula indicada em cada item.

### 1. Câmera (foto de perfil) — Aula 6

Onde: **Menu → Médicos → +** (ou Pacientes).

1. Toque no círculo da foto → **Tirar foto**. Na primeira vez o app explica
   antes, depois o Android pede a permissão: permita.
2. Tire, recorte e confirme: a foto aparece no círculo. Salve.
3. **Persistência (novo):** feche o app, vá em Ajustes do Android → Apps →
   Clínica Aura (ou Expo Go) → Armazenamento → **Limpar cache**. Abra de novo
   o cadastro: a foto tem que continuar lá (agora ela fica na pasta
   permanente do app, não no cache).
4. Falhas a provocar: cancelar a câmera (cadastro sai sem foto, sem erro);
   negar a permissão duas vezes (aparece **Abrir ajustes**); **Escolher da
   galeria** como plano B.

Checklist: `docs/aula6-checklist-perifericos.md`.

### 2. Biometria — Aula 6

Pré-requisito: digital (ou rosto) cadastrada no aparelho.

1. Faça login com e-mail e senha.
2. Feche o app pela lista de recentes e abra de novo: abre a tela de
   destravar com biometria. Use a digital → entra direto no Menu.
3. Falhas: dedo errado várias vezes (o sistema bloqueia e o app oferece
   entrar com senha); aparelho sem digital cadastrada (o app cai no login
   com senha).

### 3. GPS (Como chegar) — Aula 6

Onde: **Menu → Como chegar**.

1. Toque em localizar e permita "durante o uso do app".
2. Aparece a distância até a clínica. Ande alguns metros ou troque de
   cômodo e toque de novo: a distância muda.
3. Falhas: GPS do aparelho desligado (mensagem pedindo para ligar); negar
   para sempre (botão para os ajustes).
4. **Coordenadas configuráveis (novo):** no `.env`, ponha
   `CLINICA_LATITUDE` e `CLINICA_LONGITUDE` de um lugar perto de você,
   reinicie o `expo start` e confira que a distância passa a ser até lá.
   **Sobre a clínica** mostra "Definido na configuração do app". Apague as
   duas linhas depois.

### 4. Lembrete local — Aula 8

1. No `.env`: `LEMBRETE_TESTE_MINUTOS=1`; reinicie o `expo start`.
2. **Consultas → Agendar** uma consulta para daqui a 3 minutos. Permita as
   notificações.
3. Feche o app (tire da lista de recentes). Em ~2 minutos chega o lembrete.
   Toque nele: o app abre na consulta.
4. Agende outra, cancele antes da hora: o lembrete não pode chegar.
5. Apague `LEMBRETE_TESTE_MINUTOS` do `.env` no fim.

Checklist: `docs/aula8-checklist-notificacoes.md`.

### 5. Push remoto — Aula 9 (development build + Firebase)

1. Faça login no development build e permita notificações. Ao abrir o
   Menu, o app grava o token no json-server. Veja no navegador do computador
   em <http://localhost:3000/dispositivos> e copie o `ExponentPushToken[...]`.
2. Com o app **fechado**, mande um push de teste (troque pelo seu token):
   ```powershell
   npm run push -- teste "ExponentPushToken[xxxxxxxx]"
   ```
   O script espera 15 s e lê o recibo: o esperado é `ok`. A notificação
   chega no celular.
3. Cancelamento pela recepção (troque pelo id de uma consulta sua):
   ```powershell
   npm run push -- cancelamento 1
   ```
4. Erro comum: `InvalidCredentials` no recibo = falta a chave FCM V1 no
   `eas credentials` (CONTAS_E_CHAVES, seção 2.4).

Checklist: `docs/aula9-checklist-push.md`.

### 6. Bluetooth (sinais vitais) — Aula 7 (development build)

Precisa de um aparelho que fale o **serviço padrão de frequência cardíaca**
(Heart Rate, 0x180D): cinta cardíaca (Polar, Garmin...), alguns relógios no
modo "transmitir frequência". Sem um, dá para usar **um segundo celular com o
app nRF Connect** (Nordic), criando um servidor GATT com o serviço Heart Rate.

1. `.env`: `BLUETOOTH_REAL=1`; reinicie o `expo start`.
2. **Menu → Pacientes →** botão de sinais vitais de um paciente.
3. Permita "Dispositivos por perto". Ligue a cinta (ou o servidor no nRF
   Connect): ela aparece na lista em até 10 s. Toque para conectar.
4. A frequência aparece **ao vivo**. Toque em importar: "Sinais vitais
   gravados no prontuário".
5. Falhas: Bluetooth desligado (mensagem pedindo para ligar); afastar o
   aparelho até cair (botão **Reconectar**); negar a permissão (**Abrir os
   ajustes do aparelho**); **Digitar manualmente** como plano B.

Checklist: `docs/aula7-checklist-bluetooth.md`.

### 7. Tarefa em background — Aula 11 (development build)

1. `.env`: `BACKGROUND_REAL=1`; reinicie o `expo start` e abra o app uma vez
   (é aí que a tarefa é registrada).
2. **Menu → Sincronização**: confere que a tarefa aparece como registrada.
3. Feche o app e espere. O Android decide quando roda (no mínimo 15 min,
   às vezes horas; economia de bateria atrasa mais).
4. Volte em **Sincronização**: deve haver uma entrada com origem
   **background**.
5. Para não esperar horas: deixe o celular carregando, no Wi-Fi e sem
   economia de bateria para o app (Ajustes → Apps → Clínica Aura → Bateria →
   Sem restrições). Com o celular no USB e o
   [adb](https://developer.android.com/tools/releases/platform-tools), dá para
   ver os jobs agendados do app e forçar um (o id varia de aparelho para
   aparelho; pegue na listagem):
   ```powershell
   adb shell dumpsys jobscheduler | Select-String clinicaaura
   ```
   ```powershell
   adb shell cmd jobscheduler run -f com.clinicaaura.app ID_DO_JOB
   ```

Roteiro completo: `docs/aula11-background.md`.

### 8. SMS — Aula 13

Precisa de um chip no celular para o item 1.

1. **App de mensagens:** abra uma consulta → **Confirmação** → **Abrir app
   de mensagens**. O app de SMS abre com número e texto prontos; você
   decide se envia.
2. **Pela clínica (servidor):** na mesma tela, **Enviar pela clínica**. O
   app mostra "enfileirado"; no terminal do `npm run gateway` aparece a
   mensagem simulada com segmentos e custo. Nada sai de verdade.
3. **Cancelamento:** em Consultas, cancele uma consulta e escolha avisar
   por SMS.
4. Falhas: paciente sem celular válido no cadastro (erro 422 explicado na
   tela); gateway desligado (pare o `npm run gateway` e tente: erro 502).
5. **SMS real (opcional):** configure Twilio ou Zenvia
   (`docs/CONTAS_E_CHAVES.md`, seção 4), reinicie o `npm run auth-api` e
   repita o item 2 com **o seu próprio número** no cadastro do paciente.

Lista de problemas conhecidos do fluxo: `docs/aula13-problemas-fluxo.md`.

---

## Depois dos testes

- Apague do `.env` as chaves de teste (`LEMBRETE_TESTE_MINUTOS`,
  `CLINICA_LATITUDE/LONGITUDE` de teste). `BLUETOOTH_REAL` e
  `BACKGROUND_REAL` podem ficar ligadas se você só usa o development build.
- Não commite o `db_clinica.json` se ele ganhou dados de teste
  (`git checkout -- db_clinica.json` desfaz).
- Marque o que passou e o que falhou nos checklists das aulas e em
  `PENDENCIAS.md`.
- Para a entrega (Aula 16), o APK que instala direto sai do perfil
  `preview`:
  ```powershell
  eas build --profile preview --platform android
  ```
  Nesse APK o JavaScript vai **dentro** do app, então as variáveis precisam
  estar no `eas env` (ambiente `preview`), não só no `.env`.
