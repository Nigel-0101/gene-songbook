(() => {
  'use strict';
  const songs = window.GENE_SONGS;
  const key = 'gene-songbook-handbook-v2';
  const ids = new Set(songs.map(s => String(s.id)));
  const read = () => { try { const s=JSON.parse(localStorage.getItem(key)||'{}'); return {favorites:(Array.isArray(s.favorites)?s.favorites:[]).filter(x=>ids.has(String(x))),recent:(Array.isArray(s.recent)?s.recent:[]).filter(x=>ids.has(String(x)))}; } catch { return {favorites:[],recent:[]}; } };
  const saved = read();
  let favorites=new Set(saved.favorites.map(String)), recent=saved.recent.map(String), selected=null, tab='all', page=1, query='', candidate=null, lastCandidate=null, timer;
  const $=id=>document.getElementById(id), list=$('song-list'), dialog=$('random-dialog');
  const columns=[$('songs-left'),$('songs-right')];let perLeaf=7,size=14;
  const capacity=()=>matchMedia('(max-width:800px)').matches?6:Math.max(4,Math.min(18,Math.floor(Math.min(...columns.map(e=>e.clientHeight))/(parseFloat(getComputedStyle(columns[0]).fontSize)*2.6+6))));
  const norm=t=>String(t??'').normalize('NFKC').trim().toLocaleLowerCase();
  const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({favorites:[...favorites],recent}));}catch{}};
  const filtered=()=>{ let result=tab==='recent'?recent.map(id=>songs.find(s=>String(s.id)===id)).filter(Boolean):songs.filter(s=>tab!=='favorites'||favorites.has(String(s.id)));const q=norm(query); if(q)result=result.filter(s=>/^\d+$/.test(q)?Number(s.sequence)===Number(q):norm(s.name+' '+s.singer).includes(q));return result;};
  function render(){
    window.geneBook?.cancel();
    const matches=filtered(), pages=Math.max(1,Math.ceil(matches.length/size)); page=Math.max(1,Math.min(page,pages));
    list.style.setProperty('--rows',perLeaf);
    const visibleSongs=matches.slice((page-1)*size,page*size);
    $('spread-range').textContent=matches.length?((page-1)*size+1)+'—'+Math.min(page*size,matches.length):'';
    $('all-count').textContent=songs.length;$('favorite-count').textContent=favorites.size;$('recent-count').textContent=recent.length;$('result-count').textContent=matches.length+' 首';
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
    const rows=visibleSongs.map((s,index)=>`<article style="--entry:${index%perLeaf}" class="song-row${String(s.id)===selected?' is-selected':''}" data-id="${s.id}"><span class="song-number">${String(s.sequence).padStart(3,'0')}</span><div class="song-info"><h3 class="song-name" title="${esc(s.name)}">${esc(s.name)}</h3>${s.singer?`<p class="song-singer">${esc(s.singer)}</p>`:''}</div><button type="button" class="favorite" aria-label="${favorites.has(String(s.id))?'取消收藏':'收藏'} ${esc(s.name)}" aria-pressed="${favorites.has(String(s.id))}"><i class="icon" aria-hidden="true">&#xe0e8;</i></button><button type="button" class="select-song" aria-label="点歌 ${esc(s.name)}">${String(s.id)===selected?'<i class="icon" aria-hidden="true">&#xe182;</i>已选':'点歌'}</button></article>`);
    const empty=`<div class="empty-state">${query?'没有找到这首歌':tab==='favorites'?'收藏你喜欢的歌':tab==='recent'?'还没有点过歌':'暂时没有歌曲'}<small>${query?'试试歌名、歌手，或歌曲前面的编号。':tab==='favorites'?'点击歌曲旁的珍珠，就能在这里找到它。':'选一首喜欢的，开始今天的歌单。'}</small></div>`;
    columns[0].innerHTML=rows.slice(0,perLeaf).join('')||empty;columns[1].innerHTML=rows.slice(perLeaf).join('');
    $('page-count').textContent=page+' / '+pages; $('first-page').disabled=$('previous-page').disabled=page===1;$('last-page').disabled=$('next-page').disabled=page===pages;$('random-button').disabled=matches.length===0;
    const visible=new Set([1,pages]);
    const start=Math.max(1,Math.min(page-2,pages-4));for(let n=start;n<=Math.min(pages,start+4);n++)visible.add(n);
    let previous=0;const numbers=[];for(const n of [...visible].sort((a,b)=>a-b)){if(n-previous>1)numbers.push('<span aria-hidden="true">…</span>');numbers.push(`<button type="button" data-page="${n}" aria-label="第 ${n} 页"${n===page?' aria-current="page"':''}>${n}</button>`);previous=n;}
    $('page-numbers').innerHTML=numbers.join('');$('page-jump').max=pages;$('page-jump').value=page;
  }
  function message(text,manual){clearTimeout(timer);const box=$('feedback');box.hidden=false;box.querySelector('p').textContent=text;$('manual-copy').hidden=!manual;if(manual){$('manual-copy').value=manual;$('manual-copy').focus();$('manual-copy').select();}else timer=setTimeout(()=>box.hidden=true,2800);}
  async function copySong(song){
    const text='点歌 '+song.name;let copied=false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}}catch{}
    if(!copied){const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.cssText='position:fixed;top:0;left:-9999px';document.body.append(field);field.select();try{copied=document.execCommand('copy');}catch{}field.remove();}
    if(!copied){if(dialog.open)dialog.close();message('复制未完成，请手动复制下面的文字。',text);return false;}
    selected=String(song.id);recent=[selected,...recent.filter(id=>id!==selected)].slice(0,30);persist();render();if(dialog.open)dialog.close();else list.querySelector(`[data-id="${song.id}"] .select-song`)?.focus({preventScroll:true});message('已复制：'+text);return true;
  }
  function draw(){let pool=filtered();if(pool.length>1)pool=pool.filter(s=>String(s.id)!==String(lastCandidate));if(!pool.length)return;candidate=pool[Math.floor(Math.random()*pool.length)];lastCandidate=candidate.id;$('random-sequence').textContent='NO. '+String(candidate.sequence).padStart(3,'0');$('random-name').textContent=candidate.name;$('random-singer').textContent=candidate.singer||'';}
  $('search').addEventListener('input',e=>{query=e.target.value;page=1;render();});
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;page=1;render();}));
  list.addEventListener('click',async e=>{const row=e.target.closest('[data-id]');if(!row)return;const song=songs.find(s=>String(s.id)===row.dataset.id);if(e.target.closest('.favorite')){favorites.has(row.dataset.id)?favorites.delete(row.dataset.id):favorites.add(row.dataset.id);persist();render();const next=list.querySelector(`[data-id="${song.id}"] .favorite`);next?.classList.add('favorite-changed');(next||document.querySelector('[data-tab="favorites"]')).focus({preventScroll:true});}else if(e.target.closest('.select-song')){const button=e.target.closest('.select-song');button.disabled=true;await copySong(song);if(button.isConnected)button.disabled=false;}});
  const snapshot=()=>[...document.querySelectorAll('#song-list>.folio-page')].map(reader=>{
    const copy=reader.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
    const controls=reader.querySelectorAll('button,input,a');copy.querySelectorAll('button,input,a').forEach((e,i)=>{e.style.opacity=getComputedStyle(controls[i]).opacity;e.tabIndex=-1;if(e.tagName==='INPUT'){e.value=controls[i].value;e.readOnly=true;}else if('disabled' in e)e.disabled=true;});
    copy.querySelectorAll('[data-page],[data-tab],[data-id]').forEach(e=>{e.removeAttribute('data-page');e.removeAttribute('data-tab');e.removeAttribute('data-id');});
    copy.style.padding=getComputedStyle(reader).padding;copy.style.setProperty('--rows',perLeaf);return copy;
  });
  const move=number=>{
    const next=Math.max(1,Math.min(Math.ceil(filtered().length/size)||1,Number(number)||1));if(next===page)return;
    const direction=next>page?'forward':'backward';
    const still=matchMedia('(max-width:800px)').matches||window.geneJourney?.getState().static||matchMedia('(prefers-reduced-motion:reduce)').matches;
    const previous=snapshot();page=next;render();window.geneJourney?.resetSongs();
    if(!still)window.geneBook?.turn({reader:list,previous,current:snapshot(),direction});
  };
  $('page-numbers').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){move(Number(b.dataset.page));$('page-numbers').querySelector('[aria-current]')?.focus({preventScroll:true});}});
  $('page-jump-form').addEventListener('submit',e=>{e.preventDefault();if($('page-jump').checkValidity())move(Number($('page-jump').value));else $('page-jump').reportValidity();});
  $('first-page').onclick=()=>move(1);$('previous-page').onclick=()=>move(page-1);$('next-page').onclick=()=>move(page+1);$('last-page').onclick=()=>move(Math.ceil(filtered().length/size));
  $('random-button').onclick=()=>{draw();if(candidate)dialog.showModal();};$('random-again').onclick=draw;$('random-confirm').onclick=async()=>{if(!candidate)return;$('random-confirm').disabled=true;await copySong(candidate);$('random-confirm').disabled=false;};
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if($('manual-copy').hidden)$('random-button').focus({preventScroll:true});});
  $('feedback').querySelector('button').onclick=()=>{$('feedback').hidden=true;$('search').focus({preventScroll:true});};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){e.preventDefault();$('search').focus({preventScroll:true});}});
  function fit(){const count=capacity();if(count!==perLeaf){const anchor=(page-1)*size;perLeaf=count;size=perLeaf*2;page=Math.floor(anchor/size)+1;render();}}
  render();fit();document.fonts.ready.then(fit);new ResizeObserver(fit).observe(columns[0]);
  window.geneCatalog={inspect:()=>({perLeaf,size,page,pages:Math.ceil(filtered().length/size),count:filtered().length})};
})();
