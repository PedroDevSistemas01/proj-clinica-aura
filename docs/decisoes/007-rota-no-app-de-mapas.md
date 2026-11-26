# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 007 — Não traçar rota dentro do app |
| Squad | proj-clinica-aura |
| Data | 26/11/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Aceita** (Aula 12, Passo 4) |

## 1. Contexto

Com o mapa da Aula 12, o paciente vê onde fica a clínica e onde ele está.
A pergunta seguinte é óbvia: "como eu chego lá?". Desenhar o caminho pelas
ruas exige um **serviço de rotas** (Directions API do Google, Mapbox, OSRM
etc.), que é mais um terceiro, como os da Aula 5: chave, cota e, em quase
todos, cobrança por requisição.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **Directions API (Google)** + `Polyline` no mapa | Sim, e diferente da chave do Maps SDK | Cobrada por requisição; exige faturamento | Rota só pode ser mostrada sobre mapa do Google |
| **OSRM / OpenRouteService** | ORS: sim. OSRM público: não | Servidor público do OSRM é de demonstração, sem garantia; ORS tem limite diário | Atribuição obrigatória; uso intenso proibido no servidor público |
| **Abrir o app de mapas do aparelho** (`Linking` + `geo:` / `maps:`) | Não | Nenhuma: quem calcula é o app do usuário | Nenhum termo nosso; o usuário usa o app que já aceitou |

## 3. Decisão

**Não traçar a rota dentro do app.** O botão **Como chegar** da tela
`MapaClinica` abre o app de mapas do próprio aparelho com
`Linking.openURL` e `Platform.select`: esquema `geo:` no Android e `maps:`
no iOS, com as coordenadas da clínica e o nome passado por
`encodeURIComponent` (`src/services/mapaClinica.js`, `urlAppDeMapas`). Se o
aparelho não tiver app de mapas (caso comum em emulador), o app cai no
Google Maps pelo navegador, com o endereço.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Rota, trânsito, transporte público e navegação por voz de graça e com qualidade melhor do que conseguiríamos. O usuário já conhece o app dele, com histórico e preferências. Três linhas de código, nenhuma chave nova, nenhuma cota. |
| O que fica mais arriscado ou mais caro? | Perdemos o controle da experiência: o usuário sai do nosso app e pode não voltar. Não dá para mostrar a rota sobre o nosso mapa nem calcular tempo de viagem real (por isso a tela continua dizendo "em linha reta" e "estimativa"). |
| O que precisa ser providenciado antes (conta, chave, build)? | Nada. |
| Quem na squad fica responsável por essa providência? | — |
| Até quando ela precisa estar pronta? | — |

**Por quê:** saber o que **não** construir é decisão de arquitetura. Um
serviço de rotas traria custo, chave e mais um ponto de falha para entregar
algo pior do que o app que o usuário já tem no bolso.

## 5. Plano B

- **Se o app de mapas não abrir:** o painel de texto continua com endereço
  e telefone selecionáveis (dá para copiar e colar em qualquer app), e o
  app tenta o Google Maps pelo navegador.
- **Se um dia a clínica exigir rota no app:** OpenRouteService com a chave
  no servidor (como o SMS, ADR 005), desenhando um `Polyline` no
  `MapView`. Custo estimado: um dia, mais a conta.

## 6. Como saberemos que deu errado

- Usuário relatando que o botão "não faz nada": aparelho sem app de mapas
  e sem navegador padrão.
- Pedidos frequentes de "ver o caminho sem sair do app": rever a decisão.
