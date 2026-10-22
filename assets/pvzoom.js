/* しごと計算ラボ 書類プレビューの拡大・大画面(見積書〜発注書・送付状・経費精算書で共通)
   各ツールの fit() が、縮小率を決めたあとに PVZ.adj(縮小率, 用紙, 箱) を呼ぶ。 */
(function(){
 var Z=[1,1.5,2,3],zi=0,full=false,pv,wrap,lab,fitFn;
 function $(id){return document.getElementById(id)}
 window.PVZ={
  adj:function(s,p,box){
   if(!pv)return s;
   var z=Z[zi],W=wrap.clientWidth-parseFloat(getComputedStyle(wrap).paddingLeft)*2;
   // 大画面：画面の幅に合わせる(最大で実寸)
   if(full)s=Math.min(1.25,W/p.offsetWidth);
   if(lab)lab.textContent=Math.round(z*100)+'%';
   wrap.classList.toggle('zoomed',z>1||full);
   if(!full){wrap.style.maxHeight=z>1?(Math.round(p.offsetHeight*s)+parseFloat(getComputedStyle(wrap).paddingTop)*2)+'px':''}else wrap.style.maxHeight='';
   return s*z}
 };
 function refresh(){if(typeof window.PVfit==='function')window.PVfit()}
 function setFull(on){full=on;zi=0;pv.classList.toggle('pvfull',on);document.documentElement.classList.toggle('pvlock',on);
  $('pvzFull').innerHTML=on?ICO.close+'閉じる':ICO.full+'大きく表示';$('pvzFull').setAttribute('aria-pressed',on);
  refresh();if(on)wrap.scrollTop=0;else pv.scrollIntoView({block:'nearest'})}
 var ICO={full:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
 function init(){
  pv=$('pv');if(!pv)return;wrap=pv.querySelector('.pvwrap');var h=pv.querySelector('.pvh');if(!wrap||!h||$('pvz'))return;
  h.insertAdjacentHTML('afterend','<div class="pvz" id="pvz" role="group" aria-label="プレビューの大きさ">'+
   '<button type="button" id="pvzOut" aria-label="縮小">−</button><span id="pvzLab" aria-live="polite">100%</span><button type="button" id="pvzIn" aria-label="拡大">＋</button>'+
   '<button type="button" class="pvzf" id="pvzFull" aria-pressed="false">'+ICO.full+'大きく表示</button></div>');
  lab=$('pvzLab');
  $('pvzIn').onclick=function(){if(zi<Z.length-1){zi++;refresh()}};
  $('pvzOut').onclick=function(){if(zi>0){zi--;refresh()}};
  $('pvzFull').onclick=function(){setFull(!full)};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&full&&!window.SKTourOn)setFull(false)});
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
