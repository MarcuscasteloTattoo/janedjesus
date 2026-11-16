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

## Publicação

Não tem etapa de build: basta servir a pasta como está (Cloudflare Pages, GitHub Pages, Netlify ou qualquer hospedagem estática).
O consentimento por país usa `/cdn-cgi/trace`, que só existe atrás da Cloudflare; fora dela, o aviso de cookies aparece para todos.

> Pendente: adicionar `politica-de-privacidade.html`.
