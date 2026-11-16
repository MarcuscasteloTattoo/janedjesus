# Jane D'Jesus — Realismo Pet

Site estático (landing page) de [janedjesus.com.br](https://janedjesus.com.br/).

## Estrutura

```
index.html        conteúdo da página
css/style.css     estilos (cores e fontes nas variáveis do topo)
js/site.js        carrossel, FAQ, formulário → WhatsApp, cookies/Meta Pixel
images/           fotos e favicon
```

## Configuração

No início de `js/site.js`:

- `WA_NUMBER`: número do WhatsApp que recebe os orçamentos
- `PIXEL_ID`: ID do Meta Pixel
- `PRIVACY_URL`: link da política de privacidade usado no aviso de cookies

## Meta Pixel

Pixel `1773114370684902`, carregado com o código base oficial **somente depois que o visitante aceita os cookies** (LGPD).

Só dois eventos chegam à Meta, cada um uma única vez:

| Evento | Quando | Limite |
|---|---|---|
| `PageView` | página aberta | 1 por sessão (recarregar ou voltar do WhatsApp não repete) |
| `Lead` | cadastro válido, logo antes de ir ao WhatsApp | 1 por navegador a cada 30 dias |

Desligado de propósito:
- **eventos automáticos da Meta** (`autoConfig` = false): sem `SubscribedButtonClick` em cliques e sem `Microdata`;
- **PageView automático por mudança de URL** (`disablePushState`);
- reinicialização do Pixel (trava global, mesmo aceitando os cookies várias vezes).

O `Lead` **não** dispara com formulário vazio/inválido, clique duplo, robô (campo-isca ou envio em menos de 4 s)
ou cookies recusados. O redirecionamento espera 800 ms para o Pixel enviar o evento.

## Publicação

Não tem etapa de build: basta servir a pasta como está (Cloudflare Pages, GitHub Pages, Netlify ou qualquer hospedagem estática).
O consentimento por país usa `/cdn-cgi/trace`, que só existe atrás da Cloudflare; fora dela, o aviso de cookies aparece para todos.

> Pendente: adicionar `politica-de-privacidade.html`.
