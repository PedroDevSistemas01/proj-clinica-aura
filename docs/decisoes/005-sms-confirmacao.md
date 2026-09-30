# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 005 — SMS de confirmação de consulta |
| Squad | proj-clinica-aura |
| Data | 30/09/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Proposta** (implementação na Aula 13) |

## 1. Contexto

Parte dos pacientes da clínica não instala o app ou desativa notificações, mas
todos têm celular. A confirmação de consulta por SMS alcança essas pessoas. A
API da clínica não envia SMS: isso passa por operadora de telefonia, via
gateway contratado ou pelo chip de um aparelho.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **expo-sms** | Não | Sem custo para a clínica (usa o plano do aparelho que envia) | **Não envia sozinho**: abre o app de mensagens com texto pronto e a pessoa toca em enviar. Só funciona em aparelho com SMS (`isAvailableAsync`). Roda no Expo Go |
| **Twilio** (gateway) | Sim (Account SID + Auth Token, **só no servidor**) | Conta trial com crédito inicial; no trial só envia para números verificados e com prefixo de teste. Depois, cobrança por mensagem | Envio para o Brasil sujeito a regras de remetente. Credencial nunca pode ir para o app |
| **Zenvia** (gateway brasileiro) | Sim (token de API, **só no servidor**) | Período de teste limitado; depois, planos pagos por volume | Exige cadastro da empresa; LGPD: dados do paciente trafegam pelo gateway |

## 3. Decisão

**expo-sms, disparado pela recepção.** O critério que pesou mais foi
**custo e ausência de credencial**: não há chave para proteger nem conta paga,
e roda no Expo Go. Encaixa no fluxo real da clínica: ao confirmar o
agendamento, a recepcionista toca em "Enviar confirmação por SMS", confere o
texto e envia.

Deixamos registrado o limite dessa escolha: **confirmação automática, sem
ninguém tocar em enviar, exige gateway** (Zenvia preferido, por ser nacional e
cobrar em reais), e esse envio tem que sair **da API da clínica**, nunca do app.
Se a clínica pedir automação, este registro é substituído.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Zero custo, zero chave, implementação de uma tela; a recepção vê e revisa a mensagem antes. |
| O que fica mais arriscado ou mais caro? | Depende de uma pessoa tocar em enviar: não escala para centenas de consultas por dia. Não funciona em tablet sem chip nem no simulador iOS. O SMS sai do número do aparelho da recepção. |
| O que precisa ser providenciado antes (conta, chave, build)? | Um aparelho com chip para testar. Para a evolução com gateway: comparar o plano de teste da Zenvia e da Twilio com o volume de teste da Aula 13. |
| Quem na squad fica responsável por essa providência? | Luiz (a confirmar com a squad). |
| Até quando ela precisa estar pronta? | Antes da Aula 13. |

Se o SMS não estiver disponível (aparelho sem chip, operadora fora): o app
detecta com `isAvailableAsync`, esconde o botão e sugere confirmação por
telefone; o push (ADR 004) continua como canal principal.

## 5. Plano B

- **Enquanto estiver indisponível:** confirmação por push ou por ligação da
  recepção; o status da consulta continua visível no app.
- **Fornecedor alternativo:** gateway Zenvia (ou Twilio) chamado pela API da
  clínica em `POST /agendamentos`.
- **Custo de trocar:** o app deixa de chamar `expo-sms` e passa a só chamar a
  nossa API; o trabalho está no servidor (conta, token no `.env` do servidor,
  modelo de mensagem aprovado). Estimativa: dois a três dias, incluindo
  cadastro no gateway.

## 6. Como saberemos que deu errado

- Recepção reclamando do tempo gasto enviando confirmações uma a uma.
- Faltas de pacientes que "não receberam" a confirmação.
- Volume diário de consultas passando de algumas dezenas: hora de ir para o
  gateway.
