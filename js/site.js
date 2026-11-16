(() => {
  // ===== Configuração =====
  const WA_NUMBER = "5511984558070";          // WhatsApp que recebe os orçamentos
  const PIXEL_ID = "1773114370684902";        // Meta Pixel
  const PRIVACY_URL = "/politica-de-privacidade.html";
  const CONSENT_KEY = "jd_marketing_consent";
  const CONSENT_VERSION = "2026-10-01";
  const UTM_KEY = "jd_utms";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  const CONSENT_COUNTRIES = new Set(["AT","BE","BG","BR","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB","GR","HR","HU","IE","IS","IT","LI","LT","LU","LV","MT","NL","NO","PL","PT","RO","SE","SI","SK"]);

  let pixelInitialized = false;
  let marketingAllowed = false;

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
  // Retorna true se o Lead foi enviado.
  let leadSentThisPage = false;
  function trackLead(phone, params) {
    if (!marketingAllowed || !pixelInitialized || !window.fbq) return false;
    if (leadSentThisPage || alreadyConverted()) return false;
    leadSentThisPage = true;
    const eventID = "lead-" + phone + "-" + Date.now();
    window.fbq("track", CONVERSION_EVENT, { content_name: "c-lead", ...params, ...getUtms() }, { eventID });
    markConverted();
    return true;
  }

  // Código base oficial do Meta Pixel (só roda após o consentimento).
  // Eventos enviados à Meta: PageView (1x por sessão) e Lead (1x por navegador a cada 30 dias).
  // Nada mais: os eventos automáticos da Meta (SubscribedButtonClick, Microdata)
  // e o PageView automático por mudança de URL ficam desligados.
  function initPixel() {
    if (!marketingAllowed || pixelInitialized) return;
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
    window.fbq("consent", "grant");
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

  // ===== Consentimento (LGPD/GDPR) =====
  function readConsent() {
    try {
      const v = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      if (!v || v.noticeVersion !== CONSENT_VERSION || !["accepted", "rejected"].includes(v.choice)) return null;
      return v;
    } catch { return null; }
  }
  function applyConsent(allowed) {
    marketingAllowed = allowed;
    if (allowed) initPixel(); else window.fbq?.("consent", "revoke");
  }
  function setConsent(choice) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, decidedAt: new Date().toISOString(), noticeVersion: CONSENT_VERSION }));
    } catch {}
    applyConsent(choice === "accepted");
    document.getElementById("cookie-consent")?.remove();
  }
  function showConsent() {
    if (document.getElementById("cookie-consent")) return;
    const el = document.createElement("aside");
    el.id = "cookie-consent";
    el.className = "consent";
    el.setAttribute("aria-label", "Preferências de cookies");
    el.innerHTML = `
      <h2>Sua privacidade</h2>
      <p>Com sua permissão, usamos o Pixel da Meta para medir visitas e ações, como o envio do formulário e o contato pelo WhatsApp. Você pode recusar ou mudar sua escolha a qualquer momento. Veja a nossa <a href="${PRIVACY_URL}">Política de Privacidade</a>.</p>
      <div class="consent__actions">
        <button type="button" data-choice="rejected">Recusar</button>
        <button type="button" data-choice="accepted" class="consent__accept">Aceitar</button>
      </div>`;
    el.querySelectorAll("[data-choice]").forEach(b => b.addEventListener("click", () => setConsent(b.dataset.choice)));
    document.body.appendChild(el);
  }
  async function initConsent() {
    const existing = readConsent();
    if (existing) { applyConsent(existing.choice === "accepted"); return; }
    // Detecta o país via Cloudflare; se não der, pede consentimento por segurança.
    let required = true;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    try {
      const r = await fetch("/cdn-cgi/trace", { cache: "no-store", signal: ctrl.signal });
      if (r.ok) {
        const loc = (await r.text()).split("\n").find(l => l.startsWith("loc="))?.slice(4).trim().toUpperCase();
        required = !loc || loc === "XX" || loc === "T1" || CONSENT_COUNTRIES.has(loc);
      }
    } catch {} finally { clearTimeout(t); }
    if (required) showConsent(); else applyConsent(true);
  }

  // ===== Carrossel do topo =====
  function initHero() {
    const slides = [...document.querySelectorAll(".hero__slides img")];
    if (slides.length < 2) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    }, 5000);
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
      const sent = !isBot && trackLead(phone, { pet_type: d.pet });
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
  initConsent();
  initHero();
  initFaq();
  initForm();
  document.getElementById("cookie-settings")?.addEventListener("click", showConsent);
})();
