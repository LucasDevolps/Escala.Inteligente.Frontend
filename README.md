# Escala Certa — frontend

Aplicação web do Sistema de Gerenciamento de Escalas. Este diretório é um projeto Angular autocontido e pode ser publicado em um repositório separado do backend.

## Stack

- Angular 22.1, componentes standalone e carregamento lazy por rota;
- TypeScript em modo `strict` e templates estritos;
- Angular Router, HttpClient, Reactive Forms e Signals;
- SCSS mobile-first, sem biblioteca visual externa;
- SignalR 10 para revogação de sessão e notificações mínimas em tempo real;
- Vitest pelo executor oficial do Angular.

Não há service worker, PWA, armazenamento offline ou persistência de credenciais no navegador.

## Executar localmente

Pré-requisitos: Node.js 22 ou superior, npm 11 e a API iniciada com o perfil HTTPS em `https://localhost:7212`.

```bash
npm install
npm start
```

Acesse `http://localhost:4200`. O arquivo `proxy.conf.json` encaminha `/api` e `/hubs` para a API local, inclusive WebSocket. Se a API usar outra porta, altere somente o `target` desse arquivo.

Comandos de validação:

```bash
npm run test:ci
npm run build
npm run check
```

O bundle de produção é gerado em `dist/schedule-manager-web`.

## Contrato com a API

A URL base permanece relativa em `/api/v1`. Isso simplifica a publicação atrás do mesmo domínio/reverse proxy e permite cookies `SameSite=Strict`. O hub fica em `/hubs/notifications`.

Eventos SignalR consumidos:

- `session.revoked`, com motivo mínimo; encerra a sessão e redireciona para `/login`;
- `notification.created`, contendo apenas `{ notificationId }`; o conteúdo é buscado depois na API autenticada.

As listagens usam `?page=1&pageSize=20` e o envelope padrão `{ items, page, pageSize, totalItems, totalPages }`. Datas de escala são strings `YYYY-MM-DD`; instantes são ISO 8601. Edições concorrentes enviam `rowVersion` Base64.

## Segurança da sessão

- O access token existe somente em memória dentro de `AuthService`. Não é gravado em `localStorage`, `sessionStorage` ou IndexedDB.
- O refresh token é recebido e enviado apenas como cookie HttpOnly pela API. Chamadas de refresh/logout usam `withCredentials`.
- O HttpClient envia o cookie legível `XSRF-TOKEN` no header `X-XSRF-TOKEN` em operações protegidas.
- A renovação ocorre perto do quarto minuto somente quando houve ponteiro, toque, teclado, formulário ou navegação interna nos últimos cinco minutos.
- Uma resposta `401` pode gerar no máximo uma tentativa coordenada de refresh. Códigos terminais (`SESSION_EXPIRED`, `SESSION_REVOKED`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSE`) limpam imediatamente a memória.
- Guards separam rotas por papel, mas a API continua sendo a autoridade de autorização.

## Rotas e papéis

| Rota                                             | Gestor                      | Colaborador                |
| ------------------------------------------------ | --------------------------- | -------------------------- |
| `/login`, `/activate`                            | pública                     | pública                    |
| `/dashboard`                                     | visão operacional           | próximo trabalho e atalhos |
| `/employees`, `/employees/new`, `/employees/:id` | gerencia                    | bloqueada                  |
| `/schedule/:year/:month`                         | cria, gera, edita e publica | consulta publicada         |
| `/time-off`                                      | analisa                     | acompanha                  |
| `/time-off/new`                                  | bloqueada                   | solicita                   |
| `/swaps`                                         | acompanha                   | solicita e responde        |
| `/notifications`                                 | consulta                    | consulta                   |

## Decisões de interface

- Calendário vira uma lista legível no celular e uma grade semanal em telas maiores.
- Estados de trabalho, folga, pendência, alerta e troca usam texto e símbolo além de cor.
- Controles têm alvo mínimo para toque, foco visível, labels e mensagens anunciadas por `aria-live`.
- O código de ativação é mostrado uma única vez após o cadastro e nunca é persistido.
- A confirmação de `COVERAGE_RISK` exige nova ação explícita do gestor.
- Conteúdo de notificação é interpolado como texto; não é usado `[innerHTML]`.
- Produtividade aparece somente nas telas protegidas de gestor.

## Publicação separada

O diretório contém seu próprio `.gitignore`, `package.json`, configurações TypeScript/Angular, testes e documentação. Para transformá-lo em repositório independente, copie `frontend/` como raiz ou inicialize o Git diretamente nesta pasta. Em produção, encaminhe `/api/v1` e `/hubs/notifications` para o backend pelo proxy reverso e sirva o SPA com fallback para `index.html`.
