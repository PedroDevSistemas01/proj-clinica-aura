# 000 — Mapa de dependências externas do desafio

> Aula 5, Momento 3, Passo 1. Levantamento feito **antes** de escrever código.
> Cada linha abaixo que foi adotada tem um registro próprio (ADR) nesta pasta.

## O que a API da clínica resolve sozinha

Tudo o que é **dado da clínica**: pacientes, médicos, especialidades, horários,
agendamento, cancelamento e login. Isso nasce e morre no nosso servidor
(`db_clinica.json` + `servidor/auth-api.js` no laboratório; API real depois).

Recursos nativos do aparelho (câmera, Bluetooth, GPS, biometria, tarefas em
segundo plano) também **não** entram aqui: são APIs do sistema operacional,
não Web Services de terceiros. Eles têm custo de *build*, mas não de fornecedor.

## O que depende de terceiros

| # | Funcionalidade | Aula | Por que a API da clínica não resolve | Opções levantadas | Se o serviço cair amanhã | Registro |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Preencher endereço a partir do CEP | 5 | A base de CEPs é dos Correios e muda toda semana; manter uma cópia própria é um projeto inteiro | ViaCEP, BrasilAPI, API dos Correios | Cadastro continua **à mão** (campos editáveis) | [001](001-consulta-de-cep.md) |
| 2 | Transformar endereço em latitude/longitude (geocoding) | 5 → 12 | Exige base cartográfica mundial e algoritmo de busca de endereços | Nominatim (OSM), Google Geocoding, LocationIQ | Tela "Sobre" mostra o endereço em texto; coordenadas ficam no cache | [002](002-geocoding.md) |
| 3 | Mostrar a clínica no mapa | 12 | Mapa = tiles + renderização; ninguém hospeda isso sozinho | react-native-maps (Google/Apple), MapLibre + MapTiler, tiles do OSM | Botão "Abrir no app de mapas" do aparelho | [003](003-servico-de-mapas.md) |
| 4 | Notificação push (lembrete/alteração de consulta) | 9 | Só Apple (APNs) e Google (FCM) entregam push no aparelho; nenhum servidor nosso fala direto com o celular | Expo Push Service, Firebase Cloud Messaging direto, OneSignal | Lembrete agendado **localmente** continua disparando | [004](004-notificacoes-push.md) |
| 5 | SMS de confirmação de consulta | 13 | Envio de SMS passa por operadora; exige contrato com gateway ou o chip do próprio aparelho | expo-sms (app de mensagens do aparelho), Twilio, Zenvia | Confirmação por push/e-mail; recepção liga | [005](005-sms-confirmacao.md) |

## Três armadilhas conferidas hoje (e não na véspera)

1. **Push não funciona no Expo Go no Android a partir do SDK 53.** Estamos no
   SDK 51, mas qualquer atualização de SDK antes da Aula 9 quebra o teste no
   Expo Go. Decisão: planejar um *development build* para a Aula 9 e **não**
   atualizar o SDK no meio do caminho sem combinar com a squad.
2. **Google Maps no Android exige chave, e a chave exige faturamento habilitado
   no Google Cloud**, mesmo dentro da cota gratuita. A conta precisa existir
   antes de 22/10 (Aula 12).
3. **expo-sms ≠ gateway de SMS.** O primeiro abre o app de mensagens e a pessoa
   toca em enviar; o segundo envia do servidor sem interação. Ver ADR 005 para
   qual dos dois atende "confirmação de consulta".

## Regras que valem para todos os serviços externos

- Toda chamada a terceiro passa por `src/services/httpExterno.js`, **nunca** pelo
  `api.js`: o token da clínica não pode sair para servidor de terceiro.
- Timeout de 8 s em toda chamada; 429 tem mensagem própria e não é repetido.
- Falha de terceiro vira **aviso**, nunca bloqueia um fluxo da clínica.
- Chaves de API ficam em `.env` (fora do Git). O repositório só versiona o
  `.env.example`, sem valores.
