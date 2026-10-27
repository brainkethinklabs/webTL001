(() => {
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const motion=()=>!document.documentElement.classList.contains('motion-paused');
  $$('[data-geo-console]').forEach(shell=>{
    const observer=new IntersectionObserver(async entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();try{const module=await import('./map.js');await module.initMap(shell);}catch{$('[data-map-loading]',shell).hidden=true;$('[data-map-fallback]',shell).hidden=false;}},{rootMargin:'150px'});observer.observe(shell);
  });
  $$('[data-tms-demo]').forEach(demo=>$$('[data-tms-tab]',demo).forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.tmsTab;$$('[data-tms-tab]',demo).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('[data-tms-panel]',demo).forEach(p=>p.hidden=p.dataset.tmsPanel!==key);
    $('[data-tms-breadcrumb]',demo).textContent={overview:'Resumen',operations:'Operaciones',documents:'Documentos'}[key];
    $('[data-tms-title]',demo).textContent={overview:'El control empieza con claridad.',operations:'Cada traslado, en perspectiva.',documents:'La información, en su lugar.'}[key];
  })));
  $$('[data-slider]').forEach(slider=>{
    const track=$('[data-slider-track]',slider),original=$$('[data-slide]',track),counter=$('[data-slide-counter]',slider),pause=$('[data-slide-pause]',slider),bar=$('.slider-progress span',slider);
    let slides=original.slice(),index=0,physical=1,timer=null,visible=false,hover=false,focused=false,stopped=false,locked=false,finishTimer=null,progress=null;
    const canPlay=()=>visible&&motion()&&!document.hidden&&!document.body.classList.contains('modal-open')&&!hover&&!focused&&!stopped&&slides.length>1;
    function schedule(){clearTimeout(timer);progress?.cancel();slider.dataset.autoRunning=String(canPlay());if(!canPlay())return;progress=bar.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:5000,fill:'forwards'});timer=setTimeout(()=>advance(1,false),5000);}
    function position(animate=true){track.style.transition=animate&&motion()?'transform 650ms cubic-bezier(.22,.7,.2,1)':'none';track.style.transform=`translate3d(-${physical*100}%,0,0)`;}
    function active(manual=false){
      slides.forEach((slide,n)=>{slide.inert=n!==index;slide.setAttribute('aria-hidden',String(n!==index));slide.setAttribute('aria-label',`${n+1} de ${slides.length}`);});
      [slides[index],slides[(index+1)%slides.length]].filter(Boolean).forEach(slide=>{const img=$('img',slide);img.loading='eager';});
      counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;slider.dataset.slideIndex=String(index);
      if(manual)$('[data-slide-announcement]',slider).textContent=`Foto ${index+1} de ${slides.length}: ${$('figcaption',slides[index]).textContent}`;
    }
    function finish(){clearTimeout(finishTimer);if(physical===0||physical===slides.length+1){physical=index+1;position(false);}locked=false;}
    function advance(delta,manual=true){if(locked||slides.length<2)return;locked=true;index=(index+delta+slides.length)%slides.length;physical+=delta;active(manual);position();if(!motion())finish();else finishTimer=setTimeout(finish,700);schedule();}
    track.addEventListener('transitionend',e=>{if(e.target===track&&e.propertyName==='transform')finish();});
    function rebuild(filter='all'){
      clearTimeout(finishTimer);locked=false;index=0;physical=1;slides=original.filter(s=>filter==='all'||s.dataset.category===filter);track.replaceChildren();
      if(!slides.length)return;
      const clone=slide=>{const el=slide.cloneNode(true);el.removeAttribute('data-slide');el.dataset.clone='';el.inert=true;el.setAttribute('aria-hidden','true');$$('[data-photo]',el).forEach(a=>{a.removeAttribute('data-photo');a.tabIndex=-1;});return el;};
      track.append(clone(slides.at(-1)),...slides,clone(slides[0]));slider.classList.add('slider-ready');position(false);active();schedule();
      $$('[data-slide-prev],[data-slide-next],[data-slide-pause]',slider).forEach(b=>b.disabled=slides.length<2);
    }
    $('[data-slide-prev]',slider).addEventListener('click',()=>advance(-1));$('[data-slide-next]',slider).addEventListener('click',()=>advance(1));
    pause.addEventListener('click',()=>{stopped=!stopped;pause.setAttribute('aria-pressed',String(stopped));pause.setAttribute('aria-label',stopped?'Reanudar galería':'Pausar galería');pause.innerHTML=stopped?'▷ <span>Reanudar</span>':'Ⅱ <span>Pausar</span>';if(!stopped){hover=false;focused=false;}schedule();});
    slider.addEventListener('mouseenter',()=>{hover=true;schedule();});slider.addEventListener('mouseleave',()=>{hover=false;schedule();});
    slider.addEventListener('focusin',()=>{focused=true;schedule();});slider.addEventListener('focusout',()=>queueMicrotask(()=>{focused=slider.contains(document.activeElement);schedule();}));
    slider.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();advance(e.key==='ArrowRight'?1:-1);}});
    let start=null,swiped=false;const viewport=$('.slider-viewport',slider);
    viewport.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];swiped=false;},{passive:true});
    viewport.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start[0],dy=e.clientY-start[1];start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){swiped=true;advance(dx<0?1:-1);}});
    viewport.addEventListener('pointercancel',()=>start=null);
    viewport.addEventListener('click',e=>{if(swiped){e.preventDefault();e.stopPropagation();swiped=false;}},true);
    const section=slider.closest('[data-gallery]');if(section)$$('[data-gallery-filter]',section).forEach(button=>button.addEventListener('click',()=>{$$('[data-gallery-filter]',section).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));rebuild(button.dataset.galleryFilter);}));
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.25}).observe(slider);
    document.addEventListener('visibilitychange',schedule);document.addEventListener('facai:motion',()=>{finish();schedule();});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
    rebuild();
  });
  if($('[data-photo]')){
    const dialog=document.createElement('dialog');dialog.className='photo-dialog';dialog.setAttribute('aria-label','Vista ampliada de imagen');
    const close=document.createElement('button');close.type='button';close.className='photo-close';close.textContent='Cerrar ×';const img=new Image();img.alt='';const caption=document.createElement('p');dialog.append(close,img,caption);document.body.append(dialog);
    let opener;function finish(){dialog.close();document.body.classList.remove('modal-open');opener?.focus();}close.addEventListener('click',finish);dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});dialog.addEventListener('click',e=>{if(e.target===dialog)finish();});
    document.addEventListener('click',e=>{const a=e.target.closest('[data-photo]');if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();opener=a;img.src=a.href;img.alt=$('img',a).alt;caption.textContent=a.dataset.caption;dialog.showModal();document.body.classList.add('modal-open');close.focus();});
  }
  // Reveal real content once as it enters the viewport; no text is replaced or delayed for crawlers.
  const revealTargets=$$('main h1,main h2,main h3,main p,main .eyebrow,main .reveal').filter(el=>!el.closest('[data-slider],.geo-console,.tms-app,.quote-form,.quick-quote,dialog,.clients')&&!el.parentElement.closest('.reveal'));
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');revealObserver.unobserve(entry.target);} }),{threshold:.08,rootMargin:'0px 0px -35px 0px'});
  revealTargets.forEach((el,i)=>{el.classList.add('scroll-reveal');el.style.setProperty('--reveal-delay',`${i%3*65}ms`);revealObserver.observe(el);});
  document.documentElement.classList.add('scroll-effects-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;observer.unobserve(entry.target);const el=entry.target,end=Number(el.dataset.count);if(!motion())return;const start=performance.now();function frame(t){const p=Math.min((t-start)/950,1);el.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1&&motion())requestAnimationFrame(frame);else el.textContent=end;}requestAnimationFrame(frame);}),{threshold:.5});$$('[data-count]').forEach(el=>observer.observe(el));
  const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);let ticking=false;
  addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const total=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${total>0?scrollY/total:0})`;ticking=false;});},{passive:true});
})();
