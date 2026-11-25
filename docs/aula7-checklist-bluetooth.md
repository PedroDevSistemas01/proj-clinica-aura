# Aula 7 — Checklist de Bluetooth (BLE), relato de falhas e arguição

> Legenda: **[x]** implementado e conferido (código, bundle Android e testes no
> Node do modo simulado) · **[ ]** depende de aparelho físico, development
> build ou ação da squad.

## Fluxo funcionando

- [x] O escaneamento lista aparelhos e não repete o mesmo aparelho (o simulado anuncia cada um duas vezes de propósito; a tela filtra por `id`).
- [x] O escaneamento tem fim: para sozinho (`DURACAO_BUSCA_MS`, 10 s no real; 5 s no simulado).
- [x] Conectar mostra um indicador enquanto a conexão acontece.
- [x] As leituras chegam e o valor na tela muda sozinho (a cada 1,5 s no simulado).
- [x] A quantidade de leituras acumuladas aparece ("N leituras recebidas · média X bpm").
- [x] Desconectar cancela a assinatura **e** encerra a conexão (`assinatura.remove()` + `cancelDeviceConnection`).
- [x] Sair da tela desconecta o aparelho: o retorno do `useEffect` chama `desconectar()`, que imprime `[bluetooth simulado] desconectando` no Metro.

## Arquitetura

- [x] Existe `src/services/bluetooth.js` com as duas implementações, real e simulada.
- [x] As duas expõem a mesma interface: `procurar`, `pararBusca`, `conectar`, `monitorarFrequencia`, `desconectar`.
- [x] Nenhuma tela importa `react-native-ble-plx` nem menciona UUID ou base64 (busca na pasta `src/screens`: zero ocorrências).
- [x] Um único ponto decide a implementação: `MODO_SIMULADO` em `bluetooth.js`, usado por `criarServicoBle()`.
- [x] A decodificação está separada e é pura: `decodificarFrequencia()` em `src/services/frequenciaCardiaca.js`, com 6 testes (`npm test`).
- [x] No modo real, `discoverAllServicesAndCharacteristics()` é chamada logo após conectar.
- [x] As permissões tratam `Platform.Version`: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` da API 31 em diante, `ACCESS_FINE_LOCATION` antes.

## Falhas tratadas (Passo 4, provocadas pelas chaves `SIMULACAO` em `bluetooth.js`)

- [x] Escaneamento sem resultado (`semAparelhos: true`): mensagem diz para ligar o medidor, aproximar, procurar de novo ou digitar à mão.
- [x] Falha ao conectar (`falharAoConectar: true`): "Não foi possível conectar. Confira se o aparelho está ligado e perto do celular, e tente de novo."
- [x] Conexão perdida no meio (`perderConexaoAposLeituras: 4`): após 5 s sem leitura o valor fica riscado e cinza, com "não é atual", aviso e botão "Reconectar".
- [x] Permissão negada (modo real): mensagem explica e oferece "Abrir os ajustes do aparelho".
- [x] O link "Digitar os valores manualmente" está sempre visível.

## Prontuário e dados sensíveis

- [x] A leitura só é gravada via API autenticada: `post('/sinaisVitais', ...)` do `api.js` (token + 401 → login).
- [x] Nenhum sinal vital aparece em `console.log` (os únicos logs do Bluetooth são "desconectando").
- [x] O valor enviado é a média, com `quantidadeLeituras`, `primeiraLeituraEm`, `ultimaLeituraEm`, `registradoEm`, aparelho e origem (`aparelho`, `aparelho-simulado` ou `manual`).
- [x] A squad sabe explicar por que um valor só na memória da tela não é registro médico (arguição 4).

## Pendências que dependem de aparelho/build

- [ ] Testar o modo real (`MODO_SIMULADO = false`) num development build com um medidor ou cinta cardíaca de verdade.
- [ ] Revisão cruzada: o revisor procura `ble-plx`, `UUID` e `base64` em `src/screens`.

## Relato dos problemas de conexão

| Squad | Problema encontrado | Como o app reagiu |
| --- | --- | --- |
| proj-clinica-aura | Aparelho anunciando várias vezes durante a busca | Lista filtra por `id`; cada aparelho aparece uma vez |
| proj-clinica-aura | Leituras param de chegar sem nenhum erro (conexão caiu em silêncio) | Relógio da tela percebe 5 s sem leitura, risca o valor e oferece reconectar ou importar a média do que já chegou |
| proj-clinica-aura | Reconectar sem encerrar a assinatura anterior gerava leituras duplicadas | "Reconectar" agora chama `desconectar()` antes de `conectar()` e mantém as leituras já recebidas |

## Arguição

**1. Por que a tela não conhece a biblioteca de BLE? O que isso permitiu hoje?**
A tela só conversa com a interface do `bluetooth.js`. Por isso o modo simulado
roda no Expo Go, sem development build e sem periférico, e a aula inteira foi
feita e testada assim. O modo real troca uma constante (`MODO_SIMULADO`), sem
mudar a tela. Também permitiu provocar falhas sob demanda (`SIMULACAO`), o que
com hardware de verdade seria sorte.

**2. O que acontece se pular a descoberta de serviços e características?**
A conexão funciona, mas ler ou monitorar a característica falha com algo como
"característica não encontrada", mesmo com o UUID certo. O sintoma é confuso
porque tudo parece correto: o aparelho conectou e o identificador está igual ao
da especificação. O que falta é o app conhecer a tabela de serviços do
aparelho, que só existe depois de `discoverAllServicesAndCharacteristics()`.

**3. "Dá para escanear o tempo todo para o aparelho aparecer mais rápido."**
Escanear gasta muita bateria e rádio, o Android limita apps que iniciam buscas
demais em pouco tempo (a busca passa a não retornar nada), e interfere com
outras conexões Bluetooth do celular. Por isso a busca tem fim e é refeita só
quando a pessoa pede.

**4. A leitura apareceu na tela mas o app fechou antes de importar. Ela existe para a clínica?**
Não. Ela existiu só na memória da tela, que foi descartada. Registro médico é
o que a API autenticada confirmou ter gravado, com quem mediu, quando, quantas
leituras e de qual aparelho. Por isso o botão diz "Importar para o prontuário"
e o alerta de sucesso só aparece depois da resposta do servidor.

## Dúvidas em aberto (para o início da Aula 8)

| Squad | Pendência |
| --- | --- |
| proj-clinica-aura | Development build para testar o modo real (também serve ao push da Aula 9). |
| proj-clinica-aura | Não há tela de "consulta" ainda: a importação é aberta pelo cartão do paciente ("Sinais vitais"). Mover para a consulta quando ela existir. |
| proj-clinica-aura | Extensões: nível de bateria do periférico (0x180F) e reconexão automática com limite de tentativas. |
