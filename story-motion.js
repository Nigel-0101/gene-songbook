/* Continuous reversible journey: wildlife bridges the opening and profile. */
(()=>{'use strict';
const root=document.documentElement,desktop=matchMedia('(min-width:801px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const intro=document.getElementById('profile-panel'),catalog=document.getElementById('catalog'),toggle=document.getElementById('motion-toggle');
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
let p=0,queued=false,manualStatic=null,arrivalStart=null,arrivalDone=false,arrivalFrame=0,wasDesktop=desktop.matches,hiddenAt=0,progressTime=0,snapProgress=false,hintArrival=null;
const renderedValues=new Map();
const isStatic=()=>manualStatic??reduced.matches,travel=()=>isStatic()?innerHeight:Math.max(4200,innerHeight*5.2),set=(n,v)=>{if(renderedValues.get(n)===v)return;renderedValues.set(n,v);root.style.setProperty('--'+n,v);};
const sceneLayers=['.env-garden','.env-cove','.env-library','.coral-wipe','.passage-bridge','.launch-atmosphere'].map(s=>document.querySelector(s));
function showSceneLayers(values){sceneLayers.forEach((element,i)=>{if(!element)return;const active=String(!desktop.matches||values[i]>.00001);if(element.dataset.renderActive!==active)element.dataset.renderActive=active;});}
function paint(){
 queued=false;
 const still=isStatic(),now=performance.now(),target=desktop.matches?clamp(scrollY/travel()):clamp((scrollY+100)/Math.max(1,catalog.offsetTop));
 const dt=Math.min(.05,Math.max(0,(now-progressTime)/1000));progressTime=now;
 // The current, creatures and scene reveal share a reversible playhead.
 const scrub=desktop.matches&&!still&&!snapProgress&&Math.abs(target-p)<.2&&((target>.07&&target<.36)||(p>.07&&p<.36)||(target>.70&&target<.985)||(p>.70&&p<.985));
 if(scrub&&Math.abs(target-p)>.00008){
  const step=(target-p)*(1-Math.exp(-dt/(p<.36?.09:.16)));
  p+=Math.sign(step)*Math.min(Math.abs(step),dt*(p<.36?.22:.09));schedule();
 }else p=target;
 snapProgress=false;
 if(arrivalStart===null&&window.geneOpening?.ready)arrivalStart=performance.now();
 const elapsed=arrivalStart===null?0:(performance.now()-arrivalStart)/1000;
 if(p>.025||still||!desktop.matches||elapsed>=8)arrivalDone=true;
 const arrival=arrivalDone?1:smooth(1.3,5.15,elapsed),at=(a,b)=>arrivalDone?1:smooth(a,b,elapsed);
 document.body.classList.toggle('static-ocean',still);toggle.setAttribute('aria-pressed',String(still));toggle.textContent=still?'动态浏览':'静态浏览';
 set('travel',travel()+'px');set('progress',p);set('arrival',arrival);set('title-opacity',at(4.9,6.1));set('header-opacity',at(6.2,7.1));set('hint-opacity',at(7,7.8));
 set('launch-camera',at(2.35,5.15));set('launch-gate',1-at(2.35,5.15));set('launch-light',at(1.3,5.15));set('launch-flare',arrivalDone?0:smooth(.1,1.5,elapsed)*(1-smooth(4.5,5.5,elapsed)));set('launch-vignette',arrivalDone?0:.88*(1-smooth(1.8,5.15,elapsed)));
 for(let i=0;i<4;i++)set('glyph-'+i,at(5.1+i*.17,6.2+i*.17));
 window.geneOpening?.update({elapsed,done:arrivalDone,p,still,mobile:!desktop.matches});
 const out=1-smooth(.585,.65,p),profile=still?(p<.5?1:0):smooth(.235,.27,p)*out,profileMove=still?1:smooth(.24,.275,p),paper=still?1:smooth(.24,.285,p),text=still?1:smooth(.265,.30,p);
 const reveal=still?1:smooth(.09,.22,p);
 set("passage-pan",still?0:smooth(.065,.23,p));set("bridge-opacity",still?0:smooth(.065,.09,p)*(1-smooth(.205,.235,p)));
 const library=still?(p>=.5?1:0):(p>=.67?1:0),garden=still?0:1-smooth(.21,.235,p),cove=still?1-library:p>.085&&p<.67?1:0;
 set('passage-edge',(115-140*reveal)+'%');set('passage-reveal',reveal);
 const book=still?library:smooth(.695,.72,p),flight=still?1:smooth(.75,.835,p),open=still?1:smooth(.85,.96,p),dock=still?1:smooth(.85,.94,p),pages=still?1:smooth(.925,.995,p),tab=still?1:smooth(.918,.975,p);
 set('env-garden',garden);set('env-cove',cove);set('env-library',library);set('depth',smooth(0,.12,p)*.12);set('cove-depth',smooth(.24,.65,p));set('ruins-depth',smooth(.67,1,p));set('bright',1);set('realm',library);set('shade',garden&&!still?.94*(1-arrival):0);
 set('passage-ui',still?1:1-.45*smooth(.09,.14,p)*(1-smooth(.20,.24,p)));set('opening-opacity',still?0:1-smooth(.05,.105,p));set('profile-opacity',profile);set('profile-scale',1);set('profile-move',profileMove);set('profile-paper',paper);set('profile-avatar',still?1:smooth(.235,.275,p));set('profile-text',text);set('profile-links',still?1:smooth(.285,.315,p));
 set('book-left',still?1:smooth(.88,.935,p));set('book-leaf-1',still?1:smooth(.87,.945,p));set('book-leaf-2',still?1:smooth(.885,.96,p));set('book-physical',still?0:1-smooth(.96,.968,p));set('book-ink',pages);set('book-paper-visible',open>.002?'visible':'hidden');
 // The invitation waits for the book to settle at the reader, even if scrolling stops.
 if(still||!desktop.matches||flight<.9998)hintArrival=null;
 else if(hintArrival===null)hintArrival=now;
 const hint=hintArrival===null?0:smooth(120,650,now-hintArrival)*(1-smooth(.02,.28,open));
 if(hintArrival!==null&&now-hintArrival<650)schedule();
 set('book-hint-visible',hint>.001?'visible':'hidden');
 set('reading-focus',Math.max(profile*paper*.6,book*smooth(.83,.965,p)));set('catalog-opacity',book);set('catalog-scale',1);set('book-flight',flight);set('book-open',open);set('book-dock',dock);set('book-pages',pages);set('bookmark',tab);set('cover-alpha',1);set('book-hint',hint);
 const grow=still?0:smooth(.603,.66,p),retreat=still?0:smooth(.69,.75,p);const wipe=still?0:smooth(.603,.62,p)*(1-smooth(.73,.75,p));set('wipe-opacity',wipe);set('coral-grow',grow*(1-retreat));set('coral-cover',still?0:smooth(.64,.66,p)*(1-smooth(.69,.72,p)));set('wipe-x',0);
 showSceneLayers([garden,cove,library,wipe,still?0:smooth(.065,.09,p)*(1-smooth(.205,.235,p)),arrivalDone?0:1]);
 document.body.dataset.environment=garden?'garden':library?'library':'cove';document.body.classList.add('light-water');
 document.querySelector('.masthead').inert=desktop.matches&&((!arrivalDone&&elapsed<6.2)||(!still&&p>.11&&p<.205));document.querySelector('.journey-nav').inert=desktop.matches&&((!arrivalDone&&elapsed<6.2)||(!still&&p>.11&&p<.205));
 intro.inert=desktop.matches&&(profile<.98||text<.98);catalog.inert=desktop.matches&&(pages<.995||book<.98);
 const scene=desktop.matches?(book>.5?2:profile>.5?1:0):(p>.65?2:1);document.querySelectorAll('[data-scene]').forEach(a=>{if(+a.dataset.scene===scene)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});window.geneOcean?.update(p,still,!desktop.matches);
}
function go(id,{instant=false,focus=false}={}){const destination=id==='catalog'?catalog:intro,value=id==='catalog'?1:id==='profile'&&!isStatic()?.52:0;if(id!=='intro')arrivalDone=true;const top=desktop.matches?value*travel():id==='intro'?0:Math.max(0,destination.getBoundingClientRect().top+scrollY-72);const skip=instant||isStatic()||id==='catalog';snapProgress=skip;scrollTo({top,behavior:skip?'instant':'smooth'});history.replaceState(null,'','#'+id);if(skip)paint();if(focus){destination.inert=false;const h=destination.querySelector('h1,h2');h.tabIndex=-1;h.focus({preventScroll:true});}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(paint);}}function tick(){paint();if(!arrivalDone&&!document.hidden)arrivalFrame=requestAnimationFrame(tick);}
function skipOpening(){arrivalDone=true;cancelAnimationFrame(arrivalFrame);paint();}
function replayOpening(){if(!desktop.matches||isStatic())return;cancelAnimationFrame(arrivalFrame);go('intro',{instant:true});arrivalStart=performance.now();arrivalDone=false;window.geneOpening?.restart();tick();}
window.geneJourney={go,skipOpening,replayOpening,toCatalog:()=>go('catalog'),resetSongs:()=>{document.querySelectorAll('.folio-rows,.songs-scroll').forEach(e=>e.scrollTop=0);if(!desktop.matches)document.getElementById('search').scrollIntoView({block:'start',behavior:'instant'});},getState:()=>({progress:p,travel:travel(),desktop:desktop.matches,static:isStatic(),arrival:arrivalDone})};
document.querySelectorAll('a[href="#intro"],a[href="#profile"],a[href="#catalog"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.hash.slice(1),{focus:a.classList.contains('skip-link')});}));
toggle.addEventListener('click',()=>{const book=p>.7;manualStatic=!isStatic();arrivalDone=true;paint();go(book?'catalog':'profile',{instant:true});});addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{const old=p;if(desktop.matches===wasDesktop&&desktop.matches){set('travel',travel()+'px');scrollTo({top:old*travel(),behavior:'instant'});}else if(desktop.matches!==wasDesktop){set('travel',travel()+'px');go(old>.7?'catalog':'profile',{instant:true});}wasDesktop=desktop.matches;window.geneOcean?.resize();paint();});
reduced.addEventListener('change',()=>{const book=p>.7;manualStatic=null;paint();go(book?'catalog':'profile',{instant:true});});addEventListener('hashchange',()=>go(location.hash==='#catalog'?'catalog':location.hash==='#profile'?'profile':'intro',{instant:true}));
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;if(e.key==='/')go('catalog',{instant:true});if(!desktop.matches||/BUTTON|A/.test(document.activeElement?.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();go(p<.4?'profile':'catalog',{instant:true});}if(e.key==='ArrowLeft'){e.preventDefault();go(p>.7?'profile':'intro',{instant:true});}});
const stage=document.querySelector('.stage');stage.addEventListener('wheel',e=>{if(!desktop.matches||e.ctrlKey||document.querySelector('dialog[open]')||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;e.preventDefault();scrollBy({top:e.deltaX*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),behavior:'instant'});},{passive:false});
// Browser focus-reveal can scroll a transformed sheet's untransformed bounds.
// Keep an already-open desktop book settled when one of its controls gains focus.
catalog.addEventListener('focusin',()=>{if(desktop.matches&&p>.985){snapProgress=true;scrollTo({top:travel(),behavior:'instant'});schedule();}});
stage.addEventListener('dblclick',e=>{if(p<.14&&!e.target.closest('button,a,input'))go('profile',{instant:true});});stage.addEventListener('pointermove',e=>{if(!desktop.matches||isStatic())return;set('look-x',((e.clientX/innerWidth-.5)*2).toFixed(3));set('look-y',((e.clientY/innerHeight-.5)*2).toFixed(3));},{passive:true});stage.addEventListener('pointerleave',()=>{set('look-x',0);set('look-y',0);});
addEventListener('wheel',e=>{if(!arrivalDone&&!e.ctrlKey&&Math.abs(e.deltaY)>3)skipOpening();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=performance.now();cancelAnimationFrame(arrivalFrame);}else if(!arrivalDone){if(arrivalStart!==null&&hiddenAt)arrivalStart+=performance.now()-hiddenAt;hiddenAt=0;tick();}});set('travel',travel()+'px');requestAnimationFrame(()=>{go(location.hash==='#catalog'?'catalog':location.hash==='#profile'?'profile':'intro',{instant:true});tick();});document.fonts.ready.then(()=>{if(!desktop.matches&&location.hash==='#catalog')go('catalog',{instant:true});});
})();
