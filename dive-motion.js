(() => {
  'use strict';
  const desktop=matchMedia('(min-width:801px)'), reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const intro=document.getElementById('intro'), catalog=document.getElementById('catalog');
  const toggle=document.getElementById('motion-toggle'), root=document.documentElement;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  let p=0, queued=false, manualStatic=null, wasDesktop=desktop.matches;
  const isStatic=()=>manualStatic??reduced.matches;
  const travel=()=>isStatic()?innerHeight:Math.max(4200,innerHeight*6.2);
  const set=(name,value)=>root.style.setProperty('--'+name,value);
  function paint(){
    queued=false;
    p=desktop.matches?clamp(scrollY/travel()):clamp((scrollY+100)/catalog.offsetTop);
    const staticMode=isStatic();
    document.body.classList.toggle('static-ocean',staticMode);
    toggle.setAttribute('aria-pressed',String(staticMode));
    toggle.textContent=staticMode?'动态浏览':'静态浏览';
    set('travel',travel()+'px');set('progress',p);
    let profile, book, bright, realm, wipe=0, wipeX=150;
    if(staticMode){profile=p<.5?1:0;book=1-profile;bright=1;realm=book;}
    else{
      profile=smooth(.51,.58,p)*(1-smooth(.735,.795,p));
      book=smooth(.895,.975,p);bright=smooth(.25,.54,p);
      // Change the landscape while the close coral occupies the whole viewport.
      realm=smooth(.805,.82,p);
      const crossing=clamp((p-.715)/.205);
      wipeX=158-316*smooth(0,1,crossing);
      wipe=smooth(.715,.735,p)*(1-smooth(.91,.925,p));
    }
    set('bright',bright);set('realm',realm);set('shade',(1-bright)*.6);
    set('opening-opacity',staticMode?0:1-smooth(.025,.105,p));
    set('water-scale',1+Math.min(p,.55)*1.12);
    // Concentric scenery approaches the viewer; nearer edges leave the frame first.
    set('near-scale',1/(Math.max(.17,1-p*3.0)));
    set('mid-scale',.92/(Math.max(.21,1-p*2.0)));
    set('far-scale',.82/(Math.max(.32,1-p*1.2)));
    set('near-alpha',(1-smooth(.21,.32,p))*.9);
    set('mid-alpha',(1-smooth(.34,.47,p))*.7);
    set('far-alpha',(1-smooth(.45,.55,p))*.5);
    set('reading-focus',Math.max(profile,book));
    set('profile-opacity',profile);set('profile-scale',.88+.12*smooth(.51,.58,p)+.06*smooth(.72,.79,p));
    set('catalog-opacity',book);set('catalog-scale',.94+.06*book);
    set('wipe-opacity',wipe);set('wipe-x',wipeX);
    document.body.classList.toggle('light-water',!desktop.matches||bright>.65);
    if(desktop.matches){intro.inert=profile<.98;catalog.inert=book<.98;}else{intro.inert=catalog.inert=false;}
    const scene=desktop.matches?(book>.5?2:profile>.5?1:0):(p>.65?2:1);
    document.querySelectorAll('[data-scene]').forEach(a=>{if(Number(a.dataset.scene)===scene)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    window.geneOcean?.update(p,staticMode,!desktop.matches);
  }
  function go(id,{instant=false,focus=false}={}){
    const destination=id==='catalog'?catalog:intro;
    const value=id==='catalog'?1:id==='profile'&&!isStatic()?.635:0;
    const top=desktop.matches?value*travel():Math.max(0,destination.offsetTop-65);
    // Direct song selection is immediate; it never forces the scenic route.
    const skip=instant||isStatic()||id==='catalog';
    window.scrollTo({top,behavior:skip?'instant':'smooth'});
    history.replaceState(null,'','#'+id);
    if(skip)paint();
    if(focus){destination.inert=false;const heading=destination.querySelector('h1,h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(paint);}}
  window.geneJourney={go,toCatalog:()=>go('catalog'),resetSongs:()=>{document.querySelector('.songs-scroll').scrollTop=0;if(!desktop.matches)document.querySelector('#search').scrollIntoView({block:'start',behavior:isStatic()?'instant':'smooth'});},getState:()=>({progress:p,travel:travel(),desktop:desktop.matches,static:isStatic()})};
  document.querySelectorAll('a[href="#intro"],a[href="#profile"],a[href="#catalog"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.hash.slice(1));}));
  toggle.addEventListener('click',()=>{const wasCatalog=p>.85;manualStatic=!isStatic();paint();go(wasCatalog?'catalog':'profile',{instant:true});});
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',()=>{const position=p;if(desktop.matches===wasDesktop&&desktop.matches){set('travel',travel()+'px');window.scrollTo({top:position*travel(),behavior:'instant'});}else if(desktop.matches!==wasDesktop){set('travel',travel()+'px');go(position>.8?'catalog':'profile',{instant:true});}wasDesktop=desktop.matches;window.geneOcean?.resize();paint();});
  reduced.addEventListener('change',()=>{const catalogActive=p>.85;paint();go(catalogActive?'catalog':'profile',{instant:true});});
  addEventListener('hashchange',()=>go(location.hash==='#catalog'?'catalog':location.hash==='#profile'?'profile':'intro',{instant:true}));
  document.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
    if(e.key==='/')go('catalog',{instant:true});
    if(!desktop.matches||/BUTTON|A/.test(document.activeElement?.tagName))return;
    if(e.key==='ArrowRight'){e.preventDefault();go(p<.55?'profile':'catalog',{instant:true});}
    if(e.key==='ArrowLeft'){e.preventDefault();go(p>.85?'profile':'intro',{instant:true});}
  });
  document.querySelector('.stage').addEventListener('wheel',e=>{
    if(!desktop.matches||e.ctrlKey||document.querySelector('dialog[open]')||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
    e.preventDefault();window.scrollBy({top:e.deltaX*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),behavior:'instant'});
  },{passive:false});
  set('travel',travel()+'px');
  requestAnimationFrame(()=>{go(location.hash==='#catalog'?'catalog':location.hash==='#profile'?'profile':'intro',{instant:true});paint();});
})();
