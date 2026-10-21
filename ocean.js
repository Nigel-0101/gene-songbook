/* Local artwork + a perspective field of small, independently swimming creatures. */
(() => {
  'use strict';
  const canvas=document.getElementById('marine-life'), jellyCanvas=document.getElementById('jelly-life');
  const ctx=canvas.getContext('2d',{alpha:true});
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  let seed=86019301;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Compact horizontal shoals, with tapered ends and separate depth planes.
  const fish=Array.from({length:720},(_,i)=>{
    const school=i%3,u=random(),r=Math.sqrt(random()),a=random()*Math.PI*2;
    return {u,x:Math.cos(a)*r,y:Math.sin(a)*r,school,phase:random()*6.28,
      size:random(),speed:.7+random(),light:random()};
  });
  const specks=Array.from({length:110},()=>({x:(random()-.5)*4,y:(random()-.5)*2.5,z:random()*5.5,size:.3+random()*.8,phase:random()*6.28}));
  const jellies=[{x:-.48,y:-.24,z:3.2,size:.30,phase:.7},{x:.32,y:-.22,z:4.2,size:.22,phase:4.1}];
  const textures={},bubbles=[],burstHistory=[];
  const fishArt=new Image();fishArt.src='art/v8/fish-small.webp';
  const waterArt=new Image();let fishSizes=[];
  let creatureTime=0, positions={},fallbackArt=null,heroState=null,heroFallback=null;
  let nextBurst=1.8,lastBurstX=-1;
  let width=0,height=0,dpr=1,p=0,staticMode=false,mobile=true,raf=0,last=0,clock=0,rendered=0,fishVisible=0,gl=null,program=null,texture=null,ready=false,contextLost=false;
  let uniforms={},elementCount=0;
  function shader(type,source){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result));return result;}
  function initJellies(){
    if(gl||mobile)return;
    if(!waterArt.src)waterArt.src='art/v9/water.webp';
    gl=jellyCanvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl){document.body.classList.add('no-webgl');return;}
    const vertex=`attribute vec2 a_uv;
      uniform vec2 u_resolution,u_origin;uniform float u_size,u_time,u_phase,u_mode,u_aspect,u_anchor;varying vec2 v_uv;
      void main(){
        v_uv=a_uv;float t=u_time+u_phase;vec2 pos=a_uv;
        if(u_mode<.5){float tail=smoothstep(.24,.95,pos.y);
        float bell=1.-smoothstep(.18,.36,pos.y);
        float pulse=sin(t*2.1);
        float calm=1.-smoothstep(u_resolution.x*.8,u_resolution.x*2.5,u_size)*.8;
        pos.x=.5+(pos.x-.5)*(1.-bell*(.5+.5*pulse)*.14*calm);
        pos.y+=bell*(.5+.5*pulse)*.035*calm;
        pos.y=.24+(pos.y-.24)*(1.-tail*sin(t*2.1-.65)*.065);
        pos.x=.5+(pos.x-.5)*(1.-tail*sin(t*2.1-.85)*.075);
        // Delayed travelling waves: each ribbon column follows a different current.
        pos.x+=tail*(sin(t*1.4-pos.y*6.2+pos.x*3.)*.027+sin(t*.83-pos.y*10.5+pos.x*8.)*.016);
        pos.y+=tail*sin(t*1.3-pos.y*7.+pos.x*5.)*.009;
        }else if(u_mode<1.5){
          float fin=smoothstep(.13,.39,abs(pos.y-.51));
          pos.y+=sign(pos.y-.51)*sin(t*1.35+pos.x*1.7)*.045*fin;
          pos.x+=cos(t*1.35+pos.y*2.)*.014*fin;
        }else{
          float frond=pow(1.-pos.y,1.8);
          pos.x+=sin(t*.62-pos.y*4.+pos.x*6.)*.012*frond;
          pos.y+=sin(t*.45+pos.x*8.)*.004*frond;
        }
        vec2 offset=(pos-vec2(.5,u_anchor))*vec2(u_size,u_size*u_aspect);
        float angle=u_mode<.5?-.58+sin(t*.35)*.055:u_mode<1.5?-2.5:0.;offset=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*offset;
        vec2 px=u_origin+offset;
        gl_Position=vec4(px/u_resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
      }`;
    const fragment=`precision mediump float;uniform sampler2D u_art;uniform float u_alpha,u_tint,u_solid;varying vec2 v_uv;void main(){vec4 c=texture2D(u_art,v_uv);if(u_solid>.5&&c.a>.01){float a=smoothstep(.0,.72,c.a);c.rgb*=a/c.a;c.a=a;}c.rgb*=u_tint;gl_FragColor=c*u_alpha;}`;
    try{
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const points=[],indices=[],cols=22,rows=48;
      for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)points.push(x/cols,y/rows);
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
      const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const uv=gl.getAttribLocation(program,'a_uv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);
      const elements=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);elementCount=indices.length;
      for(const n of ['resolution','origin','size','time','phase','alpha','art','mode','aspect','anchor','tint','solid'])uniforms[n]=gl.getUniformLocation(program,'u_'+n);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
      for(const [name,url] of Object.entries({hero:'art/passage/jelly.webp',jelly:'art/v7/jelly.webp',turtle:'art/v8/turtle.webp',reef:'art/v9/kelp.webp'})){
        const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const image=new Image();image.onload=()=>{if(contextLost)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);textures[name]=tex;ready=!!textures.jelly;if(name==='reef')document.body.classList.add('animated-reef');wake();};image.src=url;
      }
    }catch(error){console.warn('Underwater mesh unavailable:',error.message);ready=false;}
  }
  function resize(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    for(const c of [canvas,jellyCanvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);if(gl&&!contextLost)gl.viewport(0,0,jellyCanvas.width,jellyCanvas.height);
    wake();
  }
  function drawFish(time){
    fishVisible=0;fishSizes=[];
    const alpha=smooth(.055,.083,p)*(1-smooth(.218,.255,p));
    if(alpha<.001||!fishArt.complete||!fishArt.naturalWidth)return;
    const q=smooth(.065,.235,p),fw=fishArt.naturalWidth,fh=fishArt.naturalHeight;
    for(let layer=0;layer<3;layer++)for(const f of fish){
      if(f.school!==layer)continue;
      const near=layer/2,lag=[.18,0,-.17][layer];
      const center=1.43-q*1.65+lag;
      const u=f.x*.43;
      const x=width*(center+u+Math.sin(time*.7+f.phase)*.006);
      const route=[.27,.53,.76][layer];
      const arc=Math.sin((q+u*.7)*Math.PI*1.35+layer*.6)*.10;
      const y=height*(route+arc+f.y*(.055+near*.033)+Math.sin(time*.8+f.phase)*.006);
      const size=(10+near*12+f.size*(6+near*9))*Math.min(2.2,width/1280);
      if(x< -size||x>width+size||y< -size||y>height+size)continue;
      // The sprite faces left; its slope follows the shoal, never a vertical strip.
      const slope=Math.cos((q+u*.7)*Math.PI*1.35+layer*.6)*.08;
      ctx.save();ctx.translate(x,y);ctx.rotate(slope+Math.sin(time*.5+f.phase)*.025);
      ctx.globalAlpha=alpha*(.65+near*.35)*(.9+f.light*.1);
      const ratio=fh/fw;
      ctx.drawImage(fishArt,0,0,fw*.72,fh,-size*.5,-size*ratio*.5,size*.72,size*ratio);
      const tail=1+Math.sin(time*(7+f.speed)+f.phase)*.15;
      ctx.drawImage(fishArt,fw*.72,0,fw*.28,fh,size*.22,-size*ratio*.5*tail,size*.28,size*ratio*tail);
      ctx.restore();fishVisible++;fishSizes.push(size);
    }
  }
  function drawSpecks(time){
    const fade=1-smooth(.56,.62,p);if(fade<.01)return;
    for(const s of specks){
      const z=((s.z-p*5.8)%5.5+5.5)%5.5+.4,scale=.9/z;
      const x=width*(.5+s.x*scale),y=height*(.48+(s.y-Math.sin(time*.15+s.phase)*.03)*scale);
      if(x<0||x>width||y<0||y>height)continue;
      ctx.globalAlpha=fade*Math.min(.5,scale*.36);ctx.fillStyle='#c0e0e6';ctx.beginPath();ctx.arc(x,y,Math.max(.5,s.size*scale*2),0,Math.PI*2);ctx.fill();
      if(s.size>.9&&scale>1){ctx.globalAlpha*=.7;ctx.strokeStyle='#d6eef2';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(x,y,s.size*scale*5,0,Math.PI*2);ctx.stroke();}
    }ctx.globalAlpha=1;
  }
  function drawJellies(time){
    if(!gl||contextLost){drawFallback(time);return;}
    if(!ready)return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const alpha=smooth(.08,.115,p)*(1-smooth(.20,.245,p));
    gl.useProgram(program);gl.uniform2f(uniforms.resolution,width,height);gl.uniform1f(uniforms.time,time);gl.uniform1i(uniforms.art,0);
    const mesh=(name,mode,x,y,size,aspect,anchor,opacity,phase=0,tint=1,solid=0)=>{
      if(!textures[name]||opacity<.001)return;
      gl.bindTexture(gl.TEXTURE_2D,textures[name]);gl.uniform2f(uniforms.origin,x,y);gl.uniform1f(uniforms.size,size);gl.uniform1f(uniforms.aspect,aspect);gl.uniform1f(uniforms.anchor,anchor);gl.uniform1f(uniforms.mode,mode);gl.uniform1f(uniforms.phase,phase);gl.uniform1f(uniforms.alpha,opacity);gl.uniform1f(uniforms.tint,tint);gl.uniform1f(uniforms.solid,solid);gl.drawElements(gl.TRIANGLES,elementCount,gl.UNSIGNED_SHORT,0);
    };
    // All silhouettes cross the current; none expands to cover the lens.
    const {far,turtle,companion,q}=creatureState(time);
    mesh('jelly',0,width*far.x,height*far.y,Math.min(width*.07,height*.12),1672/940,.13,alpha*.65,3.2);
    mesh('jelly',0,width*companion.x,height*companion.y,Math.min(width*.055,height*.10),1672/940,.13,alpha*.48,5.1);
    mesh('turtle',1,width*turtle.x,height*turtle.y,Math.min(width*.105,height*.18),1024/1536,.5,alpha*.94,1.1);
    heroState=passageState();
    mesh('hero',0,heroState.x,heroState.y,heroState.size,1.5,.21,heroState.opacity,.7);
    const nearAlpha=0;
    mesh('reef',2,width*.5,height*1.04,width*(1.2+smooth(0,.19,p)*2.8),941/1672,1,nearAlpha,.5,.7);
    const ambientAlpha=0;
    mesh('reef',2,width*.5,height*1.1,width*1.14,941/1672,1,ambientAlpha,2.3);
  }
  // Scroll alone determines the reveal and paths, so reversal remains continuous.
  function creatureState(time){
    const q=smooth(.075,.235,p),bob=Math.sin(time*.65)*.014;
    const far={x:1.19-q*1.65,y:.27-q*.12+bob};
    const companion={x:1.48-q*1.65,y:.74-q*.13-bob};
    const turtle={x:1.22-q*1.85,y:.38-Math.sin(q*Math.PI)*.09+bob};
    positions={far,companion,turtle,phase:q};
    return {far,companion,turtle,q};
  }
  function passageState(){
    const approach=smooth(.075,.235,p),exit=smooth(.205,.245,p);
    // A small, almost constant silhouette drifts laterally through the schools.
    const maxSize=Math.min(width*.14,height*.24);
    return {x:width*(1.62-2.15*approach),y:height*(.68-.12*approach),
      size:maxSize*(.9+.1*Math.sin(approach*Math.PI)),opacity:smooth(.08,.108,p)*(1-exit)*.9,
      approach,exit,coverage:false,maxSize,reveal:smooth(.095,.205,p)};
  }
  function drawHeroFallback(time){
    if(!heroFallback)heroFallback=jellyCanvas.getContext('2d')||ctx;
    if(!heroFallback)return;
    const c=heroFallback;c.setTransform(dpr,0,0,dpr,0,0);if(c!==ctx)c.clearRect(0,0,width,height);
    const im=fallbackArt?.hero;heroState=passageState();
    if(!im?.complete||!im.naturalWidth||heroState.opacity<.001)return;
    const {x,y,size,opacity}=heroState,h=size*1.5;
    c.save();c.translate(x,y);c.rotate(-.58+Math.sin((time+.7)*.35)*.055);c.globalAlpha=opacity;
    for(let sy=0;sy<im.naturalHeight;sy+=16){
      const slice=Math.min(16,im.naturalHeight-sy),v=sy/im.naturalHeight,tail=smooth(.24,.95,v),bell=1-smooth(.18,.36,v),pulse=Math.sin((time+.7)*2.1);
      const calm=1-smooth(width*.8,width*2.5,size)*.8;
      const sx=1-bell*(.5+.5*pulse)*.14*calm,dx=tail*Math.sin(time*1.4-v*6.2)*size*.027;
      c.drawImage(im,0,sy,im.naturalWidth,slice,-size*sx*.5+dx,(v-.21)*h,size*sx,slice/im.naturalHeight*h+1);
    }c.restore();
  }
  function drawFallback(time){
    // A software path keeps the two creatures visible when WebGL is unavailable.
    if(!fallbackArt){fallbackArt={};for(const name of ['jelly','turtle','hero']){const im=new Image();im.src=name==='hero'?'art/passage/jelly.webp':'art/'+(name==='turtle'?'v8/':'v7/')+name+'.webp';fallbackArt[name]=im;}}
    drawHeroFallback(time);const alpha=smooth(.08,.115,p)*(1-smooth(.20,.245,p));if(alpha<.001)return;
    const {far,turtle,companion,q}=creatureState(time);
    const jelly=(pos,size,phase,opacity)=>{const im=fallbackArt.jelly;if(!im.complete||!im.naturalWidth)return;const h=size*im.naturalHeight/im.naturalWidth,stretch=1+Math.sin(time*2.1+phase)*.035;ctx.save();ctx.translate(pos.x*width,pos.y*height);ctx.rotate(-.58+Math.sin(time*.35+phase)*.055);ctx.globalAlpha=alpha*opacity;for(let y=0;y<im.naturalHeight;y+=24){const sh=Math.min(24,im.naturalHeight-y),t=y/im.naturalHeight,tail=smooth(.24,.95,t),dx=Math.sin(time*1.4-t*6+phase)*size*.026*tail;ctx.drawImage(im,0,y,im.naturalWidth,sh,-size*.5+dx,(t-.13)*h*stretch,size,sh/im.naturalHeight*h*stretch+1);}ctx.restore();};
    jelly(far,Math.min(width*.07,height*.12),3.2,.65);jelly(companion,Math.min(width*.055,height*.10),5.1,.48);const im=fallbackArt.turtle;if(im.complete&&im.naturalWidth){const size=Math.min(width*.105,height*.18);ctx.save();ctx.globalAlpha=alpha*.94;ctx.translate(width*turtle.x,height*turtle.y);ctx.rotate(-2.5+Math.sin(time*1.35)*.025);ctx.drawImage(im,-size*.5,-size/3,size,size*2/3);ctx.restore();}
  }
  function drawBubbles(time){
    if(time>=nextBurst){
      let x;
      for(let n=0;n<20;n++){x=p>.53?(random()<.5?.035+random()*.10:.865+random()*.10):.08+random()*.84;if(Math.abs(x-lastBurstX)>.18)break;}
      lastBurstX=x;burstHistory.push({x:+x.toFixed(3),time:+time.toFixed(2)});if(burstHistory.length>8)burstHistory.shift();
      const baseY=.84+random()*.17,count=6+Math.floor(random()*5);
      for(let i=0;i<count;i++)bubbles.push({x:x+(random()-.5)*.018,y:baseY,born:time+i*.16,life:4+random()*2,radius:2+random()*5,phase:random()*6.28});
      nextBurst=time+4.5+random()*3;
    }
    for(let i=bubbles.length-1;i>=0;i--){const b=bubbles[i],age=time-b.born;if(age<0)continue;if(age>b.life){bubbles.splice(i,1);continue;}
      const q=age/b.life,x=width*(b.x+Math.sin(age*1.6+b.phase)*.008),y=height*(b.y-q*.77),r=b.radius*(.7+q*.5);
      ctx.globalAlpha=smooth(0,.12,q)*(1-smooth(.78,1,q))*.7;
      ctx.strokeStyle='#c6eef2';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#f5ffff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x-r*.08,y-r*.1,r*.71,Math.PI*1.07,Math.PI*1.55);ctx.stroke();
      ctx.fillStyle='#d5f8f933';ctx.beginPath();ctx.arc(x+r*.3,y+r*.25,r*.25,0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;
  }
  function drawWater(time){
    const alpha=.045+smooth(.19,.25,p)*.06;ctx.lineWidth=.8;ctx.strokeStyle='#e7ffff';
    for(let j=0;j<8;j++){ctx.globalAlpha=alpha*(.5+Math.sin(time*.3+j)*.25);ctx.beginPath();for(let x=-50;x<width+50;x+=20){let y=height*(.06+j*.038)+Math.sin(x/190+time*.24+j)*9+Math.sin(x/71-time*.12+j*.7)*3;if(x===-50)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.globalAlpha=1;
  }
  const active=()=>!mobile&&!staticMode&&!document.hidden;
  function render(now){
    raf=0;if(document.hidden)return;
    if(now-last<32){if(active())raf=requestAnimationFrame(render);return;}
    const dt=Math.min((now-last)/1000,.05);clock+=dt;if(p>.075&&p<.245)creatureTime+=dt;else creatureTime=0;last=now;rendered++;
    ctx.clearRect(0,0,width,height);
    if(!mobile&&!staticMode){drawSpecks(clock);drawFish(clock);drawWater(clock);drawBubbles(clock);drawJellies(clock);}else if(gl&&!contextLost)gl.clear(gl.COLOR_BUFFER_BIT);
    if(active())raf=requestAnimationFrame(render);
  }
  function wake(){if(!raf&&!mobile&&!document.hidden)raf=requestAnimationFrame(render);}
  jellyCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;ready=false;});
  jellyCanvas.addEventListener('webglcontextrestored',()=>{gl=null;contextLost=false;initJellies();resize();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();wake();}});
  // Diagnostic state is read-only; it lets local QA distinguish mesh motion from a sliding image.
  window.geneOcean={
    inspectCover(){drawJellies(clock);if(!gl||contextLost)return null;const bytes=new Uint8Array(4),samples=[];for(let y=0;y<=8;y++)for(let x=0;x<=12;x++){gl.readPixels(Math.min(jellyCanvas.width-1,Math.floor(x/12*(jellyCanvas.width-1))),Math.min(jellyCanvas.height-1,Math.floor(y/8*(jellyCanvas.height-1))),1,1,gl.RGBA,gl.UNSIGNED_BYTE,bytes);samples.push(bytes[3]);}return {minimumAlpha:Math.min(...samples),opaque:samples.filter(a=>a>=254).length,total:samples.length};},
    update(progress,reduced,isMobile){p=progress;staticMode=reduced;const wasMobile=mobile;mobile=isMobile;if(!mobile&&wasMobile){resize();if(!staticMode)initJellies();}else if(!mobile&&!staticMode&&!gl)initJellies();if(mobile||staticMode){cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,width,height);if(heroFallback)heroFallback.clearRect(0,0,jellyCanvas.width,jellyCanvas.height);if(gl&&!contextLost)gl.clear(gl.COLOR_BUFFER_BIT);}else wake();},
    resize,
    diagnostics:()=>({progress:p,positions,hero:heroState,heroReady:!!textures.hero||!!fallbackArt?.hero?.naturalWidth,creatureTime,fishDirection:'right-to-left-current',fishCount:fish.length,visibleFish:fishVisible,fishSizeRange:fishSizes.length?[Math.min(...fishSizes),Math.max(...fishSizes)]:[],jellyTilt:-.58,waterTextureReady:waterArt.complete&&waterArt.naturalWidth>0,meshReady:ready,softwareFallback:!!fallbackArt,turtleReady:!!textures.turtle,reefReady:!!textures.reef,meshVertices:23*49,jellies:jellies.length,time:clock,frames:rendered,running:!!raf,mobile,static:staticMode,bubbles:bubbles.length,bursts:burstHistory.slice(),tailWave:Math.sin(clock*1.4-.9*6.2+.5*3)*.027+Math.sin(clock*.83-.9*10.5+.5*8)*.016})
  };
})();
