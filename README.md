# Jane D'Jesus — Realismo Pet

Site estático (landing page) de [janedjesus.com.br](https://janedjesus.com.br/).

## Estrutura

```
index.html        conteúdo da página + estilos (no <style>; cores e fontes nas variáveis do topo)
js/site.js        carrossel, FAQ, formulário → WhatsApp/Make, Meta Pixel
images/           fotos em AVIF/WebP (480/800/1200/1440 px) + JPG de reserva e favicon
```

## Configuração

No início de `js/site.js`:

- `WA_NUMBER`: número do WhatsApp que recebe os orçamentos
- `PIXEL_ID`: ID do Meta Pixel
- `WEBHOOK_URL`: webhook do Make que recebe as respostas do formulário

## Meta Pixel

Pixel `1773114370684902`, carregado com o código base oficial para todos os visitantes (sem aviso de cookies).

Só dois eventos chegam à Meta, cada um uma única vez:

| Evento | Quando | Limite |
|---|---|---|
| `PageView` | página aberta | 1 por sessão (recarregar ou voltar do WhatsApp não repete) |
| `Lead` | cadastro válido, logo antes de ir ao WhatsApp | 1 por navegador a cada 30 dias |

Desligado de propósito:
- **eventos automáticos da Meta** (`autoConfig` = false): sem `SubscribedButtonClick` em cliques e sem `Microdata`;
- **PageView automático por mudança de URL** (`disablePushState`);
- reinicialização do Pixel (trava global).

O `Lead` **não** dispara com formulário vazio/inválido, clique duplo, robô (campo-isca ou envio em menos de 4 s)
nem quando o mesmo navegador já gerou Lead. O redirecionamento espera 800 ms para o Pixel enviar o evento.

## Respostas do formulário → Make

Cada cadastro válido é enviado ao webhook do Make (`WEBHOOK_URL`) antes de abrir o WhatsApp,
por `POST` em `application/x-www-form-urlencoded` (via `sendBeacon`, que não se perde no redirecionamento).
Não vai para formulário inválido, clique duplo ou robô do campo-isca.

Campos: `lead_id`, `data_hora` (ISO, UTC), `nome`, `idade`, `nome_pet`, `whatsapp`, `whatsapp_e164`, `tipo_pet`,
`regiao`, `tamanho`, `ideia`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`,
`pixel_lead_enviado` (sim/nao), `suspeita_robo` (sim/nao), `tempo_na_pagina_s`, `fbp`, `fbc`, `pagina`, `origem`.

`lead_id` é o mesmo `eventID` do Lead no Pixel — serve para deduplicar se um dia usar a API de Conversões pelo Make.

## Desempenho

- Imagens responsivas (`<picture>` com AVIF → WebP → JPG): o navegador baixa só o tamanho necessário.
- CSS embutido no `index.html` e Google Fonts carregadas sem bloquear a renderização.
- Foto principal com `preload`; 2ª e 3ª fotos do carrossel e o Pixel só carregam depois da página.

Para trocar uma foto, gere as versões `-480`, `-800`, `-1200` (e `-1440` nas de tela cheia) em `.avif` e `.webp`,
mais um `.jpg` de 800 px com o mesmo nome base.

## Publicação

Não tem etapa de build: basta servir a pasta como está (Cloudflare Pages, GitHub Pages, Netlify ou qualquer hospedagem estática).

> Pendente: adicionar `politica-de-privacidade.html`.
