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

## Meta Pixel e conversão

Pixel `1773114370684902`, carregado com o código base oficial **somente depois que o visitante aceita os cookies** (LGPD).

Eventos enviados à Meta:

| Evento | Quando |
|---|---|
| `PageView` | página carregada (não é conversão) |
| **`c-lead`** | **única conversão**: cadastro válido e pessoa sendo enviada ao WhatsApp |

O `c-lead` **não** dispara quando:
- o botão é clicado com o formulário incompleto ou inválido (nome, idade 12–100, WhatsApp com DDD, tamanho);
- o botão é clicado de novo (clique duplo ou repetido);
- o mesmo WhatsApp já gerou `c-lead` neste navegador nos últimos 30 dias;
- parece robô (campo-isca preenchido ou envio em menos de 4 s após abrir a página);
- o visitante recusou os cookies.

Ele é disparado imediatamente antes do redirecionamento, que espera 800 ms para o Pixel enviar o evento.
Ajustes no topo da seção “Conversão única” em `js/site.js`: `CONVERSION_EVENT`, `DEDUP_DAYS`, `MIN_SECONDS_ON_PAGE`.

**No Gerenciador de Eventos:** `c-lead` é um evento personalizado. Para otimizar campanhas por ele, crie uma
*Conversão personalizada* baseada no evento `c-lead` (categoria Lead) e selecione-a no conjunto de anúncios.

## Publicação

Não tem etapa de build: basta servir a pasta como está (Cloudflare Pages, GitHub Pages, Netlify ou qualquer hospedagem estática).
O consentimento por país usa `/cdn-cgi/trace`, que só existe atrás da Cloudflare; fora dela, o aviso de cookies aparece para todos.

> Pendente: adicionar `politica-de-privacidade.html`.
