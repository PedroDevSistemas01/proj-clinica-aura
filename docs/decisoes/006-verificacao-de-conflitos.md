# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 006 — Onde verificar conflitos da agenda |
| Squad | proj-clinica-aura |
| Data | 25/11/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Aceita** para o laboratório; revisar com a API real |

## 1. Contexto

Na Aula 10 a verificação de conflitos (mesmo médico, horários sobrepostos)
passou a rodar no aparelho, sobre 2 a 5 mil consultas, sem travar a interface.
A pergunta da extensão é se ela deveria rodar no aparelho ou no servidor.

## 2. Opções consideradas

| Opção | A favor | Contra |
| --- | --- | --- |
| **No aparelho** | Funciona com o json-server, que não tem lógica; serve de laboratório para fatiar trabalho e para a tarefa em background (Aula 11) | Baixa a agenda inteira (dados de todos os pacientes) para cada celular; cada aparelho repete o mesmo cálculo; gasta bateria e dados móveis |
| **No servidor** | Um cálculo só, na hora em que a consulta é gravada; o conflito é **recusado** em vez de descoberto depois; o celular só recebe o resultado; nada de dado alheio no aparelho | Exige API com lógica (o json-server não tem) |

## 3. Decisão

**No servidor, quando houver API real.** O argumento técnico que pesa mais:
o conflito se evita no momento da gravação (`POST /consultas` responde 409),
e isso só o servidor consegue garantir, porque dois aparelhos podem agendar
o mesmo horário ao mesmo tempo. A verificação no aparelho fica como
diagnóstico da agenda já gravada e como exercício das Aulas 10 e 11.

## 4. Consequências

- Enquanto a API for o json-server, o app baixa `/consultas` inteiro. Em produção, baixar só o necessário (ex.: `/consultas?medicoId=&dataHora_gte=`).
- O algoritmo (`src/services/conflitos.js`) é JavaScript puro e pode ser reaproveitado no servidor Node sem mudanças.

## 5. Sinais de que deu errado

- Conflitos aparecendo na verificação do aparelho que a API aceitou gravar.
- Tempo da verificação crescendo junto com o histórico (sinal de que falta filtrar por período).
