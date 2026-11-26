# Aula 13 — Matriz de consolidação dos recursos (Aulas 3 a 13)

> O arquivo `A13_05_Matriz_Consolidacao_Recursos.docx` não veio no material
> recebido, então a matriz está aqui, com as colunas que o roteiro pede
> (Passo 4): estado real, quem responde e o que cada recurso exige.
> **Estado** = funcionando (conferido) · parcial · não feito.
> "Funcionando" quer dizer conferido no código, nos testes ou no bundle; nada
> foi percorrido num aparelho nesta rodada (ver o fluxo, abaixo).

| Aula | Recurso | Estado | Quem responde | O que exige para funcionar |
| --- | --- | --- | --- | --- |
| 3 | CRUD de médicos e pacientes | funcionando | Luiz | json-server no ar (porta 3000); IP da máquina no `api.js` em celular físico |
| 4 | Login com token e cofre (SecureStore) | funcionando | Luiz | API de autenticação no ar (3001); não roda no navegador |
| 5 | CEP (ViaCEP) e geocoding (Nominatim) | funcionando | Luiz | Internet |
| 6 | Foto de perfil (câmera/galeria) | parcial | Luiz | Aparelho físico; a foto é só a URI do cache (não vai ao servidor) |
| 6 | Login com biometria | funcionando | Luiz | Aparelho com digital/rosto cadastrado |
| 6 | Como chegar (GPS + distância) | funcionando | Luiz | Aparelho físico com GPS |
| 7 | Sinais vitais via Bluetooth | parcial | Luiz | Modo simulado roda no Expo Go; o real exige development build e um medidor BLE |
| 8 | Lembrete local da consulta | funcionando | Luiz | Permissão de notificação; disparo com app fechado ainda não visto num aparelho |
| 9 | Push (aviso de cancelamento, lembrete do dia) | parcial | Luiz | Development build, conta EAS + `projectId`, credencial FCM, aparelho físico |
| 10 | Conflitos da agenda sem travar a tela | funcionando | Luiz | Volume gerado (`npm run gerar-consultas`) |
| 11 | Sincronização (manual e ao voltar ao app) | funcionando | Luiz | Nada além da API |
| 11 | Tarefa periódica em background | parcial | Luiz | Development build com `BACKGROUND_REAL = true` |
| 12 | Mapa da clínica | **não feito** | ninguém ainda | Chave do Google Maps (ADR 003); material da Aula 12 não recebido |
| 13 | SMS pelo aparelho | parcial | Luiz | Aparelho físico **com chip**; o app não fica sabendo se foi enviado |
| 13 | SMS pelo servidor (gateway simulado) | funcionando | Luiz | json-server (3000), API de autenticação (3001) e gateway (3002) no ar |

**Primeiro problema a resolver:** todas as linhas têm o mesmo responsável.
A squad precisa dividir as frentes antes da Aula 16 (os nomes ainda são
placeholders no README).

**A coluna que vai doer na Aula 16:** cinco recursos dependem de aparelho
físico ou development build (foto, Bluetooth real, push, tarefa em
background, SMS pelo aparelho). Sem um Android com o build pronto, a
apresentação mostra só os modos simulados.

## Regra dos três canais (Parte C do roteiro)

| Canal | Custo | Precisa de internet? | Precisa do app? | Quem decide a hora |
| --- | --- | --- | --- | --- |
| Notificação local (Aula 8) | grátis | não | sim | o app, quando agendou |
| Push (Aula 9) | grátis | sim | sim | o servidor |
| SMS (Aula 13) | por mensagem | não | não | o servidor |

**Regra adotada pela squad:** o lembrete da consulta é **local** (uma hora
antes). Mudança feita pela clínica (cancelamento, remarcação) vai por
**push** para quem tem o app. **SMS** só para o que não pode falhar ou para
quem não tem o app, e sempre com a recepção decidindo (o app oferece, não
envia sozinho). Nunca os três para a mesma consulta.
