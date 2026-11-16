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

  // ===== Rastreamento =====
  function track(event, params = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params, ...getUtms() });
    trackMeta(event, params);
  }
  function trackMeta(event, params) {
    if (!marketingAllowed || !pixelInitialized || !window.fbq) return;
    if (event === "Form_Submit") window.fbq("track", "Lead", params);
    else if (event === "WhatsApp_Click") window.fbq("track", "Contact", params);
    else window.fbq("trackCustom", event, params);
  }
  function initPixel() {
    if (!marketingAllowed || pixelInitialized) return;
    if (!window.fbq) {
      const fbq = function (...args) { (fbq.queue = fbq.queue || []).push(args); };
      fbq.queue = []; fbq.loaded = true; fbq.version = "2.0";
      window.fbq = window._fbq = fbq;
    }
    window.fbq("consent", "grant");
    window.fbq("init", PIXEL_ID);
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    pixelInitialized = true;
    window.fbq("track", "PageView");
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
    let started = false;
    form.addEventListener("focusin", () => { if (!started) { started = true; track("Form_Start"); } });
    form.addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(form);
      const get = k => String(fd.get(k) || "").trim();
      const d = {
        nome: get("nome"), idade: get("idade"), nomePet: get("nomePet"), whatsapp: get("whatsapp"),
        pet: get("pet"), regiao: get("regiao"), tamanho: get("tamanho"), ideia: get("ideia"),
      };
      if (!d.nome || !d.idade || !d.whatsapp || !d.pet || !d.regiao || !d.tamanho) {
        error.textContent = "Preencha todos os campos obrigatórios para continuar.";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      track("Form_Submit", { pet_type: d.pet });
      track("WhatsApp_Click", { pet_type: d.pet });
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
      window.location.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    });
  }

  captureUtms();
  initConsent();
  track("Page_View");
  initHero();
  initFaq();
  initForm();
  document.getElementById("cookie-settings")?.addEventListener("click", showConsent);
})();
