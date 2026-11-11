/* Only aggregate, explicitly allowlisted events. Never transmit quote fields or link queries. */
(() => {
  'use strict';
  const production = ['facai.cl', 'www.facai.cl'].includes(location.hostname);
  const id = 'G-68JYEYC0WL';
  const key = 'facai-analytics-consent-v1';
  let enabled = false;
  let loaded = false;
  let choice = null;
  try { choice = localStorage.getItem(key); } catch {}
  const cleanPage = document.querySelector('link[rel="canonical"]')?.href || location.origin + location.pathname;
  // Recognize only FACAI's public campaign vocabulary; never forward arbitrary queries.
  const campaign = {};
  const params = new URLSearchParams(location.search);
  const sources = { linkedin: 'organic_social', instagram: 'organic_social', google: 'organic', firma: 'email', presentacion: 'referral' };
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const name = params.get('utm_campaign');
  if (Object.hasOwn(sources, source) && sources[source] === medium && ['posicionamiento_facai', 'guia_transporte', 'casos_facai'].includes(name)) {
    campaign.campaign_source = source;
    campaign.campaign_medium = medium;
    campaign.campaign_name = name;
    if (['perfil', 'publicacion', 'historia', 'firma', 'qr'].includes(params.get('utm_content'))) campaign.campaign_content = params.get('utm_content');
  }
  let referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch {}
  window.dataLayer = window.dataLayer || [];
  const tag = (...args) => window.dataLayer.push(argumentsArray(args));
  function argumentsArray(args) { return (function () { return arguments; })(...args); }
  tag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  function start() {
    enabled = true;
    window['ga-disable-' + id] = false;
    if (!production || loaded) return;
    loaded = true;
    tag('consent', 'update', { analytics_storage: 'granted' });
    tag('js', new Date());
    tag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: cleanPage, page_referrer: referrer, ...campaign });
    tag('event', 'page_view', { page_location: cleanPage, page_referrer: referrer, page_title: document.title });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  const allowed = new Set(['quote_start', 'quote_step', 'quote_prepared', 'whatsapp_click', 'email_click', 'phone_click', 'scroll_depth']);
  function track(name, values = {}) {
    if (!production || !enabled || !allowed.has(name)) return;
    const safe = { page_location: cleanPage, page_referrer: referrer };
    if (Number.isInteger(values.step) && values.step >= 1 && values.step <= 3) safe.step = values.step;
    if ([25, 50, 75, 100].includes(values.percent)) safe.percent = values.percent;
    if (['floating', 'quote', 'navigation', 'content'].includes(values.placement)) safe.placement = values.placement;
    tag('event', name, safe);
  }
  document.addEventListener('facai:measurement', e => track(e.detail?.name, e.detail));
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a');
    if (!a) return;
    let url;
    try { url = new URL(a.href); } catch { return; }
    const placement = a.matches('.whatsapp-float') ? 'floating' : a.matches('[data-wa-result],[data-email-result]') ? 'quote' : a.closest('header,footer') ? 'navigation' : 'content';
    if (url.hostname === 'wa.me') track('whatsapp_click', { placement });
    else if (url.protocol === 'mailto:') track('email_click', { placement });
    else if (url.protocol === 'tel:') track('phone_click', { placement });
  });
  const depths = new Set();
  document.addEventListener('scroll', () => {
    if (!enabled) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max <= 0) return;
    const percent = Math.min(100, Math.round(scrollY / max * 100));
    for (const threshold of [25, 50, 75, 100]) if (percent >= threshold && !depths.has(threshold)) {
      depths.add(threshold); track('scroll_depth', { percent: threshold });
    }
  }, { passive: true });
  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'Preferencias de medición');
  panel.innerHTML = '<div><strong>Ayúdanos a mejorar tu experiencia.</strong><p>Con tu permiso usamos Google Analytics para conocer visitas y recorridos. No enviamos los datos de tu cotización. <a href="privacidad.html">Ver privacidad</a></p></div><div class="consent-actions"><button type="button" data-analytics="yes">Aceptar medición</button><button type="button" data-analytics="no">Solo lo necesario</button></div>';
  panel.hidden = choice === 'yes' || choice === 'no';
  document.body.append(panel);
  function decide(value) {
    try { localStorage.setItem(key, value); } catch {}
    choice = value; panel.hidden = true;
    if (value === 'yes') start();
    else {
      enabled = false;
      window['ga-disable-' + id] = true;
      // No further tracking requests after withdrawal; clear first-party GA cookies.
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ['', ';domain=facai.cl', ';domain=.facai.cl']) document.cookie = name + '=;max-age=0;path=/' + domain + ';SameSite=Lax;Secure';
      }
      if (loaded) location.reload();
    }
  }
  panel.querySelectorAll('[data-analytics]').forEach(button => button.addEventListener('click', () => decide(button.dataset.analytics)));
  document.querySelectorAll('[data-privacy-settings]').forEach(button => button.addEventListener('click', () => {
    panel.hidden = false; panel.querySelector('button').focus();
  }));
  if (choice === 'yes') start();
})();
