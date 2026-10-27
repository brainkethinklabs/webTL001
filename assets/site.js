(() => {
  'use strict';
  const root = document.documentElement;
  const config = window.FACAI_CONFIG || {};
  const whatsapp = /^\d{10,15}$/.test(config.whatsapp || '') ? config.whatsapp : '56948004839';
  const email = config.email || 'tlfacai@outlook.es';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const nav = $('#nav');
  const navToggle = $('.nav-toggle');
  function closeMenu(returnFocus = false) {
    nav?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Abrir menú');
    if (returnFocus) navToggle?.focus();
  }
  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('#nav a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', event => { if (nav && !nav.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) closeMenu(true);
  });
  matchMedia('(min-width: 981px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Explicit preview choice overrides the OS preference for this browser session only.
  let choice = new URLSearchParams(location.search).get('motion');
  try { choice = choice || sessionStorage.getItem('facai-motion'); } catch {}
  let paused = choice === 'on' ? false : choice === 'off' ? true : reducedMotion.matches;
  function syncMotion() {
    root.classList.toggle('motion-paused', paused);
    root.classList.toggle('motion-enabled', !paused);
    $$('[data-motion]').forEach(button => {
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Activar animaciones' : 'Pausar animaciones';
    });
    document.dispatchEvent(new CustomEvent('facai:motion', {detail:{active:!paused}}));
  }
  function rememberMotion(){try{sessionStorage.setItem('facai-motion',paused?'off':'on');}catch{}}
  if(choice === 'on' || choice === 'off') rememberMotion();
  $$('[data-motion]').forEach(button => button.addEventListener('click', () => { paused = !paused; choice=paused?'off':'on'; rememberMotion(); syncMotion(); }));
  reducedMotion.addEventListener('change', event => { if(choice)return; paused = event.matches; syncMotion(); });
  syncMotion();
  document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));

  // Real client assets are optional. An empty list keeps clearly labeled sample slots.
  const clients = Array.isArray(config.clientes) ? config.clientes.filter(client =>
    typeof client.nombre === 'string' && /^assets\/clientes\/[a-zA-Z0-9_./-]+\.(svg|png|webp|jpg)$/i.test(client.imagen || '') && !client.imagen.includes('..')
  ) : [];
  if (clients.length) {
    $$('.marquee-group').forEach((group, index) => {
      group.replaceChildren();
      const repeats = Math.max(1, Math.ceil(6 / clients.length));
      for (let n = 0; n < repeats; n++) clients.forEach(client => {
        const image = new Image(145, 46);
        const logoClasses = String(client.clase || '').split(/\s+/).filter(name => ['logo-transparent','logo-on-light','logo-on-dark','logo-biochem'].includes(name));
        image.className = 'client-logo ' + (logoClasses.length ? logoClasses.join(' ') : 'logo-transparent'); image.loading = 'eager'; image.decoding = 'async';
        image.alt = index === 0 && n === 0 ? client.nombre : '';
        image.src = client.imagen; group.append(image);
      });
    });
    $$('.clients-title > span').forEach(el => el.textContent = 'CLIENTES');
    $$('.client-note').forEach(el => el.hidden = true);
  }
  $$('[data-marquee-pause]').forEach(button => button.addEventListener('click', () => {
    const marquee = $('[data-marquee]', button.closest('.clients'));
    const stopped = marquee.classList.toggle('paused');
    button.setAttribute('aria-pressed', String(stopped));
    button.setAttribute('aria-label', stopped ? 'Reanudar carrusel de clientes' : 'Pausar carrusel de clientes');
    button.textContent = stopped ? '▷ Reanudar' : 'Ⅱ Pausar';
  }));

  const controllers = new WeakMap();
  const escapeFocus = el => { if (el) el.focus({ preventScroll: true }); };
  $$('[data-quote-form]').forEach(form => {
    form.noValidate = true;
    const fields = $$('[data-step]', form), progress = $$('.quote-progress li', form);
    const next = $('[data-next]', form), previous = $('[data-prev]', form);
    const result = $('.quote-result', form), actions = $('.quote-actions', form), status = $('.form-status', form);
    const nextMarkup = next.innerHTML;
    let step = 0;
    const now = new Date();
    form.elements.fecha.min = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    function showStep(value, focus = true) {
      step = value; result.hidden = true; actions.hidden = false;
      fields.forEach((field, index) => field.hidden = index !== step);
      progress.forEach((item, index) => {
        item.classList.toggle('current', index === step); item.classList.toggle('complete', index < step);
        if (index === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      });
      previous.hidden = step === 0;
      if (step === 2) next.textContent = 'Preparar solicitud ↗'; else next.innerHTML = nextMarkup;
      status.textContent = '';
      if (focus) escapeFocus($('input,select,textarea', fields[step]));
    }
    function validate() {
      for (const input of $$('input,select,textarea', fields[step])) {
        if (input.required && input.type !== 'checkbox') input.setCustomValidity(input.value.trim() ? '' : 'Completa este campo.');
        if (!input.checkValidity()) { status.textContent = 'Revisa los campos indicados para continuar.'; input.reportValidity(); return false; }
      }
      return true;
    }
    function prepare() {
      const data = new FormData(form), value = key => String(data.get(key) || '').trim();
      const optional = (key, fallback = 'Por definir') => value(key) || fallback;
      const day = value('fecha'), formattedDate = day ? day.split('-').reverse().join('/') : 'Por definir';
      const message = `Hola FACAI, quisiera cotizar un traslado.\n\nServicio: ${value('servicio')}\nOrigen: ${value('origen')}\nDestino: ${value('destino')}\nFecha estimada: ${formattedDate}\n\nCarga: ${value('carga')}\nPeso aproximado: ${value('peso') ? value('peso') + ' kg' : 'Por definir'}\nDimensiones (largo × ancho × alto): ${optional('dimensiones')}\nCondiciones: ${optional('condiciones', 'Sin observaciones adicionales')}\n\nNombre: ${value('nombre')}\nEmpresa: ${optional('empresa', 'No indicada')}\nCorreo: ${optional('email', 'No indicado')}\nTeléfono: ${optional('telefono', 'No indicado')}`;
      $('[data-summary]', form).textContent = message;
      $('[data-wa-result]', form).href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
      $('[data-email-result]', form).href = `mailto:${email}?subject=${encodeURIComponent('Solicitud de cotización · FACAI')}&body=${encodeURIComponent(message)}`;
      fields.forEach(field => field.hidden = true); actions.hidden = true;
      progress.forEach(item => { item.classList.remove('current'); item.classList.add('complete'); item.removeAttribute('aria-current'); });
      result.hidden = false; status.textContent = 'Solicitud preparada. Revisa el resumen antes de abrir WhatsApp.';
      escapeFocus($('[data-wa-result]', form));
    }
    form.addEventListener('submit', event => { event.preventDefault(); if (!validate()) return; if (step < 2) showStep(step + 1); else prepare(); });
    form.addEventListener('input', event => { if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity(''); });
    previous.addEventListener('click', () => showStep(Math.max(0, step - 1)));
    $('[data-edit]', form).addEventListener('click', () => showStep(0));
    controllers.set(form, {
      seed(values) {
        for (const key of ['origen', 'destino', 'servicio', 'condiciones']) {
          if (typeof values[key] !== 'string') continue;
          const field = form.elements[key];
          if (key === 'servicio' && ![...field.options].some(option => option.value === values[key])) continue;
          field.value = values[key].slice(0, key === 'condiciones' ? 700 : 150); field.setCustomValidity('');
        }
        showStep(0, false);
      }
    });
    showStep(0, false);
  });
  const dialog = $('.quote-dialog'), dialogForm = dialog && $('[data-quote-form]', dialog);
  function openQuote(seed = {}) {
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    controllers.get(dialogForm).seed(seed); closeMenu(); dialog.showModal();
    root.classList.add('quote-open'); document.body.classList.add('modal-open');
    escapeFocus(dialogForm.elements.servicio); return true;
  }
  dialog?.addEventListener('close', () => { root.classList.remove('quote-open'); document.body.classList.remove('modal-open'); });
  $('[data-close]', dialog || document)?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  $$('[data-quote]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const params = new URL(link.href, location.href).searchParams;
    const seed = Object.fromEntries(['origen', 'destino', 'servicio', 'condiciones'].filter(key => params.has(key)).map(key => [key, params.get(key)]));
    if (link.dataset.destino) seed.destino = link.dataset.destino;
    if (openQuote(seed)) event.preventDefault();
  }));
  $$('[data-quick-quote]').forEach(form => {
    form.addEventListener('input', event => event.target.setCustomValidity?.(''));
    form.addEventListener('submit', event => {
      for (const field of $$('input[required]', form)) {
        field.setCustomValidity(field.value.trim() ? '' : 'Indica una ciudad o localidad.');
        if (!field.reportValidity()) { event.preventDefault(); return; }
      }
      if (openQuote(Object.fromEntries(new FormData(form)))) event.preventDefault();
    });
  });
  const pageForm = $('#quote-page');
  if (pageForm) controllers.get(pageForm).seed(Object.fromEntries(new URLSearchParams(location.search)));
})();
