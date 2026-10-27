/* FACAI territorial explorer. Sources are local; tiles and routing are external. */
import {normalizePlace, communeLabel, resolveCommune, estimateTruckTime} from './route-utils.js';
export async function initMap(shell) {
  const $ = s => shell.querySelector(s), $$ = s => [...shell.querySelectorAll(s)];
  const motion = () => !document.documentElement.classList.contains('motion-paused');
  const norm = normalizePlace;
  const empty = () => ({type:'FeatureCollection',features:[]});
  const feature = (coordinates, properties={}) => ({type:'Feature',geometry:{type:'Point',coordinates},properties});
  let map, ready=false, cities=[], selectedPoint=null, request=null, timer=null, tourIndex=0, lastRequest=0;
  const markers=[], cache=new Map();
  const status = message => $('[data-route-status]').textContent=message;
  const label = communeLabel;
  const setText = (selector,value) => $(selector).textContent=value;
  const load = async file => { const r=await fetch(new URL(`data/${file}`,import.meta.url)); if(!r.ok) throw new Error(file); return r.json(); };
  function tab(name) {
    $$('[data-geo-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.geoTab===name)); b.tabIndex=b.dataset.geoTab===name?0:-1;});
    $('#geo-explore').hidden=name!=='explore'; $('#geo-route').hidden=name!=='route';
  }
  $$('[data-geo-tab]').forEach(b=>{
    b.addEventListener('click',()=>tab(b.dataset.geoTab));
    b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=b.dataset.geoTab==='explore'?'route':'explore';tab(next);$(`[data-geo-tab="${next}"]`).focus();}});
  });
  function stopTour(){clearInterval(timer);timer=null;$('[data-map-tour]').setAttribute('aria-pressed','false');}
  function camera(options){if(!map)return;map.easeTo({...options,pitch:$('[data-view="3d"]').getAttribute('aria-pressed')==='true'?(options.pitch??map.getPitch()):0,duration:motion()?1300:0,essential:false});}
  const views={all:{center:[-71.7,-36.8],zoom:3.55,pitch:38,bearing:-9},norte:{center:[-69.5,-23.5],zoom:5.35,pitch:58,bearing:-14},centro:{center:[-71,-33.4],zoom:6.1,pitch:58,bearing:-16},sur:{center:[-72.6,-43],zoom:4.65,pitch:52,bearing:-12}};
  function macro(name,manual=true){
    if(manual)stopTour();
    if(name==='all'&&map)map.fitBounds([[-76.4,-56.3],[-66.4,-17.3]],{padding:35,pitch:$('[data-view="3d"]').getAttribute('aria-pressed')==='true'?20:0,bearing:0,duration:motion()?1300:0});
    else camera({...views[name],pitch:$('[data-view="3d"]').getAttribute('aria-pressed')==='true'?views[name].pitch:0});
    $$('[data-macro]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.macro===name)));
    setText('[data-map-caption]',name==='all'?'CHILE / VISTA TERRITORIAL':`MACROZONA ${name.toUpperCase()}`);
    setText('[data-macro-description]',{all:'Una mirada al territorio, de Arica a la zona austral.',norte:'Arica, Tarapacá, Antofagasta, Atacama y Coquimbo. Minería, energía y conexiones portuarias.',centro:'Valparaíso, Metropolitana, O’Higgins y Maule. Industria, centros de distribución y puertos.',sur:'De Ñuble a Magallanes. Industria, infraestructura y conexiones australes.'}[name]);
    if(ready&&map.getLayer('facai-regions'))map.setPaintProperty('facai-regions','fill-opacity',name==='all'?.17:['case',['==',['get','macrozona'],name],.28,.04]);
  }
  $$('[data-macro]').forEach(b=>b.addEventListener('click',()=>macro(b.dataset.macro)));
  $('[data-map-reset]').addEventListener('click',()=>macro('all'));
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{
    stopTour();$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));camera({pitch:b.dataset.view==='3d'?60:0,bearing:b.dataset.view==='3d'?-15:0});
  }));
  $('[data-map-tour]').addEventListener('click',()=>{if(timer){stopTour();return;}if(!motion()){setText('[data-map-status]','Activa el movimiento en el pie de página para recorrer');return;}tourIndex=0;macro(['norte','centro','sur'][tourIndex++],false);$('[data-map-tour]').setAttribute('aria-pressed','true');timer=setInterval(()=>macro(['norte','centro','sur'][tourIndex++%3],false),6500);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});
  new MutationObserver(()=>{if(!motion())stopTour();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stopTour();}).observe(shell);
  $('[data-map-fullscreen]').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{shell.classList.toggle('geo-expanded');map?.resize();}});
  document.addEventListener('fullscreenchange',()=>map?.resize());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('geo-expanded')){shell.classList.remove('geo-expanded');map?.resize();}});
  const form=$('[data-route-form]');
  function clearRoute(message='Selecciona origen y destino para calcular un recorrido.'){
    request?.abort();request=null;markers.splice(0).forEach(m=>m.remove());if(ready)map.getSource('facai-route')?.setData(empty());$('[data-route-results]').hidden=true;status(message);
  }
  form.addEventListener('input',e=>{e.target.setCustomValidity?.('');if(e.target.name==='destino')selectedPoint=null;clearRoute('Ruta modificada. Vuelve a calcular el recorrido.');});
  $('[data-route-swap]').addEventListener('click',()=>{const a=form.elements.origen,b=form.elements.destino;[a.value,b.value]=[b.value,a.value];selectedPoint=null;clearRoute();});
  $('[data-route-clear]').addEventListener('click',()=>{clearRoute();form.reset();selectedPoint=null;});
  function resolve(value){return resolveCommune(cities,value);}
  const typeNames={solar:'Parque fotovoltaico',mina:'Referencia minera',desaladora:'Desalación',puerto:'Referencia portuaria',ciudad:'Ciudad'};
  function showPoint(f){
    const p=f.properties;selectedPoint={nombre:p.nombre,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],routable:true};
    $('[data-poi-card]').hidden=false;setText('[data-poi-type]',typeNames[p.tipo]||'Referencia territorial');setText('[data-poi-name]',p.nombre);setText('[data-poi-note]',p.nota||'Referencia comunal. No representa una dirección de carga.');
    const a=$('[data-poi-source]');a.href=/^https:\/\//.test(p.url)?p.url:'https://ide.subdere.gov.cl/descargas-con-filtros/';a.textContent=`${p.fuente||'SUBDERE'} ↗`;
    tab('explore');camera({center:f.geometry.coordinates,zoom:Math.max(map.getZoom(),9),pitch:55});
  }
  $('[data-poi-route]').addEventListener('click',()=>{if(!selectedPoint)return;form.elements.destino.value=selectedPoint.nombre;clearRoute('Punto referencial seleccionado. Indica el origen; el acceso final requiere evaluación.');tab('route');form.elements.origen.focus();});
  form.addEventListener('submit',async e=>{
    e.preventDefault();stopTour();
    const a=resolve(form.elements.origen.value), b=selectedPoint?.nombre===form.elements.destino.value?selectedPoint:resolve(form.elements.destino.value);
    if(!a||!b){status('Selecciona una comuna del listado para cada extremo de la ruta.');return;}
    if(a.routable===false||b.routable===false||!Number.isFinite(a.lat)||!Number.isFinite(b.lat)){status('Este territorio no dispone de un punto de conexión vial utilizable. Solicita una evaluación comercial.');return;}
    if(a.lat===b.lat&&a.lng===b.lng){status('El origen y el destino son iguales. Para un traslado dentro de la comuna, solicita evaluación indicando las direcciones.');return;}
    const cfg=window.FACAI_CONFIG||{}, local=['localhost','127.0.0.1'].includes(location.hostname);
    const endpoint=cfg.rutasEndpoint||(local?'https://router.project-osrm.org/route/v1/driving/':null);
    if(!endpoint){status('La planificación vial estará disponible al habilitar el servicio de rutas. Puedes cotizar indicando origen y destino.');return;}
    const key=`${a.lng},${a.lat};${b.lng},${b.lat}`;
    if(Date.now()-lastRequest<1500&&!cache.has(key)){status('Espera un momento antes de volver a calcular.');return;}
    clearRoute('Calculando el recorrido sobre la red vial…');const controller=new AbortController();request=controller;const timeout=setTimeout(()=>controller.abort(),25000);const button=$('[data-route-calculate]');button.disabled=true;
    try{
      let data=cache.get(key);
      if(!data){lastRequest=Date.now();const response=await fetch(`${endpoint.replace(/\/$/,'')}/${key}?overview=full&geometries=geojson&steps=true&generate_hints=false`,{signal:controller.signal});if(!response.ok)throw new Error('provider');data=await response.json();if(data.code!=='Ok'||!data.routes?.length)throw new Error('route');cache.set(key,data);}
      if(controller.signal.aborted)return;
      const route=data.routes[0],estimate=estimateTruckTime(route.distance,route.duration),km=estimate.kilometers,mins=estimate.minutes;
      setText('[data-route-km]',Math.round(km).toLocaleString('es-CL'));setText('[data-route-hours]',`${Math.floor(mins/60)} h ${String(mins%60).padStart(2,'0')} min`);
      const steps=route.legs.flatMap(l=>l.steps||[]), byRoad=new Map();steps.forEach(s=>{const n=s.ref||s.name;if(n)byRoad.set(n,(byRoad.get(n)||0)+s.distance);});
      const roads=[...byRoad].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name])=>/^\d/.test(name)?`Ruta ${name}`:name);
      setText('[data-route-road]',`Vías de referencia: ${roads.join(' · ')||'red vial disponible'}.`);
      $('[data-route-results]').hidden=false;status('Recorrido calculado. Revisa las condiciones antes de planificar el traslado.');
      const params=new URLSearchParams({origen:a.nombre,destino:b.nombre,condiciones:`Referencia vial: ${Math.round(km)} km; ${Math.floor(mins/60)} h ${mins%60} min orientativos sin paradas. Requiere evaluación para camión.`});$('[data-route-quote]').href=`contacto.html?${params}`;
      if(ready){map.getSource('facai-route').setData({type:'Feature',geometry:route.geometry,properties:{}});const bounds=new maplibre.LngLatBounds();route.geometry.coordinates.forEach(c=>bounds.extend(c));map.fitBounds(bounds,{padding:65,pitch:35,bearing:0,duration:motion()?1500:0});[a,b].forEach((c,i)=>{const el=document.createElement('div');el.className='route-marker';el.textContent=i?'B':'A';el.setAttribute('aria-label',`${i?'Destino':'Origen'}: ${c.nombre}`);markers.push(new maplibre.Marker({element:el}).setLngLat([c.lng,c.lat]).addTo(map));});}
    }catch(error){if(request===controller)status(controller.signal.aborted?'La consulta tardó demasiado. Intenta otra vez o solicita evaluación comercial.':'No se encontró un recorrido disponible. Puede faltar conexión vial o el proveedor no estar disponible. No se ha estimado una línea recta.');}
    finally{clearTimeout(timeout);button.disabled=false;if(request===controller)request=null;}
  });
  let maplibre;
  try{
    const [communes,regions,poi,lib]=await Promise.all([load('comunas.json'),load('regiones.geojson'),load('poi.geojson'),import('./vendor/maplibre-gl.mjs')]);
    cities=communes;maplibre=lib;const datalist=$('#comunas-list'),frag=document.createDocumentFragment();cities.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')).forEach(c=>{const o=document.createElement('option');o.value=label(c);frag.append(o);});datalist.append(frag);
    setText('[data-commune-status]',`${cities.length} comunas · puntos de referencia municipales`);
    setText('[data-data-summary]',`16 regiones · ${cities.length} comunas · ${poi.features.length} referencias industriales`);
    maplibre.setWorkerUrl(new URL('./vendor/maplibre-gl-worker.mjs',import.meta.url).href);
    const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./vendor/maplibre-gl.css',import.meta.url).href;document.head.append(css);
    map=new maplibre.Map({container:$('#facai-map'),style:new URL('./data/map-style.json',import.meta.url).href,...views.all,attributionControl:{compact:true},maxPitch:80,minZoom:2,maxZoom:16,renderWorldCopies:false,cooperativeGestures:true,locale:{'NavigationControl.ZoomIn':'Acercar','NavigationControl.ZoomOut':'Alejar','NavigationControl.ResetBearing':'Restablecer orientación','AttributionControl.ToggleAttribution':'Fuentes del mapa','Map.Title':'Mapa de Chile'}});
    new ResizeObserver(()=>map.resize()).observe($('#facai-map'));
    map.addControl(new maplibre.NavigationControl({visualizePitch:true}),'top-right');
    map.on('dragstart',stopTour);map.on('zoomstart',e=>{if(e.originalEvent)stopTour();});
    const watchdog=setTimeout(()=>{if(!ready){$('[data-map-loading]').hidden=true;$('[data-map-fallback]').hidden=false;setText('[data-map-status]','Cartografía sin conexión');}},20000);
    map.on('load',()=>{
      clearTimeout(watchdog);ready=true;$('[data-map-loading]').hidden=true;$('[data-map-fallback]').hidden=true;setText('[data-map-status]','Explorador territorial');
      macro('all',false);
      map.addSource('facai-dem',{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:512,encoding:'terrarium'});
      map.addSource('facai-hillshade',{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json',tileSize:512,encoding:'terrarium'});
      const firstLine=map.getStyle().layers.find(l=>l.type==='line')?.id;
      map.addLayer({id:'facai-hillshade',type:'hillshade',source:'facai-hillshade',paint:{'hillshade-exaggeration':.7,'hillshade-shadow-color':'#020c16','hillshade-highlight-color':'#9ebdce','hillshade-accent-color':'#24445a'}},firstLine);
      map.setTerrain({source:'facai-dem',exaggeration:1.2});
      map.addSource('facai-regions',{type:'geojson',data:regions});
      const zoneColor=['match',['get','macrozona'],'norte','#dda863','centro','#65bdea','sur','#65c4ac','#a0a0a0'];
      map.addLayer({id:'facai-regions',type:'fill',source:'facai-regions',paint:{'fill-color':zoneColor,'fill-opacity':.17}});
      map.addLayer({id:'facai-region-lines',type:'line',source:'facai-regions',paint:{'line-color':zoneColor,'line-width':1.2,'line-opacity':.65}});
      const mainNames=['Arica','Iquique','Antofagasta','Calama','Copiapó','La Serena','Valparaíso','San Antonio','Santiago','Rancagua','Talca','Chillán','Concepción','Temuco','Valdivia','Puerto Montt','Coyhaique','Punta Arenas'];
      const cf=cities.filter(c=>mainNames.includes(c.nombre)&&Number.isFinite(c.lat)).map(c=>feature([c.lng,c.lat],{...c,tipo:'ciudad'}));
      const points=[...cf,...poi.features],selector=$('[data-poi-select]');
      for(const kind of ['ciudad','solar','mina','desaladora','puerto']){const group=document.createElement('optgroup');group.label=typeNames[kind];points.filter(f=>f.properties.tipo===kind).sort((a,b)=>a.properties.nombre.localeCompare(b.properties.nombre,'es')).forEach(f=>{const option=document.createElement('option');option.value=String(points.indexOf(f));option.textContent=f.properties.nombre;group.append(option);});selector.append(group);}
      selector.addEventListener('change',()=>{if(selector.value==='')return;const f=points[Number(selector.value)];const kind=f.properties.tipo;const layer=$(`[data-layer="${kind==='ciudad'?'cities':kind}"]`);if(layer&&!layer.checked){layer.checked=true;layer.dispatchEvent(new Event('change'));}stopTour();showPoint(f);});
      map.addSource('facai-cities',{type:'geojson',data:{type:'FeatureCollection',features:cf}});
      map.addLayer({id:'facai-cities',type:'circle',source:'facai-cities',paint:{'circle-radius':4,'circle-color':'#eefaff','circle-stroke-color':'#338caf','circle-stroke-width':2}});
      map.addLayer({id:'facai-city-labels',type:'symbol',source:'facai-cities',layout:{'text-field':['get','nombre'],'text-font':['Noto Sans Regular'],'text-size':12,'text-offset':[.9,0],'text-anchor':'left'},paint:{'text-color':'#f2fbff','text-halo-color':'#092034','text-halo-width':2}});
      map.addSource('facai-poi',{type:'geojson',data:poi});
      for(const [kind,color] of Object.entries({solar:'#f8c671',mina:'#f18c72',desaladora:'#69d7e3',puerto:'#b9a1ef'})){
        map.addLayer({id:`facai-${kind}`,type:'circle',source:'facai-poi',filter:['==',['get','tipo'],kind],layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,5,12,9],'circle-color':color,'circle-stroke-width':2,'circle-stroke-color':'#102c3e'}});
        map.on('click',`facai-${kind}`,e=>showPoint(e.features[0]));map.on('mouseenter',`facai-${kind}`,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',`facai-${kind}`,()=>map.getCanvas().style.cursor='');
      }
      map.on('click','facai-cities',e=>showPoint(e.features[0]));
      map.addSource('facai-route',{type:'geojson',data:empty()});
      map.addLayer({id:'facai-route-glow',type:'line',source:'facai-route',paint:{'line-color':'#24b9ff','line-width':12,'line-opacity':.16}});
      map.addLayer({id:'facai-route-line',type:'line',source:'facai-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#7fd8ff','line-width':4}});
      $$('[data-layer]').forEach(input=>{
        function update(){const name=input.dataset.layer;if(name==='terrain'){map.setTerrain(input.checked?{source:'facai-dem',exaggeration:1.2}:null);map.setLayoutProperty('facai-hillshade','visibility',input.checked?'visible':'none');return;}const ids=name==='macrozones'?['facai-regions','facai-region-lines']:name==='cities'?['facai-cities','facai-city-labels']:[`facai-${name}`];ids.forEach(id=>map.setLayoutProperty(id,'visibility',input.checked?'visible':'none'));}
        input.addEventListener('change',update);update();
      });
    });
    $$('[data-location]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.location.replaceAll('-',' '),c=cities.find(c=>norm(c.nombre)===key);if(c){stopTour();camera({center:[c.lng,c.lat],zoom:10,pitch:62,bearing:-20});setText('[data-map-caption]',`${c.nombre.toUpperCase()} / VISTA DE TERRENO`);}}));
  }catch(error){$('[data-map-loading]').hidden=true;$('[data-map-fallback]').hidden=false;setText('[data-map-status]','Vista cartográfica alternativa');if(!cities.length)setText('[data-commune-status]','No se pudo cargar el catálogo. Vuelve a intentarlo.');}
  $('[data-map-retry]').addEventListener('click',()=>location.reload());
}
