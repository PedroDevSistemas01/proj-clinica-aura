# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 002 — Geocoding (endereço → latitude/longitude) |
| Squad | proj-clinica-aura |
| Data | 30/09/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Aceita** (implementada na Aula 5, Trilha B) |

## 1. Contexto

A Aula 12 vai mostrar a clínica em um mapa, e mapa trabalha com coordenadas,
não com "Rua Nove de Julho, São Carlos". Precisamos converter o endereço da
clínica em latitude/longitude. A API da clínica não resolve: isso exige uma
base cartográfica mundial e um motor de busca de endereços que não faz sentido
mantermos. O endereço da clínica praticamente não muda, então o volume de
chamadas é mínimo.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **Nominatim** (OpenStreetMap) | Não | Gratuito. **Máximo 1 requisição por segundo**; uso intenso é proibido | Exige **User-Agent** identificando a aplicação (sem ele: **403**). Exige **atribuição visível** "© OpenStreetMap contributors" (licença ODbL). Pede cache dos resultados. Proíbe autocomplete a cada tecla |
| **Google Geocoding API** | Sim | Cota gratuita mensal do nível Essentials, depois cobrança por chamada | Exige conta Google Cloud **com faturamento habilitado**. Restringe armazenar resultados por muito tempo. Se exibir em mapa, deve ser mapa Google |
| **LocationIQ** (baseado em OSM) | Sim | Plano gratuito com limite diário e ~2 req/s | Exige atribuição ao LocationIQ e ao OSM. Chave precisa ficar fora do código |

## 3. Decisão

**Nominatim.** O critério que pesou mais foi **não exigir chave nem
faturamento**: o uso é uma única consulta (o endereço da clínica), guardada em
cache, o que cabe com folga no limite de 1 req/s e respeita o pedido de cache
da própria política. Google foi descartado para *geocoding* porque exigiria
cartão de crédito cadastrado só para uma consulta; LocationIQ ficou como plano B.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Coordenadas disponíveis hoje, sem conta e sem chave. A tela "Sobre a clínica" abre instantânea depois da primeira vez (cache em AsyncStorage). As coordenadas já servem de entrada para a Aula 12. |
| O que fica mais arriscado ou mais caro? | Termos de uso rígidos: esquecer o User-Agent dá 403 com o código "certo"; um `Promise.all` de vários endereços dá 429 e bloqueio. Serviço comunitário, sem SLA. Endereços genéricos podem voltar **200 com lista vazia**. |
| O que precisa ser providenciado antes (conta, chave, build)? | Nada além do User-Agent (`ClinicaAura/1.0 (app academico)`) e do crédito visível ao OpenStreetMap na tela. |
| Quem na squad fica responsável por essa providência? | Luiz (manter `src/services/geocoding.js` e o rodapé de atribuição). |
| Até quando ela precisa estar pronta? | Pronta nesta aula (30/09/2026); revisar antes da Aula 12 (22/10/2026). |

Se o Nominatim sair do ar: quem já abriu a tela uma vez continua vendo as
coordenadas (cache). Quem nunca abriu vê o endereço em texto e um aviso de
que a localização está indisponível. Nenhum fluxo de agendamento depende disso.

## 5. Plano B

- **Enquanto estiver fora:** usa o cache; sem cache, mostra endereço em texto
  e botão "Tentar novamente". Na Aula 12, o mapa pode abrir o app de mapas do
  aparelho pelo endereço em texto.
- **Fornecedor alternativo:** LocationIQ (mesma base OSM, formato de resposta
  quase idêntico ao Nominatim).
- **Custo de trocar:** um arquivo (`src/services/geocoding.js`): trocar a URL,
  incluir a chave vinda do `.env` e manter a atribuição. A tela não muda,
  porque recebe `{ latitude, longitude, descricao }`, no nosso vocabulário.
- **Alternativa ainda mais simples:** como o endereço não muda, as coordenadas
  podem ser gravadas uma vez no cadastro da clínica na nossa API.

## 6. Como saberemos que deu errado

- **403** no console: User-Agent removido ou bloqueado pela política.
- **429** no console: alguém está geocodificando em série sem espaçar 1 s,
  ou o cache parou de funcionar.
- Coordenadas visivelmente erradas (fora de São Carlos): o endereço ficou
  genérico demais; incluir número/bairro ou gravar as coordenadas na API.
