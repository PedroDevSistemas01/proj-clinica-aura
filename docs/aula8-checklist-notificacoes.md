# Aula 8 — Checklist de notificações locais, arguição e dose

> Legenda: **[x]** implementado e conferido no código e no bundle Android
> (`npx expo export --platform android`) · **[ ]** depende de teste no
> aparelho ou de ação da squad.

## A notificação dispara

- [x] A permissão é solicitada (`garantirPermissao`: confere antes, só pede se puder, não insiste com `canAskAgain = false`) e o app avisa quando ela é negada (mensagem no agendamento: "As notificações estão desativadas...").
- [ ] O lembrete dispara no horário certo, com o app fechado. *(conferir no aparelho com `ANTECEDENCIA_TESTE_MINUTOS = 1`)*
- [x] Com o app aberto, a notificação também aparece: `configurarHandler()` no topo do `App.js`.
- [x] No Android, o canal `Lembretes de consulta` (`lembretes-consulta`) é criado na inicialização com `AndroidImportance.HIGH`.
- [x] Consulta muito próxima não promete lembrete: `agendarLembrete` devolve `agendado: false` e a tela diz "não haverá lembrete antes dela".

## O lembrete acompanha a consulta

- [x] Agendar cria o lembrete **depois** de o servidor confirmar (`post('/consultas')` → `agendarLembrete(salva)`). Se o POST falha, a mensagem diz que nenhum lembrete foi criado.
- [x] Remarcar ajusta o lembrete: `put` → `agendarLembrete`, que cancela o anterior antes de criar o novo.
- [x] Cancelar a consulta cancela o lembrete: `remover('/consultas/:id')` → `cancelarLembrete(id)`.
- [x] O vínculo `consultaId → identificador` fica no AsyncStorage (`clinica.lembretes`) e é consultado no cancelamento.
- [ ] Depois de cancelar tudo, "Lembretes pendentes" (lista de `getAllScheduledNotificationsAsync`) mostra 0. *(demonstrar no aparelho)*
- [x] Reagendar a mesma consulta não acumula lembretes (um identificador por `consultaId`).

## Toque e navegação

- [x] Tocar com o app aberto ou em segundo plano leva à tela `DetalheConsulta` (`addNotificationResponseReceivedListener`).
- [x] Tocar com o app **fechado** também: `getLastNotificationResponseAsync()` na inicialização, com guarda no AsyncStorage para não navegar de novo a cada recarga.
- [x] O `consultaId` viaja em `content.data` (junto com `tela`) e é usado na navegação.
- [x] O listener é removido no retorno do `useEffect` do `App.js`.
- [x] O toque não fura o login: se o app ainda está no Login/biometria, o destino fica pendente (`src/services/navegacao.js`) e abre depois de entrar.
- [ ] Teste do caminho B de verdade: fechar o app por completo, esperar o lembrete e tocar. *(aparelho)*

## Arquitetura e conteúdo

- [x] Existe `src/services/lembretes.js` e nenhuma tela importa `expo-notifications` (busca em `src/screens`: zero ocorrências).
- [x] O texto não expõe dado sensível: "Lembrete de consulta — Você tem uma consulta hoje às 14:00." Sem médico, especialidade ou nome do paciente.
- [x] A decisão sobre o texto está no README.
- [x] Um lembrete por consulta: `agendarLembrete` sempre chama `cancelarLembrete` antes.

## Extensão feita

- [x] `sincronizarLembretes(consultas)`: ao abrir a lista de consultas, cancela lembretes de consultas que sumiram da API e agenda os que faltam.
- [ ] Escolha da antecedência pelo paciente (1 hora, 1 dia) e segundo lembrete na véspera: não feito. Fica registrado como decisão de dose (abaixo).

## Arguição

**1. A recepção cancelou a consulta pelo sistema da clínica. O lembrete dispara?**
Dispara, se o paciente não abrir o app antes. O lembrete foi entregue ao
sistema operacional do aparelho, que não sabe nada da agenda da clínica. O
`sincronizarLembretes` resolve só quando o paciente abre a lista. A solução
completa é o servidor avisar o aparelho: push, na Aula 9.

**2. Por que agendar depois de o servidor confirmar?**
Porque a consulta pode não ser criada (rede, conflito, 401). Agendar antes
deixaria um lembrete de uma consulta que não existe, e o paciente iria à
clínica à toa. O servidor é a fonte da verdade.

**3. Diferença entre o listener de recebida e o de resposta? Por que os dois não bastam?**
O de recebida dispara quando a notificação chega com o app aberto; o de
resposta dispara quando a pessoa toca nela. Os dois só existem com o app
rodando: quando o toque *abre* o app, o listener ainda não foi registrado.
Por isso existe o `getLastNotificationResponseAsync()` na inicialização.

**4. O texto na tela bloqueada revela algo?**
"Você tem uma consulta hoje às 14:00." Não revela médico, especialidade nem
motivo. O canal ainda usa visibilidade `PRIVATE` na tela de bloqueio do
Android como segunda proteção.

## Discussão — a dose certa

- **Um lembrete por consulta, uma hora antes.** É serviço: o paciente
  marcou a consulta e o aviso é consequência do que ele fez. Um segundo
  aviso na véspera seria útil para consultas cedo, mas fica como opção do
  paciente, não padrão.
- **Promoção de exame por notificação: não.** Seria propaganda num canal que
  o paciente liberou para lembrete. O resultado previsível é ele desligar
  todas as notificações, inclusive o lembrete.
- **Sem notificação, o app funciona.** A consulta e a data continuam na lista;
  o lembrete é conveniência, não dependência.

## Responsável pelo development build (Aula 9)

| Squad | Responsável pelo build | Situação |
| --- | --- | --- |
| proj-clinica-aura | Luiz (conta Expo/EAS) | Pendente: precisa de aparelho Android e projeto EAS |
