/* しごと計算ラボ シェアボタン([data-share] の中にボタンを入れる) */
(function(){
 function url(){var c=document.querySelector('link[rel=canonical]');return c?c.href:location.origin+location.pathname}
 function title(){return document.title.split('｜')[0].replace(/【.*?】/g,'').trim()+'｜しごと計算ラボ'}
 function toast(m){var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.className='toast on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},1800)}
 function copy(t){function fb(){var a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy')}catch(_){}document.body.removeChild(a);if(ok)toast('URLをコピーしました');else window.prompt('コピーしてください',t)}
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(function(){toast('URLをコピーしました')},fb);else fb()}
 function fill(){var u=encodeURIComponent(url()),tt=encodeURIComponent(title()+' 無料・登録不要で使えて便利');
  var L=[['x','X','https://twitter.com/intent/tweet?url='+u+'&text='+tt],['line','LINE','https://social-plugins.line.me/lineit/share?url='+u],
   ['fb','Facebook','https://www.facebook.com/sharer/sharer.php?u='+u],['hb','はてブ','https://b.hatena.ne.jp/entry/panel/?url='+u]];
  [].forEach.call(document.querySelectorAll('[data-share]'),function(el){if(el.dataset.done)return;el.dataset.done=1;
   el.innerHTML=L.map(function(s){return '<a class="sb sb-'+s[0]+'" href="'+s[2]+'" target="_blank" rel="noopener">'+s[1]+'</a>'}).join('')+'<button type="button" class="sb sb-cp">URLをコピー</button>';
   el.querySelector('.sb-cp').onclick=function(){copy(url())}})}
 window.SKShare=fill;if(document.readyState!=='loading')fill();else document.addEventListener('DOMContentLoaded',fill);
})();
/* ページ内リンク(#about など)の行き先が折りたたみの中なら、開いてから表示する */
(function(){
 function go(h,smooth){if(!h||h.length<2)return;var el;try{el=document.getElementById(decodeURIComponent(h.slice(1)))}catch(_){return}if(!el)return;
  if(el.tagName==='DETAILS')el.open=true;var p=el.parentNode&&el.parentNode.closest?el.parentNode.closest('details'):null;while(p){p.open=true;p=p.parentNode&&p.parentNode.closest?p.parentNode.closest('details'):null}
  el.scrollIntoView({block:'start',behavior:smooth?'smooth':'auto'})}
 document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var h=a.getAttribute('href');if(!document.getElementById(h.slice(1)))return;e.preventDefault();history.replaceState(null,'',h);go(h,true)});
 if(location.hash)setTimeout(function(){go(location.hash)},0);
})();
/* 入力欄に移ったとき、画面下に固定した帯(結果・PDF保存など)にかかっていたら、その分だけスクロールする(2026-11-07) */
(function(){
 function coverTop(){var y=innerHeight-4,els=document.elementsFromPoint?document.elementsFromPoint(innerWidth/2,y):[];
  for(var i=0;i<els.length;i++){var s=getComputedStyle(els[i]);if(s.position==='fixed'&&+s.opacity>0)return els[i].getBoundingClientRect().top}
  for(var e=els[0];e;e=e.parentElement){if(getComputedStyle(e).position==='fixed')return e.getBoundingClientRect().top}
  return innerHeight}
 document.addEventListener('focusin',function(e){var el=e.target;if(!el||!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))return;
  setTimeout(function(){var r=el.getBoundingClientRect(),t=coverTop();if(r.bottom>t-8)window.scrollBy(0,Math.min(r.bottom-t+16,r.top-8))},60)});
})();
