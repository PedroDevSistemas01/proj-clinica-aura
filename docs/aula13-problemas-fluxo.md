# Aula 13 — Fluxo inteiro do desafio: problemas encontrados

> O roteiro (Passo 5) pede para percorrer o fluxo num aparelho, sem consertar
> nada no meio. Nesta rodada **não havia aparelho**: o percurso foi feito
> lendo o código de cada etapa e rodando os servidores (json-server, API de
> autenticação e gateway) com `curl`. Cada item diz como foi conferido. O
> percurso no aparelho continua pendente e deve completar esta lista.
>
> Esta lista é o ponto de partida da Aula 14: cada problema vira um teste.

## Percurso

| # | Etapa | Resultado | Como foi conferido |
| --- | --- | --- | --- |
| 1 | Entrar (senha ou biometria) | ok, com ressalva (P3) | código + `curl POST /login` |
| 2 | Ver médicos e especialidades | ok | código |
| 3 | Ver a clínica no mapa e a distância | ok desde a Aula 12 (P1 resolvido) | código + testes |
| 4 | Agendar uma consulta | ok | código |
| 5 | Conferir o lembrete local | ok ("Lembretes pendentes") | código |
| 6 | Foto de perfil | ok, com ressalva (P5) | código |
| 7 | Sinais vitais (simulado) | ok, fora da consulta (P6) | código |
| 8 | Cancelar e conferir lembrete, push e SMS | ok, com ressalva (P4) | código + `curl POST /sms` |
| 9 | Fechar, reabrir e conferir a sincronização | **quebra**: reabrir não sincroniza (P2) | código |

## Problemas

| # | Problema | Passos para reproduzir | Degrau do teste (Aula 14) |
| --- | --- | --- | --- |
| P1 | Não há mapa: "Como chegar" mostra distância e tempo, mas nenhum mapa | Menu → Como chegar | integração (`MapaClinica.test.js`). **Resolvido na Aula 12** |
| P2 | Abrir o app do zero não sincroniza a agenda: a sincronização só dispara ao **voltar** do segundo plano (`AppState`), não na abertura | Fechar o app por completo, abrir, ir em Menu → Sincronização: a última atualização continua a antiga | integração (Menu) |
| P3 | Sessão "meio viva": a API de autenticação guarda as sessões em memória. Depois que ela reinicia, a biometria destranca o token velho, o json-server aceita qualquer token, e só o SMS pelo servidor responde 401 e devolve ao login | Entrar, reiniciar `npm run auth-api`, destrancar com biometria, tentar "Enviar pela clínica" | integração (EnviarSms com 401) |
| P4 | Cancelamento depende da ordem certa: o `DELETE` vem antes, então o servidor não acha mais a consulta para montar o SMS. Resolvido mandando `pacienteId` e `dataHora` no pedido (o número continua vindo do cadastro) | `curl POST /sms` com consulta apagada e sem os extras → 404 | unidade/integração (cancelamento) |
| P5 | Foto de perfil é só a URI do cache do aparelho | Trocar de aparelho ou limpar o cache | — (dívida conhecida) |
| P6 | Sinais vitais abrem pelo cartão do paciente, não pela consulta | Pacientes → Sinais vitais | — (dívida conhecida) |
| P7 | Push de cancelamento não sai automaticamente quando a recepção cancela pelo app: só pelo script `enviar-push.js cancelamento` | Cancelar uma consulta no app e esperar o aviso em outro aparelho | — (exige servidor real) |

## As duas costuras que o roteiro manda conferir

- **Permissão negada derrubando outro recurso:** negar a localização não
  afeta o agendamento. As permissões ficam nos services de cada recurso
  (`localizacao.js`, `lembretes.js`) e nenhuma tela de agenda depende do GPS.
  Conferido no código; falta conferir no aparelho.
- **A consulta cancelada que continua avisando:** neste aparelho, cancelar
  apaga o lembrete local (`cancelarLembrete` depois do `DELETE`), o
  `lembretes-do-dia` do push não encontra mais a consulta, e o SMS não sai
  sozinho (só se a recepção aceitar a oferta). **Em outro aparelho** o
  lembrete local continua até ele sincronizar (Aula 11) ou receber o push de
  cancelamento (Aula 9).
