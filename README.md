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

## Meta Pixel e conversões

Pixel `1773114370684902`, carregado com o código base oficial **somente depois que o visitante aceita os cookies** (LGPD).

| Momento | Evento Meta |
|---|---|
| Página carregada | `PageView` |
| Começou a preencher o formulário | `Form_Start` (personalizado) |
| **Cadastro concluído** (formulário válido enviado) | **`CompleteRegistration`** e `Lead` |
| Abertura do WhatsApp | `Contact` |

Na conversão, o redirecionamento para o WhatsApp espera 800 ms para o Pixel conseguir enviar o evento.
Cada conversão leva um `eventID` único, pronto para deduplicar com a API de Conversões se ela for usada no futuro.

## Publicação

Não tem etapa de build: basta servir a pasta como está (Cloudflare Pages, GitHub Pages, Netlify ou qualquer hospedagem estática).
O consentimento por país usa `/cdn-cgi/trace`, que só existe atrás da Cloudflare; fora dela, o aviso de cookies aparece para todos.

> Pendente: adicionar `politica-de-privacidade.html`.
