# proj-clinica-aura

Aplicação mobile de agendamento de consultas para uma clínica médica.
Projeto da Unidade Curricular **Aplicações Mobile**.

Repositório: https://github.com/PedroDevSistemas01/proj-clinica-aura

## Sobre

- Consome uma API RESTful (pacientes, médicos, especialidades, horários, agendamento e cancelamento)
- Integrará recursos nativos do dispositivo (câmera, Bluetooth, GPS, biometria) e de plataforma (notificações, mapas, SMS, processamento em segundo plano) ao longo do semestre

## Stack

- React Native + Expo (SDK 51)
- React Navigation (native-stack)
- expo-secure-store (cofre do SO para guardar o token de sessão)
- expo-image-picker, expo-local-authentication e expo-location (Aula 6)
- react-native-ble-plx + buffer (Aula 7; modo real exige development build)
- @react-native-async-storage/async-storage (cache local de dados não sensíveis, ex.: coordenadas da clínica)
- Serviços externos (Aula 5): ViaCEP (CEP) e Nominatim/OpenStreetMap (geocoding), sem chave
- json-server como API mock de dados (porta 3000)
- API de autenticação em Node puro (porta 3001), em `servidor/auth-api.js`

## Como rodar

A partir da Aula 4 são **três terminais**.

### Terminal 1 — API mock de dados (json-server, porta 3000)

```bash
npm run api
```

Teste no navegador: http://localhost:3000/medicos deve devolver a lista de médicos em JSON.
Coleções disponíveis: `/medicos`, `/pacientes`, `/especialidades`, `/horarios`.

### Terminal 2 — API de autenticação (Node puro, porta 3001)

```bash
npm run auth-api
```

Teste no navegador: http://localhost:3001/medicos deve responder **401** (rota protegida — é o esperado). O login é em `POST /login`, então não dá para testar pela barra de endereços.
Usuários de teste: `recepcao@clinica.com / clinica123` e `joao@clinica.com / medico123`.

### Terminal 3 — App

```bash
npm install
npx expo install expo-secure-store   # garante a versão compatível com o SDK
npx expo install @react-native-async-storage/async-storage   # Aula 5: cache local
npx expo install expo-image-picker expo-local-authentication expo-location   # Aula 6
npx expo install react-native-ble-plx && npm install buffer   # Aula 7 (BLE real só em development build)
npx expo start
```

Escaneie o QR code com o app **Expo Go** no celular.

> **`expo-secure-store` não funciona no navegador (target web).** Rode em emulador ou celular físico. Se abrir no `--web`, o erro vem do cofre, não do código.

### Ajuste dos endereços (Aula 4 em diante)

Desde a Aula 4 o app não fala com a rede espalhado por várias telas. Só **dois**
lugares têm endereço:

- `src/services/api.js` → `BASE_URL` — o cliente único, usado por todas as telas de dados.
- `src/screens/Login/LoginScreen.js` → `AUTH_URL` — usado só pelo login (`POST /login`), **sempre na porta 3001** (o json-server não tem `/login`).

| Onde você está testando | host a usar |
| --- | --- |
| Emulador Android | `http://10.0.2.2` |
| Celular físico com Expo Go | `http://SEU_IP_LOCAL` (ex.: `http://192.168.0.15`) |

Descubra seu IP com `ipconfig` (Windows) ou `ifconfig` (Linux/macOS). O celular precisa estar na mesma rede Wi-Fi da máquina. Troque o host mantendo a porta (`3000` no `api.js`, `3001` no `LoginScreen.js`).

## O que a Aula 3 entregou

| Passo | Onde | O quê |
| --- | --- | --- |
| 2 | `Medico.js` | `GET /medicos` com `fetch`, estados `carregando` / `erro` / dados, botão "Tentar novamente", busca e agrupamento por letra na `SectionList` |
| 3 | `Paciente.js` | `GET /pacientes` no mesmo padrão, com `FlatList` |
| 4 | `CadastroEdicaoMedicoScreen.js` + `MedicoForm.js` | `POST /medicos` no cadastro, `PUT /medicos/:id` na edição, checagem de `resposta.ok`, estado `salvando` travando o botão, Alert de sucesso só depois da confirmação do servidor |
| 5 | `Medico.js` | `DELETE /medicos/:id` com `Alert.alert` de confirmação e recarga da lista; `useFocusEffect` no lugar do `useEffect` |
| 7 | `Paciente.js`, `CadastroEdicaoPacienteScreen.js`, `PacienteForm.js` | Mesmo padrão de escrita aplicado aos endpoints `/pacientes` |

## O que a Aula 4 entregou

| Passo | Onde | O quê |
| --- | --- | --- |
| 2 | `src/screens/Login/LoginScreen.js` | Tela de login: `POST /login`, validação antes do envio, `secureTextEntry`, `autoCapitalize="none"`, 401 tratado à parte, estado `entrando` travando o botão, `navigation.reset` no sucesso |
| 3 | `src/services/sessao.js` | Módulo de sessão: `salvarToken` / `obterToken` / `limparToken` / `estaLogado`. Único ponto que fala com o `expo-secure-store`; chave `clinica.token`; leitura protegida por try/catch |
| 4 | `src/services/api.js` | Cliente HTTP único: monta `Authorization: Bearer` sozinho, `Content-Type` só quando há corpo, trata o 401 uma vez (limpa o cofre + lança `SessaoExpirada`), devolve `null` no 204; atalhos `get` / `post` / `put` / `remover` |
| 4 | `Medico.js`, `Paciente.js`, `CadastroEdicaoMedicoScreen.js`, `CadastroEdicaoPacienteScreen.js` | Reescritas para usar os atalhos do `api.js`: sumiram `BASE_URL`, `fetch` cru e a checagem repetida de `resposta.ok` |
| 5 | `App.js` | Estado `logado` (null = verificando) preenchido por `estaLogado()`; `ActivityIndicator` durante a checagem; `initialRouteName` conforme a sessão; rota `Login` com `headerShown: false` |
| 5 | `Menu.js` | Botão **Sair**: `limparToken()` + `navigation.reset` para o Login (apagar e navegar, as duas coisas) |

## Segurança (Aula 4)

- **HTTP × HTTPS:** o mock local roda em **HTTP** porque o tráfego não sai da máquina — decisão consciente de laboratório, não descuido. A API real da clínica exigirá **HTTPS**: para o app, muda uma letra no `BASE_URL` (`http://` → `https://`); o resto é do servidor (certificado válido, domínio, renovação). iOS e Android já bloqueiam HTTP puro em produção por padrão.
- **Porta do cliente de dados (`api.js`):** usamos **`http://localhost:3000`** (json-server), para o CRUD da Aula 3 continuar funcionando. Esse mock **não valida** o token — o header vai junto, mas é ignorado. A API de autenticação (3001) valida o token de verdade, mas só expõe `GET /medicos` e `GET /perfil`. O padrão de enviar o token já fica pronto para a API real. Para ver o 401 acontecendo no app, troque o `BASE_URL` para `http://localhost:3001` (nesse modo, só a lista de médicos responde).
- **Login:** sempre em `http://localhost:3001/login`.
- **Senha:** não fica guardada em lugar nenhum depois do login — o `LoginScreen` limpa o campo (`setSenha('')`). O app precisa do token, não da senha.
- **Logs:** nenhum `console.log` imprime token, senha ou dado de paciente.

## O que a Aula 5 entregou — Web Services de terceiros

A partir daqui o app também fala com servidores que **não são nossos**. Por isso
existem dois clientes HTTP separados, de propósito:

| Cliente | Fala com | Envia o token da clínica? |
| --- | --- | --- |
| `src/services/api.js` | a nossa API (json-server / API real) | Sim |
| `src/services/httpExterno.js` | ViaCEP, Nominatim e futuros terceiros | **Nunca** (seria vazar credencial) |

| Passo | Onde | O quê |
| --- | --- | --- |
| 1 | `docs/decisoes/000-mapa-dependencias-externas.md` | Mapa de tudo que depende de terceiros (CEP, geocoding, mapas, push, SMS), com opções e o que acontece se cada serviço cair |
| 2 | `docs/decisoes/001` a `005` | Um ADR por serviço: contexto, opções, decisão, consequências, plano B e sinais de que deu errado |
| 3 | `src/services/httpExterno.js` | `buscarExterno(nomeServico, url, opcoes)`: timeout de 8 s com `AbortController` ("tempo esgotado" em vez de `AbortError`), header `User-Agent`, `resposta.ok` conferido antes do `.json()`, 429 com mensagem própria, erro `ServicoExternoIndisponivel` com o nome do serviço |
| 4A | `src/services/viacep.js` + `PacienteForm.js` | CEP no cadastro do paciente: validação local de 8 dígitos, consulta no `onBlur` (não a cada tecla), trata `200 + erro:"true"`, tradução `localidade → cidade`, indicador durante a consulta, **aviso** (não erro) se falhar, campos sempre editáveis |
| 4B | `src/services/geocoding.js` + `localizacaoClinica.js` + `screens/Sobre/SobreClinica.js` | Coordenadas da clínica pelo Nominatim: `User-Agent`, 1 req/s garantido por fila (sem `Promise.all`), lista vazia tratada, cache em AsyncStorage, crédito visível ao OpenStreetMap, botão "Abrir no app de mapas" como plano B |
| 5 | `.env.example` / `.gitignore` | Nenhuma chave no código. `.env` fora do Git; `.env.example` versionado sem valores |

### Como testar (precisa de internet)

1. **Pacientes → + → campo CEP:** digite `13560-042` e toque fora do campo. Logradouro, bairro, cidade e UF são preenchidos e continuam editáveis.
2. `99999999` → aviso "CEP não encontrado", cadastro continua possível.
3. Desligue o Wi-Fi e repita → aviso de "Sem conexão com ViaCEP", cadastro continua possível.
4. **Menu → Sobre a clínica:** latitude/longitude aparecem ("Consultado agora"). Feche e abra de novo: "Guardado neste aparelho", sem nova chamada ao Nominatim.
5. Para ver o timeout: troque `TIMEOUT_MS` em `httpExterno.js` para `1` e recarregue. Volte para `8000`.

> A consulta de CEP e o geocoding usam HTTPS e não dependem do json-server:
> funcionam mesmo com os Terminais 1 e 2 desligados.

### Providências para as próximas aulas (ver ADRs)

- [ ] **Aula 7/9:** aparelho Android para *development build* (push não funciona no Expo Go no Android a partir do SDK 53) + conta Expo/EAS + projeto Firebase (ADR 004).
- [ ] **Aula 12 (22/10):** conta Google Cloud com faturamento, chave do Maps SDK for Android restrita ao pacote do app, no `.env` (ADR 003).
- [ ] **Aula 13:** aparelho com chip para testar `expo-sms`; comparar plano de teste Zenvia × Twilio caso a clínica queira confirmação automática (ADR 005).

## O que a Aula 6 entregou — câmera, biometria e GPS

Três frentes independentes, cada uma na sua branch, integradas em
`feat/aula6-integracao`. Checklist de fechamento, respostas da arguição e
discussão ética em [`docs/aula6-checklist-perifericos.md`](docs/aula6-checklist-perifericos.md).

| Frente | Branch | Onde | O quê |
| --- | --- | --- | --- |
| Bibliotecas | `feat/aula6-base` | `package.json`, `app.json` | `expo-image-picker`, `expo-local-authentication`, `expo-location` via `npx expo install`; textos de permissão em português no `app.json` |
| Foto de perfil | `feat/aula6-foto-perfil` | `src/components/FotoPerfil.js`, `MedicoForm.js`, `PacienteForm.js` | Um componente para os dois cadastros: explica antes de pedir a câmera, trata negada e bloqueada (ajustes), `canceled` tratado, `aspect [1,1]` e `quality 0.6`, galeria como alternativa, foto opcional, `fotoUri` enviada com o formulário |
| Login biométrico | `feat/aula6-login-biometrico` | `src/screens/Login/LoginBiometrico.js`, `App.js` | Quem já tem token abre nesta tela. Confere sensor, biometria cadastrada e token; mensagem diferente para cada falta; `user_cancel` tratado; "Entrar com e-mail e senha" sempre visível. **A biometria destranca o token do cofre, não autentica na API** |
| Como chegar | `feat/aula6-como-chegar` | `src/services/localizacao.js`, `src/screens/Clinica/ComoChegar.js` | Único ponto do `expo-location`; permissão só em primeiro plano; `PermissaoNegada` com `canAskAgain`; `Accuracy.Balanced`; Haversine; distância, tempo estimado e precisão; endereço sempre visível; última posição conhecida para abrir rápido |

### Como testar (aparelho físico)

O emulador não serve para um teste honesto destes três recursos.

1. **Foto:** Médicos → + → toque no avatar → "Tirar foto". Negue a câmera uma vez (aparece a explicação) e salve sem foto (funciona). Edite o médico: a foto continua lá.
2. **Biometria:** faça login com senha, feche o app e abra de novo. Aparece "Entrar com digital". Cancele (volta para o login com senha, sem erro). Em aparelho sem digital cadastrada, a tela explica isso.
3. **Como chegar:** Menu → Como chegar → "Usar minha localização". Negue duas vezes e reabra a tela: aparece "Abrir os ajustes do aparelho", e o endereço continua visível.

> **Pendência consciente:** a foto é só a URI do cache do aparelho (some se o
> cache for limpo) e as coordenadas da clínica estão em `src/config/clinica.js`.
> Ver a lista completa no checklist.

## O que a Aula 7 entregou — sinais vitais via Bluetooth (BLE)

Branch `feat/aula7-bluetooth`. Checklist, relato de falhas e arguição em
[`docs/aula7-checklist-bluetooth.md`](docs/aula7-checklist-bluetooth.md).

| Onde | O quê |
| --- | --- |
| `src/services/bluetooth.js` | Duas implementações com a mesma interface (`procurar`, `pararBusca`, `conectar`, `monitorarFrequencia`, `desconectar`). `MODO_SIMULADO` é o único ponto que escolhe. O real carrega `react-native-ble-plx` só dentro de `criarServicoBleReal()`, chama `discoverAllServicesAndCharacteristics()` após conectar e pede permissões conforme `Platform.Version` |
| `src/services/frequenciaCardiaca.js` | `decodificarFrequencia()` pura (8 ou 16 bits, conforme a flag), faixa plausível e média |
| `src/screens/Consulta/SinaisVitais.js` | Procurando (lista sem repetição) → conectando (indicador) → conectado (valor ao vivo, contagem, média). Percebe conexão perdida, importa a média para `POST /sinaisVitais` pelo `api.js` e tem sempre o link "Digitar os valores manualmente" |
| `src/screens/Paciente/Paciente.js` | Botão "Sinais vitais" no cartão de cada paciente |
| `db_clinica.json` | Coleção `sinaisVitais` para o json-server aceitar a gravação |
| `tests/frequenciaCardiaca.test.mjs` | 6 testes da decodificação: `npm test` (Node 22+) |

### Modo simulado × modo real

- **Simulado (padrão, `MODO_SIMULADO = true`):** roda no **Expo Go**. Dois aparelhos falsos aparecem com atraso e enviam de 60 a 100 bpm a cada 1,5 s. Para provocar falhas, ligue uma chave por vez em `SIMULACAO` (`semAparelhos`, `falharAoConectar`, `perderConexaoAposLeituras`).
- **Real (`MODO_SIMULADO = false`):** **não funciona no Expo Go**. O `react-native-ble-plx` tem código nativo e exige *development build*:

```bash
npx expo run:android
```

ou EAS Build (`eas build --profile development --platform android`). Precisa de um medidor que use o perfil padrão de frequência cardíaca (cinta cardíaca, oxímetro, relógio esportivo).

### Como testar

1. Suba o json-server (`npm run api`) e entre no app.
2. Pacientes → "Sinais vitais" no cartão de um paciente. A busca encontra os dois aparelhos simulados e termina sozinha.
3. Conecte, espere pelo menos 3 leituras e toque em "Importar média para o prontuário". Confira em http://localhost:3000/sinaisVitais.
4. Saia da tela conectado e confira `[bluetooth simulado] desconectando` no Metro.

## Estrutura

```
proj-clinica-aura/
├── App.js                -> verifica sessão + NavigationContainer + Stack de rotas
├── index.js              -> registra o App.js como ponto de entrada
├── app.json              -> configurações do app (nome, ícone, splash)
├── db_clinica.json       -> base do json-server (API mock de dados)
├── PENDENCIAS.md         -> tudo o que ficou em aberto, num lugar só
├── .env.example          -> modelo de chaves de serviços externos (o .env fica fora do Git)
├── docs/decisoes/        -> registros de decisão arquitetural (ADR) dos serviços externos
├── docs/aula6-checklist-perifericos.md -> checklist, arguição e ética da Aula 6
├── docs/aula7-checklist-bluetooth.md -> checklist, falhas e arguição da Aula 7
├── tests/                -> testes de funções puras (npm test)
├── package.json          -> dependências e scripts
├── assets/               -> ícones, imagens
├── servidor/
│   └── auth-api.js       -> API de autenticação (Node puro, porta 3001)
└── src/
    ├── theme.js          -> cores e espaçamentos compartilhados
    ├── config/
    │   └── clinica.js    -> dados institucionais (endereço usado no geocoding)
    ├── services/
    │   ├── sessao.js     -> cofre do token (expo-secure-store)
    │   ├── api.js        -> cliente HTTP da NOSSA API (token + tratamento de 401)
    │   ├── httpExterno.js -> cliente HTTP de TERCEIROS (timeout, User-Agent, 429, sem token)
    │   ├── viacep.js     -> consultarCep()
    │   ├── geocoding.js  -> geocodificar() no Nominatim (1 req/s)
    │   ├── localizacaoClinica.js -> coordenadas da clínica com cache
    │   ├── localizacao.js -> GPS do aparelho: permissão, leitura, Haversine
    │   ├── bluetooth.js  -> BLE: implementações simulada e real, mesma interface
    │   └── frequenciaCardiaca.js -> decodificação pura do valor lido
    ├── components/
    │   ├── FotoPerfil.js -> foto de perfil (câmera/galeria), usada nos dois forms
    │   ├── MedicoForm.js
    │   └── PacienteForm.js
    └── screens/
        ├── Login/
        │   ├── LoginScreen.js
        │   └── LoginBiometrico.js
        ├── Menu/Menu.js
        ├── Medico/
        │   ├── Medico.js
        │   └── CadastroEdicaoMedicoScreen.js
        ├── Paciente/
        │   ├── Paciente.js
        │   └── CadastroEdicaoPacienteScreen.js
        ├── Clinica/ComoChegar.js
        ├── Consulta/SinaisVitais.js
        └── Sobre/SobreClinica.js
```

## Squad

- [nome do integrante 1]
- [nome do integrante 2]
- [nome do integrante 3]
