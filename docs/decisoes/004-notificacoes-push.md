# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 004 — Notificações push |
| Squad | proj-clinica-aura |
| Data | 30/09/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Proposta** (implementação na Aula 9) |

## 1. Contexto

O paciente precisa ser avisado quando a consulta é confirmada, remarcada ou
cancelada pela clínica, e lembrado na véspera. A API da clínica não consegue
entregar isso sozinha: só a Apple (APNs) e o Google (FCM) entregam mensagens a
um celular com o app fechado. Qualquer solução passa por eles.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **Expo Push Service** + `expo-notifications` | Não para enviar (token de acesso opcional). Exige credenciais FCM (Android) e APNs (iOS) cadastradas no EAS | Gratuito. Limite de cerca de 600 notificações/s por projeto | **Não funciona no Expo Go no Android a partir do SDK 53**: exige development build. Recibos de entrega precisam ser consultados depois |
| **Firebase Cloud Messaging direto** | Sim (projeto Firebase + conta de serviço no servidor) | Gratuito | Credencial de serviço só no servidor. Exige build nativo e configuração separada para iOS (APNs) |
| **OneSignal** | Sim (App ID + chave REST no servidor) | Plano gratuito para push móvel | SDK nativo, exige development build. Dados de usuários passam por mais um fornecedor (atenção à LGPD em dados de saúde) |

## 3. Decisão

**Expo Push Service.** O critério que pesou mais foi **facilidade de
integração**: uma chamada HTTP a partir da nossa API envia para Android e iOS
com o mesmo formato, e a documentação do Expo é a mesma que usamos no curso.
OneSignal foi descartado por colocar mais um terceiro com dados de pacientes;
FCM direto fica como plano B.

Complemento importante: o **lembrete da véspera** será uma notificação
**local** (`scheduleNotificationAsync`), agendada no aparelho quando a consulta
é marcada. Ela não depende de nenhum servidor e dispara mesmo sem internet.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Um único endpoint (`https://exp.host/--/api/v2/push/send`) para as duas plataformas; sem SDK de terceiro extra no app. |
| O que fica mais arriscado ou mais caro? | Exige **development build** (EAS) para testar push remoto no Android; qualquer atualização para SDK 53+ quebra o teste no Expo Go. Depende de Expo + Google + Apple ao mesmo tempo. |
| O que precisa ser providenciado antes (conta, chave, build)? | Conta Expo (EAS), projeto Firebase com credencial FCM V1 enviada ao EAS, **um aparelho Android** capaz de instalar o development build (também serve para Bluetooth, Aula 7). |
| Quem na squad fica responsável por essa providência? | Luiz (conta EAS/Firebase); aparelho Android a confirmar com a squad. |
| Até quando ela precisa estar pronta? | Antes da Aula 7 (o mesmo build serve ao Bluetooth), no máximo antes da Aula 9. |

Se o Expo Push sair do ar: a notificação de alteração não chega, mas o
**lembrete local continua disparando**, e a situação da consulta continua
visível no app ao abrir (a verdade está na nossa API, não na notificação).

## 5. Plano B

- **Enquanto estiver fora:** lembrete local + status da consulta na tela; a
  recepção pode confirmar por SMS (ADR 005).
- **Fornecedor alternativo:** FCM direto (Android) + APNs (iOS).
- **Custo de trocar:** o app passa a registrar o token nativo
  (`getDevicePushTokenAsync` em vez de `getExpoPushTokenAsync`) e o servidor
  troca a chamada. Estimativa: um a dois dias, por causa do iOS.

## 6. Como saberemos que deu errado

- Recibos com `DeviceNotRegistered` ou `InvalidCredentials` em quantidade.
- Pacientes relatando que não receberam aviso de cancelamento.
- A squad travada na Aula 9 por falta de aparelho Android/development build.
