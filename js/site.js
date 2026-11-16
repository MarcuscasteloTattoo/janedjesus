(() => {
  // ===== Configuração =====
  const WA_NUMBER = "5511984558070";          // WhatsApp que recebe os orçamentos
  const WEBHOOK_URL = "https://hook.eu2.make.com/q6a8dovmwpmw3c6mothqlayadjkuv60o"; // Make: recebe as respostas
  const PIXEL_ID = "1773114370684902";        // Meta Pixel
  const UTM_KEY = "jd_utms";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

  let pixelInitialized = false;

  // ===== UTMs =====
  function getUtms() {
    try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}"); } catch { return {}; }
  }
  function captureUtms() {
    const qs = new URLSearchParams(location.search);
    const found = {};
    for (const key of UTM_KEYS) { const v = qs.get(key); if (v) found[key] = v; }
    if (Object.keys(found).length) { try { sessionStorage.setItem(UTM_KEY, JSON.stringify(found)); } catch {} }
  }

  // ===== Conversão única: Lead (evento padrão da Meta) =====
  // O ÚNICO evento de conversão enviado à Meta. Só dispara quando:
  //   1. o formulário passou em todas as validações;
  //   2. não é robô (campo-isca vazio e tempo mínimo na página);
  //   3. este navegador ainda não gerou Lead nos últimos 30 dias;
  //   4. a pessoa está de fato sendo enviada ao WhatsApp (disparo imediatamente
  //      antes do redirecionamento, uma vez só por envio).
  // Cliques no botão com formulário incompleto/inválido NÃO disparam nada.
  const CONVERSION_EVENT = "Lead";           // evento padrão da Meta
  const SENT_KEY = "jd_lead_sent_at";
  const PV_KEY = "jd_pageview_sent";
  const DEDUP_DAYS = 30;
  const MIN_SECONDS_ON_PAGE = 4;
  const pageLoadedAt = Date.now();

  // Um Lead por navegador a cada 30 dias, independente do número digitado.
  function alreadyConverted() {
    try {
      const at = Number(localStorage.getItem(SENT_KEY) || 0);
      return !!at && Date.now() - at < DEDUP_DAYS * 864e5;
    } catch { return false; }
  }
  function markConverted() {
    try { localStorage.setItem(SENT_KEY, String(Date.now())); } catch {}
  }
  // Retorna o eventID se o Lead foi enviado, ou "" se não foi.
  let leadSentThisPage = false;
  function trackLead(eventID, params) {
    if (!pixelInitialized || !window.fbq) return "";
    if (leadSentThisPage || alreadyConverted()) return "";
    leadSentThisPage = true;
    window.fbq("track", CONVERSION_EVENT, { content_name: "c-lead", ...params, ...getUtms() }, { eventID });
    markConverted();
    return eventID;
  }

  // ===== Envio das respostas ao Make (webhook) =====
  // Formato application/x-www-form-urlencoded: o Make separa cada campo sozinho
  // e o navegador não precisa de CORS. sendBeacon garante o envio mesmo com a
  // página saindo para o WhatsApp; fetch com keepalive é o plano B.
  function readCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function sendToWebhook(data) {
    const body = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => body.append(k, v == null ? "" : String(v)));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(WEBHOOK_URL, body)) return;
    } catch {}
    try {
      fetch(WEBHOOK_URL, { method: "POST", body, mode: "no-cors", keepalive: true }).catch(() => {});
    } catch {}
  }

  // Código base oficial do Meta Pixel (carrega para todos os visitantes).
  // Eventos enviados à Meta: PageView (1x por sessão) e Lead (1x por navegador a cada 30 dias).
  // Nada mais: os eventos automáticos da Meta (SubscribedButtonClick, Microdata)
  // e o PageView automático por mudança de URL ficam desligados.
  function initPixel() {
    if (pixelInitialized) return;
    // Trava global: se o script for incluído duas vezes, o Pixel não inicia de novo.
    if (window.__jdPixelInit) { pixelInitialized = true; return; }
    window.__jdPixelInit = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq.disablePushState = true;                 // sem PageView extra por mudança de URL
    window.fbq("set", "autoConfig", false, PIXEL_ID);   // sem eventos automáticos (cliques, Microdata)
    window.fbq("init", PIXEL_ID);
    // PageView: uma vez por sessão (voltar do WhatsApp ou recarregar não duplica).
    let pvSent = false;
    try { pvSent = sessionStorage.getItem(PV_KEY) === "1"; } catch {}
    if (!pvSent) {
      window.fbq("track", "PageView", {}, { eventID: "pv-" + pageLoadedAt + "-" + Math.random().toString(36).slice(2, 8) });
      try { sessionStorage.setItem(PV_KEY, "1"); } catch {}
    }
    pixelInitialized = true;
  }

  // ===== Carrossel do topo =====
  // A 1ª foto carrega com a página; a 2ª e a 3ª só depois que tudo terminou de carregar.
  function initHero() {
    const slides = [...document.querySelectorAll(".hero__slides img")];
    if (slides.length < 2) return;
    const loadDeferred = () => {
      document.querySelectorAll(".hero__slides [data-srcset]").forEach(el => { el.srcset = el.dataset.srcset; el.removeAttribute("data-srcset"); });
      document.querySelectorAll(".hero__slides img[data-src]").forEach(el => { el.src = el.dataset.src; el.removeAttribute("data-src"); });
    };
    let i = 0;
    afterLoad(() => {
      loadDeferred();
      setInterval(() => {
        const next = slides[(i + 1) % slides.length];
        if (!next.complete || !next.naturalWidth) return; // espera a próxima foto carregar
        slides[i].classList.remove("is-active");
        i = (i + 1) % slides.length;
        slides[i].classList.add("is-active");
      }, 5000);
    });
  }

  // Roda depois do carregamento completo da página, quando o navegador estiver livre.
  function afterLoad(fn) {
    const run = () => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
    if (document.readyState === "complete") run(); else window.addEventListener("load", run, { once: true });
  }

  // ===== FAQ (um aberto por vez) =====
  function initFaq() {
    const items = [...document.querySelectorAll(".faq__item")];
    items.forEach(item => {
      item.querySelector("button").addEventListener("click", () => {
        const willOpen = !item.classList.contains("is-open");
        items.forEach(other => {
          const open = other === item && willOpen;
          other.classList.toggle("is-open", open);
          other.querySelector("button").setAttribute("aria-expanded", String(open));
        });
      });
    });
  }

  // ===== Formulário → WhatsApp =====
  function initForm() {
    const form = document.getElementById("lead-form");
    if (!form) return;
    const error = document.getElementById("form-error");
    const btn = form.querySelector('button[type="submit"]');
    let submitting = false;
    const showError = text => { error.textContent = text; error.hidden = false; };

    // Ao voltar do WhatsApp (botão "voltar"), libera o formulário de novo.
    window.addEventListener("pageshow", () => {
      submitting = false;
      btn.disabled = false;
      btn.textContent = "Receber meu orçamento";
    });

    form.addEventListener("submit", e => {
      e.preventDefault();
      if (submitting) return;                       // ignora clique duplo
      const fd = new FormData(form);
      const get = k => String(fd.get(k) || "").trim();
      const d = {
        nome: get("nome"), idade: get("idade"), nomePet: get("nomePet"), whatsapp: get("whatsapp"),
        pet: get("pet"), regiao: get("regiao"), tamanho: get("tamanho"), ideia: get("ideia"),
      };
      const phone = d.whatsapp.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
      const idade = Number(d.idade.replace(/\D/g, ""));

      if (!d.nome || !d.idade || !d.whatsapp || !d.pet || !d.regiao || !d.tamanho) {
        return showError("Preencha todos os campos obrigatórios para continuar.");
      }
      if (d.nome.replace(/[^\p{L}]/gu, "").length < 2) return showError("Informe seu nome.");
      if (!(idade >= 12 && idade <= 100)) return showError("Informe uma idade válida.");
      if (!/^\d{10,11}$/.test(phone)) return showError("Informe um WhatsApp válido com DDD.");
      if (!/\d/.test(d.tamanho)) return showError("Informe o tamanho em centímetros.");
      error.hidden = true;

      submitting = true;
      btn.disabled = true;
      btn.textContent = "Abrindo o WhatsApp…";

      // Anti-robô: campo-isca preenchido ou envio rápido demais → sem conversão.
      const isBot = get("website") !== "" || (Date.now() - pageLoadedAt) / 1000 < MIN_SECONDS_ON_PAGE;
      const leadId = "lead-" + phone + "-" + Date.now();
      const pixelLead = isBot ? "" : trackLead(leadId, { pet_type: d.pet });
      const sent = !!pixelLead;

      // Respostas → Make (robôs pegos pelo campo-isca não são enviados).
      if (get("website") === "") {
        const utms = getUtms();
        sendToWebhook({
          lead_id: leadId,
          data_hora: new Date().toISOString(),
          nome: d.nome,
          idade: idade,
          nome_pet: d.nomePet,
          whatsapp: d.whatsapp,
          whatsapp_e164: "+55" + phone,
          tipo_pet: d.pet,
          regiao: d.regiao,
          tamanho: d.tamanho,
          ideia: d.ideia,
          utm_source: utms.utm_source, utm_medium: utms.utm_medium, utm_campaign: utms.utm_campaign,
          utm_term: utms.utm_term, utm_content: utms.utm_content, gclid: utms.gclid, fbclid: utms.fbclid,
          pixel_lead_enviado: sent ? "sim" : "nao",
          suspeita_robo: isBot ? "sim" : "nao",
          tempo_na_pagina_s: Math.round((Date.now() - pageLoadedAt) / 1000),
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          pagina: location.href.split("#")[0],
          origem: document.referrer,
        });
      }
      const msg = [
        "Olá, Jane! Gostaria de conversar sobre uma tatuagem de Realismo Pet.",
        `Nome: ${d.nome}`,
        `Idade: ${d.idade}`,
        `Nome do Pet: ${d.nomePet || "-"}`,
        `WhatsApp: ${d.whatsapp}`,
        `Tipo de Pet: ${d.pet}`,
        `Região: ${d.regiao}`,
        `Tamanho: ${d.tamanho}`,
        `Ideia: ${d.ideia || "-"}`,
        "Gostaria de saber mais sobre o meu projeto.",
      ].join("\n");
      const go = () => { window.location.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`; };
      // Dá tempo do Pixel enviar o Lead antes de sair da página.
      if (sent) setTimeout(go, 800); else go();
    });
  }

  captureUtms();
  afterLoad(initPixel);  // Pixel fora do caminho crítico
  initHero();
  initFaq();
  initForm();
})();
