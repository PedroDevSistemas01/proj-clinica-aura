# Registro de Decisão Arquitetural

## Identificação

| Campo | Preencher |
| --- | --- |
| Número e título | 001 — Consulta de CEP |
| Squad | proj-clinica-aura |
| Data | 30/09/2026 |
| Responsável pelo registro | Luiz |
| Situação | **Aceita** (implementada na Aula 5, Trilha A) |

## 1. Contexto

O cadastro de paciente pede endereço, e a recepção digita o mesmo endereço
várias vezes por dia, com erros de grafia que atrapalham o SMS e o mapa depois.
Com o CEP, logradouro, bairro, cidade e UF vêm prontos. A API da clínica não
resolve: a base de CEPs é dos Correios, muda com frequência e manter uma cópia
própria seria um projeto à parte.

## 2. Opções consideradas

| Opção | Exige chave? | Cota gratuita / limites | Termos de uso relevantes |
| --- | --- | --- | --- |
| **ViaCEP** (`viacep.com.br`) | Não | Gratuito. Não publica cota fixa, mas bloqueia temporariamente quem faz consultas em massa | Uso para consulta pontual. Proíbe varrer a base (validação em lote). HTTPS. CEP inexistente responde **200** com `{"erro": "true"}`; formato inválido responde **400 em HTML** |
| **BrasilAPI** (`brasilapi.com.br/api/cep/v2`) | Não | Gratuito, sem cota publicada; projeto comunitário sem SLA | Código aberto. Consulta vários provedores por trás. CEP inexistente responde **404** em JSON |
| **API oficial dos Correios** (CWS) | Sim (usuário + contrato) | Só para quem tem contrato comercial com os Correios | Credencial precisa ficar no servidor; não pode ir para o app |

## 3. Decisão

**ViaCEP.** O critério que pesou mais foi **facilidade de integração sem
credencial**: não tem chave para vazar, funciona no Expo Go e é o serviço usado
no Momento 2, então a squad já conhece os três formatos de resposta.
A BrasilAPI ficou como plano B por ter o mesmo contrato de uso (sem chave) e
formato parecido. Os Correios foram descartados: exigem contrato que a clínica
não tem.

## 4. Consequências

| Pergunta | Resposta da squad |
| --- | --- |
| O que fica mais fácil com essa escolha? | Cadastro mais rápido e com endereço padronizado (bom para SMS e mapa). Zero custo, zero chave, zero conta a criar. |
| O que fica mais arriscado ou mais caro? | Dependemos de um serviço gratuito sem SLA. O "não encontrado" chega como **200**, então quem esquecer de checar `erro` grava cadastro vazio achando que deu certo. Bloqueio se alguém disparar a consulta a cada tecla ou em lote. |
| O que precisa ser providenciado antes (conta, chave, build)? | Nada. Só rede no aparelho. |
| Quem na squad fica responsável por essa providência? | Luiz (manter `src/services/viacep.js`). |
| Até quando ela precisa estar pronta? | Pronta nesta aula (30/09/2026). |

Se o ViaCEP sair do ar: o formulário mostra um **aviso** ("Não foi possível
consultar o CEP agora…") e os campos de endereço continuam editáveis. **O
cadastro nunca para por causa do CEP.**

## 5. Plano B

- **Enquanto estiver fora:** preenchimento manual, com aviso não bloqueante.
  Timeout de 8 s garante que a tela não fique em "Consultando…" para sempre.
- **Fornecedor alternativo:** BrasilAPI (`/api/cep/v2/{cep}`).
- **Custo de trocar:** um arquivo só. A tela usa `consultarCep()` de
  `src/services/viacep.js`, que já devolve o **nosso** vocabulário
  (`cidade`, não `localidade`). Basta reescrever esse arquivo para a BrasilAPI
  (que usa `city`/`state`/`street`/`neighborhood`) e tratar o 404 como "não
  encontrado". Estimativa: menos de uma hora, sem tocar em tela.

## 6. Como saberemos que deu errado

- Avisos de "não foi possível consultar" aparecendo com frequência para CEPs
  válidos (indisponibilidade ou bloqueio).
- Respostas **429** ou **403** no console do Metro: sinal de que estamos
  consultando demais (conferir se alguém tirou a trava de 8 dígitos/onBlur).
- Mudança no formato da resposta (campo renomeado, `erro` virando booleano):
  endereço preenchido em branco. A tradução centralizada em `viacep.js` é o
  único lugar a ajustar.
