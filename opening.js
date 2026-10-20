/* Mid-water schools live between distant reef and foreground coral, not over the UI. */
(()=>{'use strict';
 const fishCanvas=document.getElementById('garden-fish'),fxCanvas=document.getElementById('launch-water');
 const fishCtx=fishCanvas.getContext('2d',{alpha:true}),fx=fxCanvas.getContext('2d',{alpha:true});
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
 let seed=861019;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const schools=[
  {direction:1,depth:.7,count:32,origin:.27,y:.34,period:38,spread:.4,size:22},
  {direction:-1,depth:1,count:36,origin:.76,y:.67,period:32,spread:.45,size:33},
  {direction:1,depth:.42,count:23,origin:.54,y:.46,period:52,spread:.22,size:13}
 ].map((s,school)=>({...s,fish:Array.from({length:s.count},(_,i)=>({u:(i/(s.count-1)-.5),y:(rnd()-.5)*.105,size:.72+rnd()*.6,phase:rnd()*Math.PI*2,school}))}));
 const motes=Array.from({length:42},()=>({x:rnd()-.5,y:rnd()-.5,z:rnd(),phase:rnd()*6.28}));
 const art=new Image();art.src='art/v8/fish-small.webp';
 let width=0,height=0,dpr=1,raf=0,last=0,clock=0,frames=0,ready=false,painted=[],orb=null,titleY=.46;
 let state={elapsed:0,done:false,p:0,still:false,mobile:innerWidth<=800};
 const controls=document.querySelector('.opening-controls'),skip=document.getElementById('opening-skip'),replay=document.getElementById('opening-replay');
 const review=new URLSearchParams(location.search).get('review')==='opening';document.body.classList.toggle('opening-review',review);
 // Start the camera once its main plates are ready; never wait indefinitely for an asset.
 const sources=innerWidth>800?['art/v9/water.webp','art/v9/far-reef.webp','art/v9/coral-left.webp','art/v9/coral-right.webp']:[];
 const plates=sources.map(src=>{const im=new Image();im.src=src;return im.decode().catch(()=>{});});
 const readyTimer=setTimeout(()=>{ready=true;},4500);
 Promise.allSettled(plates).then(()=>{ready=true;clearTimeout(readyTimer);});
 function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.75);for(const c of[fishCanvas,fxCanvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}fishCtx.setTransform(dpr,0,0,dpr,0,0);fx.setTransform(dpr,0,0,dpr,0,0);const title=document.querySelector('.opening h2').getBoundingClientRect();titleY=Math.max(.35,Math.min(.55,(title.top+title.height/2)/height));}
 function drawSchools(){
  painted=[];fishCtx.clearRect(0,0,width,height);
  const alpha=(state.done?1:smooth(3.1,5,state.elapsed))*(1-smooth(.09,.18,state.p));
  if(alpha<.001||!art.complete||!art.naturalWidth)return;
  const unit=Math.min(2.65,Math.max(.75,width/1440)),fw=art.naturalWidth,fh=art.naturalHeight,aspect=fh/fw;
  for(const school of schools){
   const center=((school.origin+school.direction*clock/school.period+.55)%2.1+2.1)%2.1-.55;
   for(const f of school.fish){
    const x=width*(center+f.u*school.spread),y=height*(school.y+f.y+Math.sin(f.u*6+clock*.26)*.025+Math.sin(clock*.8+f.phase)*.005);
    const size=school.size*f.size*unit;
    if(x< -size||x>width+size)continue;
    fishCtx.save();fishCtx.translate(x,y);fishCtx.scale(school.direction===1?-1:1,1);fishCtx.rotate(Math.sin(clock*.48+f.u*5)*.055);
    fishCtx.globalAlpha=alpha*(.27+school.depth*.5)*(school.depth<.5?.72:1);
    fishCtx.drawImage(art,0,0,fw*.72,fh,-size*.5,-size*aspect*.5,size*.72,size*aspect);
    const pulse=1+Math.sin(clock*7+f.phase)*.19;fishCtx.drawImage(art,fw*.72,0,fw*.28,fh,size*.22,-size*aspect*.5*pulse,size*.28,size*aspect*pulse);
    fishCtx.restore();painted.push({school:f.school,x:+(x/width).toFixed(4),y:+(y/height).toFixed(4),size:+size.toFixed(1),direction:school.direction});
   }
  }
 }
 function drawPassage(){
  fx.clearRect(0,0,width,height);const t=state.elapsed;
  orb=null;if(state.done||t<.12||t>6.4)return;
  const bloom=smooth(.06,.5,t)*(1-smooth(4.65,5.55,t));
  // A tangible pearl of light descends. No beam: the ball itself lights the water.
  const pull=smooth(2.35,5.15,t),fall=smooth(.2,2.2,t),cx=width*.5,cy=height*(.12+(titleY-.12)*fall);
  const dissolve=smooth(4.65,5.55,t),orbAlpha=smooth(.04,.3,t)*(1-dissolve),radius=Math.min(width,height)*(.145-.126*pull)*(1+dissolve*.4);
  orb={x:cx/width,y:cy/height,radius,alpha:orbAlpha,fall,pull,titleY};
  const g=fx.createRadialGradient(cx,cy,radius*.2,cx,cy,radius*3.4);g.addColorStop(0,`rgba(231,255,232,${bloom*.45})`);g.addColorStop(.3,`rgba(176,250,249,${bloom*.14})`);g.addColorStop(1,'rgba(170,243,255,0)');fx.fillStyle=g;fx.fillRect(cx-radius*3.4,cy-radius*3.4,radius*6.8,radius*6.8);
  // Emissive volume: soft cloud edges and a warm living core, with no shell or glass reflection.
  const softLight=(x,y,r,stops,alpha=1)=>{fx.globalAlpha=orbAlpha*alpha;const gradient=fx.createRadialGradient(x,y,0,x,y,r);for(const [at,color]of stops)gradient.addColorStop(at,color);fx.fillStyle=gradient;fx.fillRect(x-r,y-r,r*2,r*2);};
  softLight(cx,cy,radius*1.8,[[0,'#baf8f275'],[.35,'#91deeb3d'],[.7,'#83d8ed16'],[1,'#83d8ed00']]);
  for(let j=0;j<9;j++){const a=j*2.399+clock*.34,dr=radius*(.38+Math.sin(clock*.7+j)*.075),x=cx+Math.cos(a)*dr,y=cy+Math.sin(a)*dr;softLight(x,y,radius*(.66+Math.sin(j+clock*.9)*.06),[[0,'#d7fff18c'],[.35,'#b9f6f154'],[.72,'#a3e5ed20'],[1,'#99deec00']],.55);}
  softLight(cx,cy,radius*1.02,[[0,'#fffef6'],[.18,'#fffcecfa'],[.35,'#f9ffebdc'],[.51,'#dffff3a8'],[.68,'#aeedf969'],[.84,'#8fd6ed20'],[1,'#80d0ec00']]);
  // Fine luminous dust breaks the silhouette and trails above the descending light.
  for(let j=0;j<27;j++){const a=j*2.399+clock*.22,r=radius*(.5+((j*17)%29)/29*.9),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r-radius*.22;const sparkle=(.5+.5*Math.sin(clock*1.3+j*1.7));fx.globalAlpha=orbAlpha*sparkle*.46;fx.fillStyle=j%3?'#cafff4':'#fff3c9';fx.beginPath();fx.arc(x,y,Math.max(.5,radius*.006)*(1+sparkle),0,Math.PI*2);fx.fill();}fx.globalAlpha=1;
  // On arrival the pearl opens into a ripple; its halo lingers until the title arrives.
  const spread=smooth(4.5,6.15,t),waveAlpha=smooth(4.5,4.85,t)*(1-smooth(5.6,6.3,t));
  for(let j=0;j<3;j++){
   const rx=(.035+spread*(1+j*.14))*width,ry=rx*(.24+j*.025);
   fx.beginPath();for(let a=0;a<=Math.PI*2+.025;a+=.025){const ripple=1+Math.sin(a*9+clock*1.6+j)*.012;const x=width*.5+Math.cos(a)*rx*ripple,y=height*titleY+Math.sin(a)*ry*ripple;if(a===0)fx.moveTo(x,y);else fx.lineTo(x,y);}fx.closePath();fx.strokeStyle=`rgba(225,255,246,${waveAlpha*(.22-j*.045)})`;fx.lineWidth=1.5+j*.5;fx.stroke();
  }
  // Large foreground bubbles pass the lens as the reef opens; no flashing screen.
  const thrust=smooth(2.35,5.15,t),fade=smooth(2.5,3.3,t)*(1-smooth(5.1,6.2,t));
  for(const m of motes){const projection=2.5-thrust*(1.3+m.z*.4),x=width*(.5+m.x*projection),y=height*(.5+m.y*projection-thrust*.08);const r=(1+m.z*7)*(2.2-thrust*1.1);if(x< -r||x>width+r||y< -r||y>height+r)continue;fx.globalAlpha=fade*(.16+m.z*.27);fx.strokeStyle='#e8fffa';fx.lineWidth=.7+m.z*.7;fx.beginPath();fx.arc(x,y,r,0,Math.PI*2);fx.stroke();fx.globalAlpha*=.75;fx.beginPath();fx.arc(x-r*.12,y-r*.1,r*.73,Math.PI*1.05,Math.PI*1.55);fx.stroke();}
  fx.globalAlpha=1;
 }
 const active=()=>!state.mobile&&!state.still&&state.p<.235&&!document.hidden;
 function render(now){raf=0;if(!active())return;if(now-last<32){raf=requestAnimationFrame(render);return;}clock+=Math.min((now-last)/1000,.06);last=now;frames++;drawSchools();drawPassage();raf=requestAnimationFrame(render);}
 function wake(){if(active()&&!raf){last=performance.now();raf=requestAnimationFrame(render);}}
 function update(next){state=next;controls.hidden=state.mobile||state.still||state.p>.04;skip.hidden=state.done;replay.hidden=!review||!state.done;if(!review&&state.done)controls.hidden=true;if(active())wake();else{cancelAnimationFrame(raf);raf=0;fishCtx.clearRect(0,0,width,height);fx.clearRect(0,0,width,height);}}
 skip.addEventListener('click',()=>window.geneJourney?.skipOpening());replay.addEventListener('click',()=>window.geneJourney?.replayOpening());
 addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});
 window.geneOpening={get ready(){return ready;},update,restart(){clock=0;resize();},diagnostics:()=>({ready,frames,running:!!raf,elapsed:state.elapsed,done:state.done,orb,schools:schools.map(({direction,depth,count})=>({direction,depth,count})),fish:painted,layer:'behind-middle-coral',review})};resize();document.fonts.ready.then(resize);
})();
