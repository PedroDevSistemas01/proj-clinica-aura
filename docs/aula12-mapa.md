# Aula 12 — Mapa da clínica

Material seguido: `A12_01_Slides_Mapas.pdf`, `A12_02_Roteiro_Pratica_Guiada.pdf`
e `A12_04_Pratica_Atividade_Desafiadora.pdf`. O demo (`A12_03_Demo_Mapa_Clinica.zip`)
e os gabaritos (`A12_06_Gabaritos.zip`, com `gabarito_MapaClinica.js` e
`gabarito_MapaUnidades.js`) **não foram recebidos**; a tela segue os
exemplos resolvidos dos slides.

Branch: `feat/aula12-mapas`, criada da `main` (Aulas 5 a 15 + fechamento).

## O que foi feito, passo a passo do exercício (A12_04)

### Passo 1 — Biblioteca e chave

- `npx expo install react-native-maps` → `react-native-maps@1.14.0`, a versão
  do SDK 51 (já vem dentro do Expo Go).
- Responsável pela chave, pelo ADR 003: **Luiz**. A chave **ainda não
  existe**: depende de conta Google Cloud com faturamento (cartão). Está
  registrada como pendência explícita no README (seção "Mapa e chave do
  Google Maps"), no `PENDENCIAS.md` e em `docs/CONTAS_E_CHAVES.md`, seção 3.
- O lugar da chave já existe e **não vai para o Git**: `app.config.js` lê
  `GOOGLE_MAPS_API_KEY` do `.env` (fora do Git) e grava em
  `expo.android.config.googleMaps.apiKey`. No build da nuvem, vem do
  `eas env`.
- Efeito prático: no **Expo Go** o mapa funciona no Android e no iOS (o
  Expo Go traz chave própria). No **build próprio** do Android, sem a chave,
  o mapa vira um retângulo cinza com o logo do Google. O iOS usa Apple Maps
  e não pede chave.

### Passo 2 — O mapa da clínica

`src/screens/Clinica/ComoChegar.js` (Aula 6) virou
`src/screens/Clinica/MapaClinica.js` (rota `MapaClinica`, título "Como chegar"):

| Item do exercício | Onde |
|---|---|
| 7. `MapView` com `initialRegion` na clínica, delta 0.01, sem `region` | `regiaoDaClinica()` em `src/services/mapaClinica.js` |
| 8. `Marker` com `title`, `description` e `pinColor` | pino da clínica na cor primária; o do usuário em laranja |
| 9. `Callout` com nome e endereço | nome, endereço e telefone |
| 10. Painel de texto embaixo com nome, endereço e telefone | cartão abaixo do mapa, sempre visível |
| 11. `obterPosicaoAtual()` da Aula 6 | nenhuma linha nova de GPS: tudo de `services/localizacao.js` |
| 12. `fitToCoordinates` com `edgePadding` | ao obter a posição (abertura com permissão, "Onde estou?" ou "Atualizar posição"); borda de 80 em cada lado |
| 13. Distância da Aula 6 no painel | cartão "Distância até a clínica", com tempo estimado e precisão |
| 14. Permissão negada e caminho para os ajustes | as mesmas fases da Aula 6 (explicar, negada, bloqueada → `Linking.openSettings()`, desligada, erro) |

Também do roteiro (A12_02): botão **Ver a clínica** com `animateToRegion`
(600 ms), coordenadas memorizadas com `useMemo` (Exemplo 6) e a nota sobre a
plataforma no rodapé do painel (Passo 5). As coordenadas são as
configuráveis do fechamento: `CLINICA_LATITUDE`/`CLINICA_LONGITUDE` do `.env`
ou, sem elas, as do cache do geocoding (Aula 5) e as de reserva de
`src/config/clinica.js`. Nada de coordenada escrita na tela.

### Passo 3 — Acessibilidade

- `accessibilityLabel` no `MapView`: "Mapa mostrando a localização da Clínica
  Aura, na Rua Nove de Julho, 1500 ...". Quando há posição, acrescenta "e a
  sua posição atual", e sempre avisa que o endereço e o telefone estão em
  texto logo abaixo.
- `accessibilityRole="button"` e `accessibilityLabel` em **todos** os
  botões, inclusive os da Aula 6 que não tinham (por exemplo: "Onde estou?"
  é anunciado como "Mostrar minha localização e a clínica no mapa").
- Endereço e telefone com `selectable`.
- Nome da clínica com `accessibilityRole="header"`; a distância é anunciada
  como "1,2 km em linha reta até a clínica", não só o número.
- Botões sobre o mapa com área de toque mínima de 44.

**Sem rede:** os tiles não carregam e sobra o fundo cinza da área do mapa,
mas o painel não depende da rede: nome, endereço, telefone, distância (o GPS
funciona sem internet) e o botão **Como chegar** continuam ali.

**Teste com leitor de tela (item 18):** ainda **não feito**, porque exige
aparelho. O que foi conferido sem aparelho:

- os testes de `MapaClinica.test.js` exigem `accessibilityLabel` no mapa,
  `accessibilityRole` + `accessibilityLabel` em cada botão e `selectable` no
  endereço e telefone;
- correções feitas ao revisar a tela da Aula 6 com o leitor "de cabeça"
  (como no Exercício 5): os botões "Usar minha localização", "Tentar
  novamente", "Abrir os ajustes" e "Atualizar posição" não tinham papel nem
  rótulo; o número da distância seria lido solto ("1,2 km") sem dizer de
  quê.

O roteiro do teste no aparelho está em `docs/TESTES_APARELHO.md`, item 3.
Anote no README o que o TalkBack/VoiceOver revelar.

### Passo 4 — Delegar a rota

Botão **Como chegar**: `Linking.openURL` com `geo:0,0?q=lat,lng(Nome)` no
Android e `maps:0,0?q=Nome@lat,lng` no iOS, nome com `encodeURIComponent`
(`urlAppDeMapas`). Sem app de mapas (emulador), cai no Google Maps pelo
navegador. Decisão registrada no ADR 007
(`docs/decisoes/007-rota-no-app-de-mapas.md`). Teste em aparelho físico:
pendente.

### Passo 5 — Commit

`feat: exibe a localizacao da clinica em um mapa`, na branch
`feat/aula12-mapas`, com push e sem PR. Revisão cruzada:

1. nenhuma chave de API no Git (`GOOGLE_MAPS_API_KEY` só no `.env`);
2. a informação existe em texto, não só no mapa;
3. `initialRegion`, nunca `region` controlada (há teste para isso).

### Passo 6 — Extensões: não feitas

- **Mapa com várias unidades:** a clínica tem uma unidade só; sem o
  `gabarito_MapaUnidades.js` e sem dados de outras unidades, ficou de fora.
- **Medir 200 marcadores com e sem `useMemo`:** exige aparelho para sentir o
  engasgo ao arrastar.
- **Coordenadas pela API (Aula 3):** a API mock não tem endpoint de "dados
  da clínica". O geocoding da Aula 5 já liga endereço → coordenada →
  marcador (a tela usa o cache dele quando o `.env` não define as
  coordenadas).

## Testes automáticos

`npm test`: 113 testes. Novos nesta aula:

- `src/services/mapaClinica.test.js`: região com delta 0.01, URL `geo:` e
  `maps:` com o nome codificado, endereço em uma linha;
- `src/screens/Clinica/MapaClinica.test.js`: os quatro cenários de GPS da
  Aula 14, mais acessibilidade do mapa e dos botões, texto selecionável,
  `fitToCoordinates` com `edgePadding`, `animateToRegion` e o `geo:` do
  botão Como chegar.

O `react-native-maps` é nativo: em `jest.setup.js` ele vira um dublê que
desenha `View`s e registra as chamadas de câmera.

## Pendências desta aula

- [ ] Chave do Google Maps (Google Cloud com faturamento), no `.env` e no `eas env`, e um build novo do Android para conferir que o mapa não fica cinza.
- [ ] Percorrer a tela com TalkBack (Android) ou VoiceOver (iOS) e anotar no README o que foi corrigido.
- [ ] Desligar o Wi-Fi e os dados, reabrir a tela e conferir que endereço, telefone e Como chegar continuam úteis.
- [ ] Tocar em Como chegar num aparelho físico (Android e, se houver, iOS) e ver o app de mapas abrir na clínica.
- [ ] Conferir no aparelho o efeito do delta (0.05 / 0.01 / 0.002) e do `edgePadding`.
- [ ] Extensões do Passo 6 (várias unidades, medição de 200 marcadores).
