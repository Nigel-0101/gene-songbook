/* An opaque sheet around one binding; its verso becomes the new left leaf. */
(()=>{'use strict';
 let active=null,frame=0;
 const finish=()=>{cancelAnimationFrame(frame);frame=0;if(active){active.wrap.remove();active.shadow.remove();active.underlay.remove();active=null;}};
 function turn({reader,previous,current,direction}){
  finish();
  const pages=[...reader.querySelectorAll(':scope>.folio-page')],left=pages[0],right=pages[1];
  // Preserve fractional layout sizes: integer offsets shift the copied footer.
  const style=getComputedStyle(right),w=parseFloat(style.width),h=parseFloat(style.height),hinge=parseFloat(style.left),top=parseFloat(style.top),n=12,sw=w/n,backward=direction==='backward';
  const wrap=document.createElement('div'),shadow=document.createElement('div'),underlay=document.createElement('div');
  wrap.className='book-turn';wrap.inert=true;wrap.setAttribute('aria-hidden','true');
  wrap.style.cssText='left:'+hinge+'px;top:'+top+'px;width:'+w+'px;height:'+h+'px';
  shadow.className='book-turn-shadow';shadow.setAttribute('aria-hidden','true');
  underlay.className='book-turn-underlay';underlay.inert=true;underlay.setAttribute('aria-hidden','true');
  underlay.style.cssText='left:'+(backward?hinge:hinge-w)+'px;top:'+top+'px;width:'+w+'px;height:'+h+'px';
  underlay.append(previous[backward?1:0]);
  const frontPage=backward?current[1]:previous[1],backPage=backward?previous[0]:current[0],slices=[];
  for(let i=0;i<n;i++){
   const slice=document.createElement('div'),front=document.createElement('div'),back=document.createElement('div');
   slice.className='book-slice';slice.style.width=(sw+.3)+'px';front.className='book-slice-front';back.className='book-slice-back';
   for(const [face,source,index] of [[front,frontPage,i],[back,backPage,n-1-i]]){
    const copy=source.cloneNode(true);copy.style.left=(-index*sw)+'px';copy.style.width=w+'px';copy.style.height=h+'px';face.append(copy);
   }
   slice.append(front,back);wrap.append(slice);slices.push(slice);
  }
  reader.append(shadow,underlay,wrap);const start=performance.now(),duration=820;
  active={wrap,shadow,underlay,progress:0,direction};
  function tick(now){
   if(!active)return;
   const t=Math.min(1,(now-start)/duration),s=t*t*(3-2*t),p=backward?1-s:s;
   let x=0,z=0;const lift=Math.sin(Math.PI*p),curl=lift*38;
   wrap.style.setProperty('--leaf-shading',String(1-lift*.3));
   slices.forEach((slice,i)=>{
    const angle=-180*p+curl*(.5-i/(n-1)),r=angle*Math.PI/180;
    slice.style.transform='translate3d('+x+'px,0,'+(z+lift*2)+'px) rotateY('+angle+'deg)';
    slice.style.setProperty('--curl-shade',String(lift*(.025+i/n*.09)));
    x+=Math.cos(r)*sw;z-=Math.sin(r)*sw;
   });
   shadow.style.opacity=String(lift*.4);active.progress=t;
   if(t<1)frame=requestAnimationFrame(tick);else finish();
  }
  tick(start);
 }
 window.geneBook={turn,cancel:finish,inspect:()=>active?{turning:true,progress:active.progress,direction:active.direction,slices:12}:{turning:false}};
 addEventListener('resize',finish);document.getElementById('motion-toggle').addEventListener('click',finish);
 matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',finish);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
})();
