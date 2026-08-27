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
- json-server como API mock

## Como rodar

Precisa de **dois terminais**.

### Terminal 1 — API mock

```bash
npx json-server --watch db_clinica.json --port 3000
```

Ou, com o atalho já configurado no `package.json`:

```bash
npm run api
```

Teste no navegador: http://localhost:3000/medicos deve devolver a lista de médicos em JSON.

Coleções disponíveis: `/medicos`, `/pacientes`, `/especialidades`, `/horarios`.

### Terminal 2 — App

```bash
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** no celular.

### Ajuste do BASE_URL

A constante `BASE_URL` aparece no topo de quatro arquivos:

- `src/screens/Medico/Medico.js`
- `src/screens/Medico/CadastroEdicaoMedicoScreen.js`
- `src/screens/Paciente/Paciente.js`
- `src/screens/Paciente/CadastroEdicaoPacienteScreen.js`

| Onde você está testando | Valor do BASE_URL |
| --- | --- |
| Navegador (`expo start --web`) | `http://localhost:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Celular físico com Expo Go | `http://SEU_IP_LOCAL:3000` (ex.: `http://192.168.0.15:3000`) |

Descubra seu IP com `ipconfig` (Windows) ou `ifconfig` (Linux/macOS). O celular precisa estar na mesma rede Wi-Fi da máquina que roda o json-server.

## O que a Aula 3 entregou

| Passo | Onde | O quê |
| --- | --- | --- |
| 2 | `Medico.js` | `GET /medicos` com `fetch`, estados `carregando` / `erro` / dados, botão "Tentar novamente", busca e agrupamento por letra na `SectionList` |
| 3 | `Paciente.js` | `GET /pacientes` no mesmo padrão, com `FlatList` |
| 4 | `CadastroEdicaoMedicoScreen.js` + `MedicoForm.js` | `POST /medicos` no cadastro, `PUT /medicos/:id` na edição, checagem de `resposta.ok`, estado `salvando` travando o botão, Alert de sucesso só depois da confirmação do servidor |
| 5 | `Medico.js` | `DELETE /medicos/:id` com `Alert.alert` de confirmação e recarga da lista; `useFocusEffect` no lugar do `useEffect` |
| 7 | `Paciente.js`, `CadastroEdicaoPacienteScreen.js`, `PacienteForm.js` | Mesmo padrão de escrita aplicado aos endpoints `/pacientes` |

## Estrutura

```
proj-clinica-aura/
├── App.js                -> NavigationContainer + Stack de rotas
├── index.js              -> registra o App.js como ponto de entrada
├── app.json              -> configurações do app (nome, ícone, splash)
├── db_clinica.json       -> base do json-server (API mock)
├── package.json          -> dependências e scripts
├── assets/               -> ícones, imagens
└── src/
    ├── theme.js          -> cores e espaçamentos compartilhados
    ├── components/
    │   ├── MedicoForm.js
    │   └── PacienteForm.js
    └── screens/
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
