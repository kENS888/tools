/* しごと計算ラボ 使い方の案内(共通)：「こんな人・こんな時に」のカードを押すと、例の内容を入れて画面の該当部分を順に光らせる。
   最後に「この例のまま使う」か「元の入力に戻す」を選べる。×・Escでも元に戻す。
   SKTour({sc:{key:{t:'見出し',steps:[[target,'説明'],…]}}, tg:{target:function(){return 要素}}, begin:function(c){例を入れる}, snap:function(){return 今の状態}, back:function(s){戻す}, prep:function(target){任意}, use:function(c){任意}}) */
(function(){
 window.SKTour=function(o){
  var cur=null,i=0,saved=null,ring,bub,shade;
  function el(c){var e=document.createElement('div');e.className=c;document.body.appendChild(e);return e}
  function start(k){var c=o.sc[k];if(!c)return;saved={s:o.snap(),y:window.scrollY};cur=c;i=0;window.SKTourOn=true;o.begin(c);
   shade=el('tshade');ring=el('tring');bub=el('tbub');bub.setAttribute('role','dialog');bub.setAttribute('aria-label','使い方：'+c.t);
   document.addEventListener('keydown',key);window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});setTimeout(show,80)}
  function key(e){if(e.key==='Escape'){e.stopPropagation();end(false)}}
  function show(){var st=cur.steps[i],n=cur.steps.length,last=i===n-1;if(o.prep)o.prep(st[0]);
   bub.innerHTML='<div class="th"><span>使い方の例：'+cur.t+'</span><button type="button" class="tx" aria-label="閉じる">×</button></div><p>'+st[1]+'</p>'+
    '<div class="tf"><span class="tn">'+(i+1)+' / '+n+'</span>'+(i?'<button type="button" class="tb0">戻る</button>':'')+
    (last?'<button type="button" class="tb0" data-r="1">元の入力に戻す</button><button type="button" class="tb1">この例のまま使う</button>':'<button type="button" class="tb1">次へ</button>')+'</div>';
   bub.querySelector('.tx').onclick=function(){end(false)};
   [].forEach.call(bub.querySelectorAll('.tb0'),function(b){b.onclick=b.dataset.r?function(){end(false)}:function(){i--;show()}});
   bub.querySelector('.tb1').onclick=last?function(){end(true)}:function(){i++;show()};
   setTimeout(function(){var t=o.tg[st[0]]();t.scrollIntoView({block:t.offsetHeight>innerHeight*.6?'start':'center',behavior:'instant'});place();setTimeout(place,350);
    try{bub.querySelector('.tb1').focus({preventScroll:true})}catch(_){}},30)}
  function place(){if(!cur)return;var t=o.tg[cur.steps[i][0]](),r=t.getBoundingClientRect(),sx=window.scrollX,sy=window.scrollY,pad=6,vh=window.innerHeight,vw=document.documentElement.clientWidth;
   ring.style.cssText='left:'+(r.left+sx-pad)+'px;top:'+(r.top+sy-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px';
   var bw=Math.min(340,vw-24),bh=bub.offsetHeight,left=Math.max(12,Math.min(r.left+r.width/2-bw/2,vw-bw-12)),top;
   if(r.bottom+pad+12+bh<=vh)top=r.bottom+pad+12;else if(r.top-pad-12-bh>=0)top=r.top-pad-12-bh;else top=vh-bh-12;
   bub.style.cssText='width:'+bw+'px;left:'+(left+sx)+'px;top:'+(top+sy)+'px'}
  function end(use){if(!cur)return;var c=cur;cur=null;window.SKTourOn=false;
   [shade,ring,bub].forEach(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e)});
   document.removeEventListener('keydown',key);window.removeEventListener('resize',place);window.removeEventListener('scroll',place);
   if(use){if(o.use)o.use(c)}else{o.back(saved.s);window.scrollTo(0,saved.y)}}
  [].forEach.call(document.querySelectorAll('.who [data-sc]'),function(b){b.onclick=function(){start(b.dataset.sc)}});
 };
})();
