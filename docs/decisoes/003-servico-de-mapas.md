# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 003 — Serviço de mapas |
| Squad | proj-clinica-aura |
| Data | 30/09/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Proposta** (implementação na Aula 12, 22/10/2026) |

## 1. Contexto

O paciente precisa ver onde fica a clínica e traçar rota até ela. As
coordenadas já vêm do geocoding (ADR 002); falta desenhar o mapa. A API da
clínica não resolve: mapa exige *tiles* (as imagens do mapa) e um componente
nativo de renderização, que são infraestrutura de terceiros.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **react-native-maps** (Google no Android, Apple Maps no iOS) | Android: **sim** (Maps SDK for Android). iOS com Apple Maps: não | Maps SDK móvel do Google sem cobrança por carregamento dentro das condições atuais, mas a chave exige conta Google Cloud **com faturamento habilitado** | Chave restrita ao pacote do app. No Expo Go funciona com a chave do próprio Expo Go; no build nosso, precisa da nossa |
| **MapLibre + MapTiler** (`@maplibre/maplibre-react-native`) | Sim (MapTiler) | Plano gratuito com limite mensal de carregamentos | Exige **development build** (não roda no Expo Go). Atribuição obrigatória ao MapTiler e ao OSM |
| **Tiles do OpenStreetMap** (`tile.openstreetmap.org` via `UrlTile`) | Não | Sem cota formal; uso intenso é proibido | Política de tiles do OSM proíbe apps com volume e exige User-Agent e atribuição. Serve para protótipo, não para produção |

## 3. Decisão

**react-native-maps com o provedor padrão.** O critério que pesou mais foi
**rodar no Expo Go**, sem *development build*: a Aula 12 inteira pode ser
desenvolvida no celular de qualquer integrante. A biblioteca já vem no Expo Go
do SDK 51. MapLibre foi descartado agora justamente por exigir build nativo;
tiles do OSM direto, pela política de uso.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Desenvolvimento no Expo Go, documentação farta, marcador e rota prontos. Usa as coordenadas que a tela "Sobre a clínica" já guarda. |
| O que fica mais arriscado ou mais caro? | Para gerar o APK/AAB próprio precisamos da **nossa** chave Google, que exige **cartão cadastrado** no Google Cloud (mesmo sem cobrança). Chave vazada no Git pode gerar custo: ela vai no `.env` e é restrita ao pacote do app. |
| O que precisa ser providenciado antes (conta, chave, build)? | Conta Google Cloud com faturamento, projeto "clinica-aura", Maps SDK for Android ativado, chave restrita ao pacote do app (definir `android.package` no `app.json`, ex.: `com.clinicaaura.app`), alerta de orçamento em R$ 0. |
| Quem na squad fica responsável por essa providência? | Luiz (ou integrante com cartão disponível, a definir na squad). |
| Até quando ela precisa estar pronta? | **Antes de 22/10/2026** (Aula 12). A liberação do faturamento pode levar dias. |

Se o serviço de mapas sair do ar: a tela "Sobre a clínica" continua mostrando
endereço e coordenadas em texto, e um botão abre o app de mapas do próprio
aparelho (`Linking`), que não depende da nossa chave.

## 5. Plano B

- **Enquanto estiver fora:** endereço em texto + botão "Abrir no app de mapas".
- **Fornecedor alternativo:** MapLibre + MapTiler (exige development build, que
  a squad já vai ter por causa do push na Aula 9).
- **Custo de trocar:** a tela de mapa troca de componente (um arquivo);
  coordenadas e geocoding não mudam. Estimativa: uma tarde, mais o build.

## 6. Como saberemos que deu errado

- Mapa em branco/cinza no build próprio: chave ausente, sem faturamento ou
  restrita a outro pacote.
- Alerta de orçamento do Google Cloud disparando: chave vazada ou uso fora do
  previsto. Revogar a chave na hora.
- Google mudar a política de cobrança do Maps SDK móvel: rever a decisão.
