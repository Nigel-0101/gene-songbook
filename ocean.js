/* Local artwork + a perspective field of small, independently swimming creatures. */
(() => {
  'use strict';
  const canvas=document.getElementById('marine-life'), jellyCanvas=document.getElementById('jelly-life');
  const ctx=canvas.getContext('2d',{alpha:true});
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  let seed=86019301;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const fish=Array.from({length:720},(_,i)=>{
    const school=i%3,u=random(),spread=random()-.5;
    return {x:(u-.5)*2.3+(school-1)*.22,y:Math.sin(u*5+school*.8)*.19+(school-1)*.18+spread*.15,z:2.65+random()*.7+school*.2,phase:random()*Math.PI*2,size:2.4+random()*3.2,speed:.65+random()*.7,light:random(),school};
  });
  const specks=Array.from({length:110},()=>({x:(random()-.5)*4,y:(random()-.5)*2.5,z:random()*5.5,size:.3+random()*.8,phase:random()*6.28}));
  const jellies=[{x:-.48,y:-.24,z:3.2,size:.30,phase:.7},{x:.32,y:-.22,z:4.2,size:.22,phase:4.1}];
  const textures={},bubbles=[],burstHistory=[];
  let nextBurst=1.8,lastBurstX=-1;
  let width=0,height=0,dpr=1,p=0,staticMode=false,mobile=true,raf=0,last=0,clock=0,rendered=0,fishVisible=0,gl=null,program=null,texture=null,ready=false,contextLost=false;
  let uniforms={},elementCount=0;
  function shader(type,source){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result));return result;}
  function initJellies(){
    if(gl||mobile)return;
    gl=jellyCanvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl)return;
    const vertex=`attribute vec2 a_uv;
      uniform vec2 u_resolution,u_origin;uniform float u_size,u_time,u_phase,u_mode,u_aspect,u_anchor;varying vec2 v_uv;
      void main(){
        v_uv=a_uv;float t=u_time+u_phase;vec2 pos=a_uv;
        if(u_mode<.5){float tail=smoothstep(.24,.95,pos.y);
        float bell=1.-smoothstep(.18,.36,pos.y);
        float pulse=sin(t*1.65);
        pos.x=.5+(pos.x-.5)*(1.+bell*pulse*.045);
        pos.y+=bell*(.5+.5*pulse)*.016;
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
        vec2 px=u_origin+(pos-vec2(.5,u_anchor))*vec2(u_size,u_size*u_aspect);
        gl_Position=vec4(px/u_resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
      }`;
    const fragment=`precision mediump float;uniform sampler2D u_art;uniform float u_alpha,u_tint;varying vec2 v_uv;void main(){vec4 c=texture2D(u_art,v_uv);c.rgb*=u_tint;gl_FragColor=c*u_alpha;}`;
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
      for(const n of ['resolution','origin','size','time','phase','alpha','art','mode','aspect','anchor','tint'])uniforms[n]=gl.getUniformLocation(program,'u_'+n);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
      for(const [name,url] of Object.entries({jelly:'art/depth-jelly.webp',turtle:'art/dive-turtle.webp',reef:'art/depth-near.webp'})){
        const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const image=new Image();image.onload=()=>{if(contextLost)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);textures[name]=tex;ready=!!textures.jelly;if(name==='reef')document.body.classList.add('animated-reef');wake();};image.src=url;
      }
    }catch(error){console.warn('Underwater mesh unavailable:',error.message);ready=false;}
  }
  function resize(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);
    for(const c of [canvas,jellyCanvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);if(gl&&!contextLost)gl.viewport(0,0,jellyCanvas.width,jellyCanvas.height);
    wake();
  }
  function drawFish(time){
    fishVisible=0;
    const alpha=smooth(.065,.15,p)*(1-smooth(.39,.48,p));if(alpha<.001)return;
    const camera=p*5.8;
    for(const f of fish){
      const z=f.z-camera;if(z<.18)continue;const scale=1.25/z;
      const wave=Math.sin(time*.27+f.x*1.8+f.school)*.035;
      const wx=f.x+Math.sin(time*.09+f.phase)*.038;
      const x=width*(.5+wx*scale),y=height*(.46+(f.y+wave)*scale);
      if(x< -20||x>width+20||y< -20||y>height+20)continue;
      const size=Math.min(11,f.size*scale*width/1440),heading=Math.cos(f.x*2+time*.25)*.15;
      const tail=Math.sin(time*(7+f.speed)+f.phase)*size*.14;
      ctx.save();ctx.translate(x,y);ctx.rotate(heading);if(f.school===1)ctx.scale(-1,1);
      ctx.globalAlpha=alpha*(.55+f.light*.45)*Math.min(1,z*1.8);
      ctx.fillStyle=f.light>.6?'#b8dce1':f.light>.3?'#79afc1':'#54859c';
      ctx.beginPath();ctx.moveTo(size*.52,0);ctx.quadraticCurveTo(size*.18,-size*.22,-size*.42,0);ctx.quadraticCurveTo(size*.12,size*.17,size*.52,0);ctx.fill();
      ctx.beginPath();ctx.moveTo(-size*.32,0);ctx.lineTo(-size*.72,-size*.22+tail);ctx.lineTo(-size*.58,tail*.4);ctx.lineTo(-size*.72,size*.22+tail);ctx.closePath();ctx.fill();
      if(size>3){ctx.globalAlpha*=.52;ctx.strokeStyle='#d3e8e9';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(-size*.25,-.25);ctx.lineTo(size*.35,-.25);ctx.stroke();}
      ctx.restore();fishVisible++;
    }
  }
  function drawSpecks(time){
    const fade=1-smooth(.52,.59,p);if(fade<.01)return;
    for(const s of specks){
      const z=((s.z-p*5.8)%5.5+5.5)%5.5+.4,scale=.9/z;
      const x=width*(.5+s.x*scale),y=height*(.48+(s.y-Math.sin(time*.15+s.phase)*.03)*scale);
      if(x<0||x>width||y<0||y>height)continue;
      ctx.globalAlpha=fade*Math.min(.5,scale*.36);ctx.fillStyle='#c0e0e6';ctx.beginPath();ctx.arc(x,y,Math.max(.5,s.size*scale*2),0,Math.PI*2);ctx.fill();
      if(s.size>.9&&scale>1){ctx.globalAlpha*=.7;ctx.strokeStyle='#d6eef2';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(x,y,s.size*scale*5,0,Math.PI*2);ctx.stroke();}
    }ctx.globalAlpha=1;
  }
  function drawJellies(time){
    if(!gl||!ready||contextLost)return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const alpha=smooth(.23,.32,p)*(1-smooth(.47,.565,p));
    gl.useProgram(program);gl.uniform2f(uniforms.resolution,width,height);gl.uniform1f(uniforms.time,time);gl.uniform1i(uniforms.art,0);
    const mesh=(name,mode,x,y,size,aspect,anchor,opacity,phase=0,tint=1)=>{
      if(!textures[name]||opacity<.001)return;
      gl.bindTexture(gl.TEXTURE_2D,textures[name]);gl.uniform2f(uniforms.origin,x,y);gl.uniform1f(uniforms.size,size);gl.uniform1f(uniforms.aspect,aspect);gl.uniform1f(uniforms.anchor,anchor);gl.uniform1f(uniforms.mode,mode);gl.uniform1f(uniforms.phase,phase);gl.uniform1f(uniforms.alpha,opacity);gl.uniform1f(uniforms.tint,tint);gl.drawElements(gl.TRIANGLES,elementCount,gl.UNSIGNED_SHORT,0);
    };
    // Far-to-near, so the closer bell and ribbons correctly cover distant ones.
    for(const j of [...jellies].sort((a,b)=>b.z-a.z)){
      const z=j.z-p*5.8;if(z<.3)continue;const scale=1/z;
      const x=width*(.5+j.x*scale),y=height*(.45+j.y*scale+Math.sin(time*.65+j.phase)*.012);
      const size=width*j.size*scale;
      mesh('jelly',0,x,y,size,1.5,.13,alpha*Math.min(.9,1.2/z)*smooth(.3,.6,z),j.phase);
    }
    const turtleAlpha=smooth(.265,.34,p)*(1-smooth(.46,.55,p));
    const ts=1/Math.max(.8,3.7-p*5.8);
    mesh('turtle',1,width*(.5+(.23+Math.sin(time*.12)*.04)*ts),height*(.60-Math.sin(time*.36)*.014),width*.26*ts,2/3,.5,turtleAlpha*.9,1.1);
    const nearAlpha=(1-smooth(.21,.32,p))*.85;
    mesh('reef',2,width*.5,height*1.3,width*1.55/Math.max(.25,1-p*2.9),1/3,1,nearAlpha,.5,.45);
    const ambientAlpha=smooth(.49,.57,p)*.80;
    mesh('reef',2,width*.5,height*1.23,width*1.68,1/3,1,ambientAlpha,2.3);
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
    const alpha=.025+smooth(.25,.54,p)*.045;ctx.lineWidth=.8;ctx.strokeStyle='#e7ffff';
    for(let j=0;j<8;j++){ctx.globalAlpha=alpha*(.5+Math.sin(time*.3+j)*.25);ctx.beginPath();for(let x=-50;x<width+50;x+=20){let y=height*(.06+j*.038)+Math.sin(x/190+time*.24+j)*9+Math.sin(x/71-time*.12+j*.7)*3;if(x===-50)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.globalAlpha=1;
  }
  const active=()=>!mobile&&!staticMode&&!document.hidden;
  function render(now){
    raf=0;if(document.hidden)return;
    if(now-last<32){if(active())raf=requestAnimationFrame(render);return;}
    clock+=Math.min((now-last)/1000,.05);last=now;rendered++;
    ctx.clearRect(0,0,width,height);
    if(!mobile&&!staticMode){drawWater(clock);drawSpecks(clock);drawFish(clock);drawBubbles(clock);drawJellies(clock);}else if(gl&&!contextLost)gl.clear(gl.COLOR_BUFFER_BIT);
    if(active())raf=requestAnimationFrame(render);
  }
  function wake(){if(!raf&&!mobile&&!document.hidden)raf=requestAnimationFrame(render);}
  jellyCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;ready=false;});
  jellyCanvas.addEventListener('webglcontextrestored',()=>{gl=null;contextLost=false;initJellies();resize();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();wake();}});
  // Diagnostic state is read-only; it lets local QA distinguish mesh motion from a sliding image.
  window.geneOcean={
    update(progress,reduced,isMobile){p=progress;staticMode=reduced;const wasMobile=mobile;mobile=isMobile;if(!mobile&&wasMobile){resize();if(!staticMode)initJellies();}else if(!mobile&&!staticMode&&!gl)initJellies();if(mobile||staticMode){cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,width,height);if(gl&&!contextLost)gl.clear(gl.COLOR_BUFFER_BIT);}else wake();},
    resize,
    diagnostics:()=>({progress:p,fishCount:fish.length,visibleFish:fishVisible,meshReady:ready,turtleReady:!!textures.turtle,reefReady:!!textures.reef,meshVertices:23*49,jellies:jellies.length,time:clock,frames:rendered,running:!!raf,mobile,static:staticMode,bubbles:bubbles.length,bursts:burstHistory.slice(),tailWave:Math.sin(clock*1.4-.9*6.2+.5*3)*.027+Math.sin(clock*.83-.9*10.5+.5*8)*.016})
  };
})();
