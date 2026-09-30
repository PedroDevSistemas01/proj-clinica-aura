# Aula 6 — Checklist de periféricos, arguição e ética

> Legenda: **[x]** implementado e conferido no código e no bundle Android ·
> **[ ]** depende de conferência em **aparelho físico** ou de ação da squad.
> A conferência oficial é no aparelho: marquem os itens abaixo lá.

## Câmera — foto de perfil (`src/components/FotoPerfil.js`)

- [x] O app pede a permissão de câmera antes de tentar usá-la (`getCameraPermissionsAsync` → explicação → `requestCameraPermissionsAsync`).
- [x] Negar a permissão mostra uma explicação, e não uma tela em branco (e, se bloqueada, oferece "Abrir ajustes").
- [x] A câmera abre a partir do formulário de médico e devolve a foto escolhida (`launchCameraAsync`, `aspect [1,1]`, `quality 0.6`).
- [x] Cancelar a captura não quebra o formulário (`resultado.canceled` tratado).
- [x] A foto aparece em destaque no topo do formulário (avatar redondo; sem foto, as iniciais do nome).
- [x] Ao abrir o formulário em modo edição, a foto já existente é mantida (`useState(medico?.fotoUri || null)` + `useEffect` na prop).
- [x] A `fotoUri` viaja junto com o restante dos dados no envio do formulário.
- [x] O cadastro pode ser concluído sem foto: ela é opcional.
- Extra: o mesmo componente serve ao **cadastro de paciente** (reaproveitado, não copiado) e oferece **galeria** como alternativa à câmera.

## Biometria — login (`src/screens/Login/LoginBiometrico.js`)

- [x] O app confere `hasHardwareAsync()` e `isEnrolledAsync()` antes de oferecer o botão.
- [x] Sem sensor, ou sem biometria cadastrada, a mensagem explica qual dos dois é o caso.
- [x] A caixa de diálogo é a do sistema, com `promptMessage` explicando o que será liberado ("destrancar sua sessão").
- [x] Cancelar a biometria não mostra erro alarmante (`user_cancel` leva ao login com senha, que é o que diz o botão de cancelar).
- [x] A saída "Entrar com e-mail e senha" está sempre visível.
- [x] Sem token guardado, o app manda para o login com senha e não oferece biometria.
- [x] A squad sabe explicar que a biometria destranca o token e não autentica na API (ver arguição 1).

## GPS — distância até a clínica (`src/services/localizacao.js` + `src/screens/Clinica/ComoChegar.js`)

- [x] Existe `src/services/localizacao.js`, e nenhuma tela chama `expo-location` diretamente.
- [x] O app pede localização em primeiro plano (`requestForegroundPermissionsAsync`), não em background.
- [x] A tela mostra um indicador enquanto a primeira leitura acontece.
- [ ] A distância calculada faz sentido para o local onde vocês estão (**conferir no aparelho**; Haversine testado: São Paulo → clínica dá 213,9 km em linha reta).
- [x] A precisão informada pelo aparelho aparece na tela (± N m).
- [x] A tela deixa explícito que a distância é em linha reta e o tempo é estimativa.
- [x] Permissão negada com `canAskAgain` false oferece o caminho para os ajustes (`Linking.openSettings()`).
- [x] Sem GPS, o endereço da clínica continua visível: a tela não fica vazia.

## Integração e revisão

- [x] As três frentes foram desenvolvidas em branches separadas: `feat/aula6-foto-perfil`, `feat/aula6-login-biometrico`, `feat/aula6-como-chegar` (a partir de `feat/aula6-base`, que instala as bibliotecas) e integradas em `feat/aula6-integracao`.
- [ ] Cada PR revisado por um integrante que não escreveu aquele código (**ação da squad**).
- [ ] A revisão procurou especificamente pelo tratamento de permissão negada (**ação da squad**; os pontos estão listados acima).
- [ ] O app roda com as três funcionalidades juntas em pelo menos um aparelho físico (**conferir no aparelho**; o bundle Android com as três gera sem erro).

## Arguição — respostas da squad

**1. "O app manda a digital para a API conferir." O que está errado?**
A digital nunca sai do hardware seguro do aparelho, nem para o app. O
`authenticateAsync()` só devolve `{ success: true }` ou `{ success: false, error }`.
O que acontece de verdade: no login com senha (Aula 4) o servidor emitiu um
token, que ficou no cofre (`expo-secure-store`). A biometria só confirma que
quem segura o aparelho é o dono e, com isso, o app volta a usar aquele token.
Quem autoriza cada requisição continua sendo o servidor, pelo token; se ele
expirou, o `api.js` recebe 401 e manda para o login com senha.

**2. O usuário negou a localização duas vezes. O que o app faz?**
O sistema passa a responder `canAskAgain: false` e nem mostra mais a caixa.
A tela "Como chegar" mostra o aviso de localização bloqueada e o botão
**"Abrir os ajustes do aparelho"** (`Linking.openSettings()`). O endereço, o
telefone e o botão "Abrir no app de mapas" continuam na tela.

**3. Onde a foto do médico está guardada? E se o sistema limpar o cache?**
O que guardamos é só a **URI** devolvida pelo image-picker, um endereço que
aponta para o **cache do app** no aparelho que tirou a foto. Ela vai para o
json-server como texto em `fotoUri`. Se o sistema limpar o cache, o arquivo
some e a URI passa a apontar para o nada; em outro aparelho ela nunca
funcionou. É dívida técnica consciente: a solução é fazer upload da imagem
para o servidor (POST com arquivo, extensão da aula).

**4. Por que Haversine e não Pitágoras? Por que ela não diz o tempo real?**
Latitude e longitude são ângulos sobre uma esfera, e um grau de longitude
encolhe conforme se afasta do equador; Pitágoras trata isso como plano e erra.
Haversine mede a distância sobre a superfície da esfera. Mesmo correta, é
**linha reta**: ninguém anda em linha reta, e o tempo depende de ruas,
trânsito e meio de transporte. Tempo de verdade exigiria um serviço de rotas
(mais um terceiro, como na Aula 5). Por isso a tela diz "cerca de" e avisa.

## Ética — por que cada permissão é pedida

| Permissão | Por que é necessária (uma frase) | Explicamos antes do pop-up? |
| --- | --- | --- |
| Câmera | Para tirar a foto de perfil de médicos e pacientes, e só quando a pessoa toca em "Tirar foto". | Sim: Alert "Acesso à câmera" antes do pedido do sistema. |
| Galeria | Para escolher uma foto existente quando não se quer usar a câmera; o seletor do sistema não exige permissão nas versões recentes. | Sim, pelo texto do `app.json`. |
| Biometria (Face ID no iOS) | Para destrancar a sessão já existente sem digitar a senha; o dado biométrico nunca sai do aparelho. | Sim: a tela diz isso no rodapé. |
| Localização (só em uso) | Para calcular a distância até a clínica enquanto a tela "Como chegar" está aberta; não é gravada nem enviada. | Sim: cartão "Usar minha localização" com a explicação. |

Localização em segundo plano **não** é pedida: o desafio não precisa dela.

**Discussão:**
- *Quem pode ver a foto de um paciente?* Hoje, qualquer pessoa logada no app. O
  app **não** controla isso ainda: o controle por perfil (recepção × médico)
  precisa vir da API. Registrado como pendência.
- *O app precisa saber onde o paciente está?* Só no momento em que ele abre
  "Como chegar", e a posição fica apenas na memória da tela. A clínica só
  precisa saber onde **ela** fica.
- *Biometria é irrevogável.* Por isso a API foi desenhada para que o dado nunca
  saia do aparelho: não há o que vazar do nosso lado.

## Pendências para o início da Aula 7

| Squad | Pendência |
| --- | --- |
| proj-clinica-aura | Conferir os três recursos em aparelho físico e marcar os itens abertos acima. |
| proj-clinica-aura | Revisão cruzada dos três PRs antes de integrar na `main`. |
| proj-clinica-aura | Upload da foto para o servidor (hoje só a URI local é guardada). |
| proj-clinica-aura | Controle de quem pode ver a foto do paciente (depende de perfis na API). |
| proj-clinica-aura | Coordenadas da clínica escritas no código (`src/config/clinica.js`); virar marcador de mapa na Aula 12. |
| proj-clinica-aura | Biometria como opção nos ajustes, em vez de ativa para todos (extensão). |
