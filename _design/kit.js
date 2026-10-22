/* デザイン見本用：線画アイコンと消費税の計算(見本専用。本番には入れない) */
(function(){
var I={
 mitsumori:'<path d="M12 6h18l8 8v28H12z"/><path d="M30 6v8h8"/><path d="M18 22h12M18 28h7"/><path d="M29 41l11-11 3.5 3.5-11 11H29z"/>',
 nohinsho:'<path d="M8 17l16-8 16 8v19l-16 8-16-8z"/><path d="M8 17l16 8 16-8"/><path d="M24 25v19"/><path d="M14 29l5 2.5"/>',
 seikyusho:'<path d="M12 6h18l8 8v28H12z"/><path d="M30 6v8h8"/><path d="M19 20l6 7 6-7M25 27v10M20 30h10M20 34h10"/>',
 ryoshusho:'<path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z"/><path d="M18 22l5 5 8-9"/>',
 gensen:'<circle cx="20" cy="27" r="13"/><path d="M15 21l5 6 5-6M20 27v8M16 30h8"/><circle cx="37" cy="12" r="7"/><path d="M34 12h6"/>',
 hacchusho:'<path d="M12 10h20v32H12z"/><path d="M17 6h10v7H17z"/><path d="M17 22h10M17 28h7"/><path d="M28 36h15M39 32l4 4-4 4"/>',
 sofujo:'<path d="M6 13h36v24H6z"/><path d="M6 13l18 14 18-14"/>',
 eigyobi:'<path d="M8 11h32v30H8z"/><path d="M8 19h32"/><path d="M16 7v8M32 7v8"/><path d="M18 30l4 4 8-8"/>',
 shohizei:'<path d="M6 25L23 8h17v17L23 42z"/><circle cx="33" cy="15" r="2.5"/><path d="M17 32l10-10"/><circle cx="17.5" cy="23.5" r="2"/><circle cx="26.5" cy="31.5" r="2"/>',
 hiwari:'<path d="M8 11h32v30H8z"/><path d="M8 19h32"/><path d="M16 7v8M32 7v8"/><path d="M15 30h18M15 26v8M33 26v8"/>',
 keihi:'<path d="M7 15h31v26H7z"/><path d="M7 15l24-7v7"/><path d="M28 24h12v9H28z"/><circle cx="33" cy="28.5" r="1.2"/>',
 bag:'<path d="M10 17h28l-2 25H12z"/><path d="M18 17v-4a6 6 0 0 1 12 0v4"/>',
 food:'<path d="M24 8c3 0 16 22 16 27 0 4-3 6-6 6H14c-3 0-6-2-6-6 0-5 13-27 16-27z"/><path d="M18 30h12v11H18z"/>',
 mix:'<path d="M6 19h20l-2 21H8z"/><path d="M12 19v-3a4 4 0 0 1 8 0v3"/><path d="M34 14c2 0 10 15 10 18s-2 4-4 4H28c-2 0-4-1-4-4 0-3 8-18 10-18z"/>'
};
window.TOOLS=[
 {k:'mitsumori',n:'見積書',g:'doc',c:'#0f766e'},{k:'nohinsho',n:'納品書',g:'doc',c:'#0369a1'},
 {k:'seikyusho',n:'請求書',g:'doc',c:'#4338ca'},{k:'ryoshusho',n:'領収書',g:'doc',c:'#c2410c'},
 {k:'hacchusho',n:'発注書',g:'doc',c:'#be123c'},{k:'sofujo',n:'送付状',g:'doc',c:'#15803d'},
 {k:'keihi',n:'経費精算書',g:'doc',c:'#4d7c0f'},
 {k:'shohizei',n:'消費税',g:'calc',c:'#a21caf'},{k:'gensen',n:'源泉徴収税',g:'calc',c:'#1d4ed8'},
 {k:'hiwari',n:'日割り',g:'calc',c:'#b45309'},{k:'eigyobi',n:'営業日・支払日',g:'calc',c:'#6d28d9'}
];
window.icon=function(k,cls){return '<svg class="'+(cls||'ic')+'" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'+I[k]+'</svg>'};
document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('[data-i]').forEach(function(e){e.innerHTML=icon(e.dataset.i,e.dataset.c)})});

var num=function(s){s=String(s).replace(/[^\d]/g,'');return s?+s:0};
var f=function(v){return v.toLocaleString('ja-JP')};
function one(mode,a,r){if(mode==='ex'){var t=Math.floor(a*r/100);return{r:r,ex:a,tax:t,inc:a+t}}var u=Math.floor(a*r/(100+r));return{r:r,ex:a-u,tax:u,inc:a}}
window.Calc={f:f,init:function(render){
 var st={mode:'ex',rate:'10'},$=function(i){return document.getElementById(i)};
 function go(){
  var parts=st.rate==='mix'?[one(st.mode,num($('a10').value),10),one(st.mode,num($('a8').value),8)]:[one(st.mode,num($('amt').value),+st.rate)];
  var s=function(k){return parts.reduce(function(a,p){return a+p[k]},0)};
  document.querySelectorAll('[data-ex]').forEach(function(e){e.textContent=st.mode==='ex'?e.dataset.ex:e.dataset.in});
  document.querySelectorAll('[data-show]').forEach(function(e){e.hidden=(e.dataset.show==='mix')!==(st.rate==='mix')});
  render({mode:st.mode,rate:st.rate,parts:parts,ex:s('ex'),tax:s('tax'),inc:s('inc')});
 }
 function grp(attr,key){var bs=document.querySelectorAll('['+attr+']');bs.forEach(function(b){b.addEventListener('click',function(){st[key]=b.getAttribute(attr);bs.forEach(function(x){x.setAttribute('aria-pressed',x===b)});go()})})}
 grp('data-mode','mode');grp('data-rate','rate');
 ['amt','a10','a8'].forEach(function(i){var e=$(i);if(!e)return;e.addEventListener('input',function(){var v=num(e.value);e.value=e.value.trim()===''?'':f(v);go()});e.addEventListener('focus',function(){e.select()})});
 go();
}};
})();
