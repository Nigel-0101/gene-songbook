/* Reuse the same catalogue controls and data in a single mobile leaf.
   Comment anchors restore every original node when returning to desktop. */
(() => {
  'use strict';
  const narrow = matchMedia('(max-width:800px)');
  const list = document.getElementById('song-list');
  const left = list.querySelector('.folio-left');
  const right = list.querySelector('.folio-right');
  const wordmark = document.querySelector('.masthead .wordmark');
  const originalHref = wordmark.getAttribute('href');
  let leaf = null;
  const anchors = [];
  const move = (node, target) => {
    const anchor = document.createComment('desktop position');
    node.before(anchor);
    anchors.push({node, anchor});
    target.append(node);
  };
  const byId = id => document.getElementById(id);
  function adapt() {
    if (narrow.matches && !leaf) {
      leaf = document.createElement('section');
      leaf.className = 'folio-page mobile-songbook';
      leaf.setAttribute('aria-label', '深海拾音歌单');
      leaf.innerHTML = '<div class="mobile-song-rows"><figure class="mobile-watermark" aria-hidden="true"><img src="art/mobile/gene-portrait.webp" width="1033" height="1522" alt="" decoding="async"><figcaption>简 <em>Gene</em></figcaption></figure></div><footer class="folio-footer mobile-folio-footer"><nav class="mobile-pagination" aria-label="歌单翻页"></nav><div class="mobile-jump"></div></footer>';
      list.append(leaf);
      const rows = leaf.querySelector('.mobile-song-rows');
      const foot = leaf.querySelector('footer');
      const heading = left.querySelector('.folio-heading');
      // Move in reading order, including keyboard and screen-reader order.
      for (const node of [heading, right.querySelector('.search-wrap'), left.querySelector('.tabs'), left.querySelector('.page-topline')]) {
        move(node, leaf);
        leaf.insertBefore(node, rows);
      }
      move(byId('random-button'), heading);
      move(byId('result-count'), leaf.querySelector('.page-topline'));
      move(byId('songs-left'), rows);
      move(byId('songs-right'), rows);
      for (const id of ['previous-page', 'page-count', 'next-page']) move(byId(id), leaf.querySelector('.mobile-pagination'));
      for (const id of ['first-page', 'page-jump-form', 'last-page']) move(byId(id), leaf.querySelector('.mobile-jump'));
      move(right.querySelector('.local-note'), foot);
      wordmark.setAttribute('href', '#profile');
      if (!location.hash || location.hash === '#intro') history.replaceState(null, '', '#profile');
    } else if (!narrow.matches && leaf) {
      for (const {node, anchor} of anchors.reverse()) anchor.replaceWith(node);
      anchors.length = 0;
      leaf.remove();
      leaf = null;
      wordmark.setAttribute('href', originalHref);
    }
  }
  adapt();
  narrow.addEventListener('change', () => {
    window.geneBook?.cancel();
    adapt();
    requestAnimationFrame(() => window.geneJourney?.go(location.hash === '#catalog' ? 'catalog' : 'profile', {instant:true}));
  });
})();
