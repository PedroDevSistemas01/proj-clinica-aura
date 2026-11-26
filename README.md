# App Clínica — Clínica Aura (proj-clinica-aura)

Aplicativo de agendamento de consultas para uma clínica médica,
desenvolvido na Unidade Curricular Aplicações Mobile (SENAI, 4º termo de
Análise e Desenvolvimento de Sistemas).

Repositório: https://github.com/PedroDevSistemas01/proj-clinica-aura

O que cada aula entregou está em [`docs/historico-das-aulas.md`](docs/historico-das-aulas.md).
O que ainda está em aberto está em [`PENDENCIAS.md`](PENDENCIAS.md).
O manual para quem usa o app (recepção) está em [`docs/manual-de-uso.md`](docs/manual-de-uso.md).

## Sumário

- [Como rodar](#como-rodar)
- [Arquitetura](#arquitetura)
- [Telas](#telas)
- [Serviços externos](#serviços-externos)
- [Testes](#testes)
- [Build de produção](#build-de-produção)
- [Limitações conhecidas](#limitações-conhecidas)
- [Equipe](#equipe)

## Como rodar

### Pré-requisitos

- Node.js 22 LTS ou mais novo (o `npm run medir` usa `--disable-warning`, que é do Node 22+)
- npm 10 ou mais novo
- **Expo Go** no celular (Android ou iOS), ou emulador Android/iOS. O projeto usa o **Expo SDK 51**: instale a versão do Expo Go compatível com o SDK 51
- Opcional, só para os recursos que não rodam no Expo Go (push, Bluetooth real, tarefa em background): conta Expo/EAS e um aparelho Android para o *development build* (ver [Build de produção](#build-de-produção))

### Passo a passo

```bash
git clone https://github.com/PedroDevSistemas01/proj-clinica-aura.git
cd proj-clinica-aura
npm install
```

O app conversa com **três servidores locais**, cada um num terminal separado,
todos a partir da pasta do projeto:

| Terminal | Comando | Porta | Para quê |
|---|---|---|---|
| 1 | `npm run api` | 3000 | API mock de dados (json-server sobre `db_clinica.json`): médicos, pacientes, consultas, sinais vitais, dispositivos |
| 2 | `npm run auth-api` | 3001 | API de autenticação (`POST /login`) e pedido de SMS (`POST /sms`) |
| 3 | `npm run gateway` | 3002 | Gateway de SMS **simulado** (nenhuma mensagem sai de verdade). Só precisa estar no ar para "Enviar pela clínica" |

Confira no navegador: http://localhost:3000/medicos deve devolver uma lista
em JSON; http://localhost:3001/medicos deve responder **401** (rota protegida,
é o esperado).

Configure o endereço das APIs em **um arquivo só**, `src/services/api.js`:

```js
// src/services/api.js: troque pelo IP da máquina que roda as APIs
export const BASE_URL = 'http://192.168.x.x:3000';      // json-server
export const AUTH_BASE_URL = 'http://192.168.x.x:3001'; // autenticação e SMS
```

**Por que `localhost` não funciona em celular físico:** dentro do celular,
`localhost` é o próprio celular, e as APIs estão rodando no computador. Use o
IP do computador na rede Wi-Fi (no Windows, `ipconfig` → "Endereço IPv4"), com
o celular **na mesma rede**. No emulador Android, use `http://10.0.2.2`, que é
o apelido do computador visto de dentro do emulador. No navegador do próprio
computador, `localhost` funciona.

Rode o app (quarto terminal):

```bash
npx expo start
```

Leia o QR code com o Expo Go. Não rode no navegador (`--web`): o cofre do
token (`expo-secure-store`) não existe lá.

Opcional:

```bash
npm run gerar-consultas -- 3000   # 2 a 5 mil consultas para a tela de conflitos (Aula 10); pare o json-server antes
npm run gerar-consultas -- limpar # remove só as consultas geradas
npm run push -- teste <token>     # envia um push de teste (só com development build)
npm run medir                     # mede as versões da verificação de conflitos
```

### Credenciais de teste

| Perfil | E-mail | Senha |
|---|---|---|
| Recepção | `recepcao@clinica.com` | `clinica123` |
| Médico | `joao@clinica.com` | `medico123` |

São contas de laboratório, escritas em `servidor/auth-api.js`. A API guarda
as sessões em memória: reiniciá-la desloga todo mundo.

## Arquitetura

### Estrutura de pastas

```
App.js                -> verifica a sessão, registra handler/tarefa e declara as rotas
app.config.js         -> configuração do Expo (lê chaves do .env; substitui o app.json)
eas.json              -> perfis de build (development, preview, production)
db_clinica.json       -> base do json-server
servidor/             -> auth-api.js, gateway-sms.js, enviar-push.js, gerar-consultas.js
docs/                 -> decisões (ADR), checklists por aula, plano de testes, manual de uso
src/
  components/   formulários de médico e paciente e o campo de foto de perfil
  screens/      uma pasta por área (Login, Menu, Medico, Paciente, Consulta, Agenda, Clinica, Sobre)
  services/     tudo que fala com rede, disco, hardware ou sistema operacional (ver abaixo)
  hooks/        useTarefaPesada (progresso + cancelamento) e useSincronizacao (AppState)
  utils/        dataHora.js (formatar e montar datas)
  config/       dados institucionais da clínica (endereço, telefone, coordenadas)
  regras.js     validações puras (login, médico, paciente, agendamento)
  theme.js      cores e espaçamentos
  test-utils.js utilidades dos testes (API falsa, login)
```

### Camada de serviços

| Arquivo | Responsabilidade |
|---|---|
| `services/api.js` | Cliente HTTP único da API da clínica: monta o header `Authorization: Bearer`, trata o 401 (limpa o cofre e lança `SessaoExpirada`), `get`/`post`/`put`/`remover` |
| `services/sessao.js` | Token e usuário logado no cofre do sistema (`expo-secure-store`) |
| `services/httpExterno.js` | Serviços de terceiros (ViaCEP, Nominatim): timeout de 8 s, `User-Agent`, 429; **nunca** leva o token da clínica |
| `services/viacep.js`, `geocoding.js`, `localizacaoClinica.js` | CEP, coordenadas da clínica (1 req/s) e cache |
| `services/localizacao.js` | GPS: permissão, posição, Haversine, tempo estimado |
| `services/bluetooth.js`, `frequenciaCardiaca.js` | BLE com implementação simulada e real (mesma interface) e decodificação pura |
| `services/lembretes.js` | Único ponto do `expo-notifications`: lembrete local 1 h antes, vínculo consulta → notificação no AsyncStorage, toque |
| `services/push.js` | Token de push e registro do dispositivo na API |
| `services/navegacao.js` | Navegar de fora das telas (toque na notificação) sem furar o login |
| `services/conflitos.js`, `processamento.js` | Conflitos da agenda (ingênuo, otimizado e fatiado) e `cederAVez` |
| `services/sincronizacao.js`, `tarefaBackground.js` | `sincronizarAgenda(origem)` sem tela; tarefa periódica |
| `services/sms.js`, `regrasSms.js` | SMS pelo aparelho ou pelo servidor; número, segmentos e modelos de texto |

**Por que os periféricos ficam atrás de serviços:** a tela só conhece a
interface do service, nunca a biblioteca. Isso deixou o Bluetooth rodar em
modo simulado no Expo Go (sem hardware) e tornou possíveis os testes de
falha da Aula 14: o service é trocado por um dublê que nega o GPS, não
encontra aparelho ou fica sem rede, e a tela nem percebe. Duas exceções
conhecidas: `FotoPerfil` (câmera) e `LoginBiometrico` (biometria) ainda
chamam a biblioteca direto.

### Decisões arquiteturais

| # | Decisão | Registro |
|---|---|---|
| 000 | Mapa de tudo que depende de terceiros e o que acontece se cada um cair | [docs/decisoes/000-mapa-dependencias-externas.md](docs/decisoes/000-mapa-dependencias-externas.md) |
| 001 | CEP pelo ViaCEP, sem chave; aviso (não erro) se cair | [docs/decisoes/001-consulta-de-cep.md](docs/decisoes/001-consulta-de-cep.md) |
| 002 | Geocoding pelo Nominatim com cache local, 1 req/s | [docs/decisoes/002-geocoding.md](docs/decisoes/002-geocoding.md) |
| 003 | Mapa com Google Maps SDK (chave restrita ao pacote) | [docs/decisoes/003-servico-de-mapas.md](docs/decisoes/003-servico-de-mapas.md) |
| 004 | Push pelo Expo Push Service; lembrete da consulta é local | [docs/decisoes/004-notificacoes-push.md](docs/decisoes/004-notificacoes-push.md) |
| 005 | SMS: gateway só no servidor; o app nunca tem a credencial | [docs/decisoes/005-sms-confirmacao.md](docs/decisoes/005-sms-confirmacao.md) |
| 006 | Conflitos da agenda deveriam ser verificados no servidor | [docs/decisoes/006-verificacao-de-conflitos.md](docs/decisoes/006-verificacao-de-conflitos.md) |

## Telas

| Tela | Arquivo | O que faz | Recursos usados |
|---|---|---|---|
| Login | `src/screens/Login/LoginScreen.js` | E-mail e senha; guarda o token no cofre | API de autenticação, SecureStore |
| Entrar com biometria | `src/screens/Login/LoginBiometrico.js` | Destranca o token guardado com digital/rosto | Biometria |
| Menu | `src/screens/Menu/Menu.js` | Atalhos; registra push e a tarefa; sincroniza ao abrir e ao voltar | Push, background, AppState |
| Médicos | `src/screens/Medico/Medico.js` (+ `CadastroEdicaoMedicoScreen.js`) | Lista com busca, cadastro, edição e exclusão | API, câmera (foto) |
| Pacientes | `src/screens/Paciente/Paciente.js` (+ `CadastroEdicaoPacienteScreen.js`) | Lista, cadastro com CEP automático, edição e exclusão | API, ViaCEP, câmera |
| Sinais vitais | `src/screens/Consulta/SinaisVitais.js` | Lê a frequência cardíaca de um medidor e grava a média no prontuário | Bluetooth (simulado por padrão) |
| Consultas | `src/screens/Consulta/Consultas.js` | Lista, remarcar, cancelar (cancela o lembrete e oferece SMS) | API, notificações |
| Agendar / remarcar | `src/screens/Consulta/AgendarConsulta.js` | Grava na API e depois agenda o lembrete 1 h antes | API, notificações |
| Consulta | `src/screens/Consulta/DetalheConsulta.js` | Detalhe aberto pelo toque no lembrete ou no push | API |
| Enviar SMS | `src/screens/Consulta/EnviarSms.js` | Confirmação ou cancelamento por SMS, pelo aparelho ou pela clínica | SMS, API, gateway |
| Conflitos da agenda | `src/screens/Agenda/SincronizarAgenda.js` | Verificação de horários sobrepostos sem travar a tela | Processamento fatiado |
| Sincronização | `src/screens/Agenda/HistoricoSincronizacao.js` | Quando a agenda foi atualizada e o que mudou; liga/desliga o segundo plano | Background, AsyncStorage |
| Como chegar | `src/screens/Clinica/ComoChegar.js` | Distância e tempo estimado até a clínica; endereço sempre visível | GPS |
| Sobre a clínica | `src/screens/Sobre/SobreClinica.js` | Endereço, telefone e coordenadas | Nominatim |

## Serviços externos

| Serviço | Para que | Exige chave? | Cota / limites |
|---|---|---|---|
| ViaCEP | Endereço a partir do CEP | Não | Sem cota publicada; uso razoável (consulta só ao sair do campo) |
| Nominatim (OpenStreetMap) | Coordenadas da clínica | Não | 1 requisição por segundo, `User-Agent` obrigatório, crédito ao OSM |
| Expo Push Service | Push de cancelamento e lembrete do dia | Não para enviar; exige `projectId` do EAS e credencial FCM | Até 100 mensagens por requisição; recibos para confirmar entrega |
| Gateway de SMS | SMS pela clínica | Sim, **no servidor** (`GATEWAY_SMS_KEY`) | Hoje é simulado (`servidor/gateway-sms.js`); um real (Zenvia, Twilio) cobra por segmento de 160 caracteres |
| Google Maps SDK | Mapa da clínica (Aula 12) | Sim (`GOOGLE_MAPS_API_KEY`) | Exige faturamento no Google Cloud. **Ainda não implementado** |

### Variáveis de ambiente

| Variável | Para que serve | Onde obter |
|---|---|---|
| `EAS_PROJECT_ID` | `projectId` do EAS, usado no token de push | `eas init` (ou painel do expo.dev) |
| `ANDROID_PACKAGE` | Identificador do app; padrão `com.clinicaaura.app` | Decisão da squad (não muda depois de publicar) |
| `GOOGLE_MAPS_API_KEY` | Chave do mapa (Aula 12) | Google Cloud Console, restrita ao pacote do app |
| `GATEWAY_SMS_KEY` | Chave do gateway de SMS, **só dos servidores** | Painel do gateway (no laboratório, vale a chave padrão) |

Copie `.env.example` para `.env` e preencha. O `app.config.js` lê os valores
de `process.env` (o Expo carrega o `.env` sozinho); no build da nuvem, os
mesmos nomes vão como EAS Secrets (`eas secret:create --name <NOME> --value "..."`).

## Testes

```bash
npm test                 # unidade e integração (Jest + Testing Library), 86 testes
npm run test:coverage    # com cobertura
```

Não precisa de emulador, aparelho, servidor nem internet.

**O que a suíte cobre:** as regras puras com seus casos de fronteira
(senha com exatamente 6 caracteres, consultas que se encostam, SMS de 160 × 161
caracteres, número de telefone com e sem DDI); a falha de cada periférico
(GPS negado, câmera cancelada, biometria sem sensor, Bluetooth sem aparelhos
ou instável, notificação sem permissão, API fora do ar); os fluxos de login,
agendamento, cancelamento e SMS; e a jornada completa do app em memória.
Detalhes em [`docs/aula14-plano-de-testes.md`](docs/aula14-plano-de-testes.md).

**O que a suíte NÃO cobre, e por quê:** hardware de verdade (os periféricos
são dublês; o comportamento real só se confere no aparelho), os servidores
(`auth-api`, `gateway-sms`, `enviar-push`, conferidos à mão com `curl`), a
tarefa em background (quem decide quando roda é o sistema operacional) e
testes end-to-end: **não há Maestro** (`.maestro/`) no projeto.

## Build de produção

```bash
npm install -g eas-cli
eas login
eas init                                          # cria o projeto no EAS e mostra o projectId
eas build --platform android --profile production
```

Perfis disponíveis em `eas.json`:

| Perfil | Gera | Para quê |
|---|---|---|
| `development` | APK com o cliente de desenvolvimento embutido | Testar push, Bluetooth real e tarefa em background, que não rodam no Expo Go. Exige `npx expo install expo-dev-client` antes |
| `preview` | APK instalável direto, sem loja | Distribuir para a banca/colegas (o mais prático para a Aula 16) |
| `production` | App Bundle (`.aab`) para a Play Store | Publicação. `autoIncrement` sobe o `versionCode` a cada build |

`version` (1.0.0, o que o usuário vê) fica no `app.config.js`. O `versionCode`
do Android (inteiro que a loja exige que sempre suba) é controlado pelo EAS
(`"appVersionSource": "remote"` + `autoIncrement`); não edite à mão.

**Pendências de build** (nenhum build foi gerado ainda):
- conta EAS e `EAS_PROJECT_ID` no `.env` / EAS Secrets;
- confirmar o `ANDROID_PACKAGE` (não muda depois de publicar);
- credencial FCM V1 (`eas credentials`) para o push;
- `expo-dev-client` instalado para o perfil `development`;
- `GOOGLE_MAPS_API_KEY` só quando a Aula 12 for feita;
- trocar `localhost` em `src/services/api.js` pelo endereço HTTPS da API real.

## Limitações conhecidas

| Limitação | Impacto | Contorno |
|---|---|---|
| API é um mock local (json-server) em HTTP, sem validar o token | Dados só existem no computador do laboratório; nada é seguro para produção | Apontar `api.js` para a API real com HTTPS |
| Sessões da API de autenticação ficam em memória | Reiniciar a API desloga todos; a biometria destranca um token que já não vale | Entrar de novo com e-mail e senha |
| Bluetooth roda em modo simulado | Os aparelhos e leituras são de demonstração | `MODO_SIMULADO = false` num development build, com um medidor BLE |
| Push exige development build, `projectId` e credencial FCM | No Expo Go nenhum push chega; o Menu mostra o motivo | Lembrete local da Aula 8 continua valendo |
| Tarefa em background exige development build e o sistema decide quando roda | No Expo Go só há sincronização manual, ao abrir e ao voltar ao app | Tela de Sincronização mostra a última atualização e permite puxar para atualizar |
| SMS pela clínica usa gateway simulado | Nenhum SMS sai de verdade | Gateway real (ADR 005) com a chave no servidor |
| SMS pelo aparelho exige chip | Em tablet ou emulador o botão fica desabilitado | Enviar pela clínica |
| Mapa (Aula 12) não implementado | "Como chegar" mostra distância, sem mapa | Botão "Abrir no app de mapas" |
| Foto de perfil é só a URI do cache do aparelho | Some se o cache for limpo; não aparece em outro aparelho | Upload para o servidor (pendente) |
| Verificação de conflitos roda no aparelho e baixa a agenda inteira | Gasta dados e bateria com agendas grandes | Mover para o servidor (ADR 006) |
| Lembrete local é por aparelho | Consulta cancelada em outro aparelho continua avisando até sincronizar | Sincronização (Aula 11) e push de cancelamento (Aula 9) |

## Equipe

| Integrante | Frentes principais |
|---|---|
| Luiz | Todas as frentes até a Aula 15 (ver a matriz em `docs/aula13-matriz-consolidacao.md`) |
| `<integrante 2>` | `<a definir pela squad>` |
| `<integrante 3>` | `<a definir pela squad>` |
