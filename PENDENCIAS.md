# Pendências do projeto (atualizado na Aula 7)

Lista única do que ficou em aberto até aqui. Cada item aponta onde está o detalhe.

## Precisa de aparelho físico ou development build

- [ ] **Bluetooth em modo real (Aula 7):** trocar `MODO_SIMULADO` para `false` em `src/services/bluetooth.js` e testar num development build (`npx expo run:android` ou EAS) com um medidor de frequência cardíaca de verdade. Detalhes: `docs/aula7-checklist-bluetooth.md`.
- [ ] **Conferir câmera, biometria e GPS num celular (Aula 6):** os itens abertos estão em `docs/aula6-checklist-perifericos.md`.
- [ ] **Development build para push (Aula 9):** conta Expo/EAS, projeto Firebase e um aparelho Android (ADR 004). O mesmo build serve ao Bluetooth real.

## Precisa de conta, chave ou decisão da squad

- [ ] **Chave do Google Maps (Aula 12, até 22/10/2026):** conta Google Cloud com faturamento, chave restrita ao pacote do app, guardada no `.env` (ADR 003).
- [ ] **SMS (Aula 13):** aparelho com chip para testar o `expo-sms`; gateway (Zenvia ou Twilio) só se a clínica quiser confirmação automática (ADR 005).
- [ ] **Revisão cruzada e Pull Requests:** as branches das Aulas 5, 6 e 7 estão no GitHub, mas nenhuma foi revisada nem integrada na `main`.
- [ ] **Nomes da squad:** o README e os ADRs ainda usam "Luiz" como responsável e têm placeholders de integrantes.

## Dívidas técnicas conscientes

- [ ] **Foto de perfil é só a URI do cache (Aula 6):** some se o sistema limpar o cache e não abre em outro aparelho. Solução: upload da imagem para o servidor.
- [ ] **Quem pode ver a foto do paciente:** hoje qualquer pessoa logada. Depende de perfis (recepção × médico) na API.
- [ ] **Coordenadas da clínica no código:** `src/config/clinica.js`. Viram marcador de mapa na Aula 12.
- [ ] **Sinais vitais sem tela de consulta (Aula 7):** a importação abre pelo cartão do paciente; mover para a consulta quando ela existir.
- [ ] **Biometria ativa para todos:** oferecer como opção nos ajustes do app (extensão da Aula 6).
- [ ] **Extensões de Bluetooth:** nível de bateria do periférico (0x180F) e reconexão automática com limite de tentativas.
- [ ] **API real com HTTPS:** o mock local continua em HTTP (Aula 4).
