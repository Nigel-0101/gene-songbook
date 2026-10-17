(() => {
  'use strict';
  const songs = window.GENE_SONGS;
  const key = 'gene-songbook-handbook-v2';
  const ids = new Set(songs.map(s => String(s.id)));
  const read = () => { try { const s=JSON.parse(localStorage.getItem(key)||'{}'); return {favorites:(Array.isArray(s.favorites)?s.favorites:[]).filter(x=>ids.has(String(x))),recent:(Array.isArray(s.recent)?s.recent:[]).filter(x=>ids.has(String(x)))}; } catch { return {favorites:[],recent:[]}; } };
  const saved = read();
  let favorites=new Set(saved.favorites.map(String)), recent=saved.recent.map(String), selected=null, tab='all', page=1, query='', candidate=null, lastCandidate=null, timer;
  const size=12, $=id=>document.getElementById(id), list=$('song-list'), dialog=$('random-dialog');
  const norm=t=>String(t??'').normalize('NFKC').trim().toLocaleLowerCase();
  const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify({favorites:[...favorites],recent}));}catch{}};
  const filtered=()=>{ let result=tab==='recent'?recent.map(id=>songs.find(s=>String(s.id)===id)).filter(Boolean):songs.filter(s=>tab!=='favorites'||favorites.has(String(s.id)));const q=norm(query); if(q)result=result.filter(s=>/^\d+$/.test(q)?Number(s.sequence)===Number(q):norm(s.name+' '+s.singer).includes(q));return result;};
  function render(){
    const matches=filtered(), pages=Math.max(1,Math.ceil(matches.length/size)); page=Math.max(1,Math.min(page,pages));
    list.style.setProperty('--rows',Math.max(1,Math.ceil(Math.min(size,matches.length-(page-1)*size)/2)));
    $('all-count').textContent=songs.length;$('favorite-count').textContent=favorites.size;$('recent-count').textContent=recent.length;$('result-count').textContent=matches.length+' 首';
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
    list.innerHTML=matches.slice((page-1)*size,page*size).map(s=>`<article class="song-row${String(s.id)===selected?' is-selected':''}" data-id="${s.id}"><span class="song-number">${String(s.sequence).padStart(3,'0')}</span><div class="song-info"><h3 class="song-name">${esc(s.name)}</h3>${s.singer?`<p class="song-singer">${esc(s.singer)}</p>`:''}</div><button type="button" class="favorite" aria-label="${favorites.has(String(s.id))?'取消收藏':'收藏'} ${esc(s.name)}" aria-pressed="${favorites.has(String(s.id))}"><i class="icon" aria-hidden="true">&#xe0e8;</i></button><button type="button" class="select-song" aria-label="点歌 ${esc(s.name)}">${String(s.id)===selected?'<i class="icon" aria-hidden="true">&#xe182;</i>已选':'点歌'}</button></article>`).join('')||`<div class="empty-state">${query?'没有找到这首歌':tab==='favorites'?'收藏你喜欢的歌':tab==='recent'?'还没有点过歌':'暂时没有歌曲'}<small>${query?'试试歌名、歌手，或歌曲前面的编号。':tab==='favorites'?'点击歌曲旁的书签，就能在这里找到它。':'选一首喜欢的，开始今天的歌单。'}</small></div>`;
    $('page-count').textContent=page+' / '+pages; $('first-page').disabled=$('previous-page').disabled=page===1;$('last-page').disabled=$('next-page').disabled=page===pages;$('random-button').disabled=matches.length===0;
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
  list.addEventListener('click',async e=>{const row=e.target.closest('[data-id]');if(!row)return;const song=songs.find(s=>String(s.id)===row.dataset.id);if(e.target.closest('.favorite')){favorites.has(row.dataset.id)?favorites.delete(row.dataset.id):favorites.add(row.dataset.id);persist();render();const next=list.querySelector(`[data-id="${song.id}"] .favorite`);(next||document.querySelector('[data-tab="favorites"]')).focus({preventScroll:true});}else if(e.target.closest('.select-song')){const button=e.target.closest('.select-song');button.disabled=true;await copySong(song);if(button.isConnected)button.disabled=false;}});
  const move=number=>{page=number;render();window.geneJourney?.resetSongs();};
  $('first-page').onclick=()=>move(1);$('previous-page').onclick=()=>move(page-1);$('next-page').onclick=()=>move(page+1);$('last-page').onclick=()=>move(Math.ceil(filtered().length/size));
  $('random-button').onclick=()=>{draw();if(candidate)dialog.showModal();};$('random-again').onclick=draw;$('random-confirm').onclick=async()=>{if(!candidate)return;$('random-confirm').disabled=true;await copySong(candidate);$('random-confirm').disabled=false;};
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if($('manual-copy').hidden)$('random-button').focus({preventScroll:true});});
  $('feedback').querySelector('button').onclick=()=>{$('feedback').hidden=true;$('search').focus({preventScroll:true});};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){e.preventDefault();$('search').focus();}});
  render();
})();

