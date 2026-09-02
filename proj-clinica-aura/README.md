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

## Estrutura

```
proj-clinica-aura/
├── App.js                -> verifica sessão + NavigationContainer + Stack de rotas
├── index.js              -> registra o App.js como ponto de entrada
├── app.json              -> configurações do app (nome, ícone, splash)
├── db_clinica.json       -> base do json-server (API mock de dados)
├── package.json          -> dependências e scripts
├── assets/               -> ícones, imagens
├── servidor/
│   └── auth-api.js       -> API de autenticação (Node puro, porta 3001)
└── src/
    ├── theme.js          -> cores e espaçamentos compartilhados
    ├── services/
    │   ├── sessao.js     -> cofre do token (expo-secure-store)
    │   └── api.js        -> cliente HTTP único (token + tratamento de 401)
    ├── components/
    │   ├── MedicoForm.js
    │   └── PacienteForm.js
    └── screens/
        ├── Login/LoginScreen.js
        ├── Menu/Menu.js
        ├── Medico/
        │   ├── Medico.js
        │   └── CadastroEdicaoMedicoScreen.js
        └── Paciente/
            ├── Paciente.js
            └── CadastroEdicaoPacienteScreen.js
```

## Squad

- [nome do integrante 1]
- [nome do integrante 2]
- [nome do integrante 3]
