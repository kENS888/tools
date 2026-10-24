/* しごと計算ラボ：季節のおすすめ(トップ)と、noteの記事(トップ・各ツール)を表示する */
(function(){
 var css='.xs-card{background:var(--card,#fff);border:1.5px solid var(--ink,#14171f);border-radius:0;padding:18px 20px;margin:0 0 16px}'+
 '.xs-card h2{font-size:1.05rem;margin:0 0 4px}.xs-card .xs-sub{font-size:.82rem;color:var(--sub,#5b6474);margin:0 0 12px}'+
 '.xs-list{display:grid;gap:8px}.xs-list a{display:flex;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line,#e3e7ee);border-radius:0;text-decoration:none;color:inherit;background:var(--card,#fff)}'+
 '.xs-list a:hover{border-color:var(--c,#2554d8)}.xs-list b{display:block;font-size:.95rem}.xs-list span.d{display:block;font-size:.8rem;color:var(--sub,#5b6474);line-height:1.5}'+
 '.xs-dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--c,#2554d8)}'+
 '.xs-cards{display:grid;grid-auto-flow:column;grid-auto-columns:80%;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 10px;margin:0 -2px;-webkit-overflow-scrolling:touch}'+
 '.xs-cards a{scroll-snap-align:start;display:flex;flex-direction:column;text-decoration:none;color:inherit;min-width:0}'+
 '.xs-cards .th{aspect-ratio:1280/670;background:var(--bg,#f4f6f9);border:1px solid var(--line,#e3e7ee);overflow:hidden}'+
 '.xs-cards .th img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s}'+
 '.xs-cards a:hover .th img{transform:scale(1.04)}'+
 '.xs-cards.one{grid-auto-columns:100%}'+
 '.xs-cards b{font-size:1rem;line-height:1.55;margin-top:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'+
 '.xs-cards .meta{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:.75rem;color:var(--sub,#5b6474)}'+
 '.xs-cards .meta i{width:16px;height:16px;border-radius:50%;background:#f5c542;flex:none}'+
 '@media (min-width:700px){.xs-cards{grid-auto-flow:row;grid-template-columns:repeat(2,1fr);overflow:visible}}'+
'.xs-more{display:inline-block;margin-top:10px;font-size:.85rem;font-weight:600}';
 var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 var T={nenmatsu:['年末調整 還付金シミュレーター','#0f766e'],furusato:['ふるさと納税 上限額','#be185d'],zangyo:['残業代 計算','#0369a1'],gensen:['源泉徴収税 計算','#2554d8'],
  seikyusho:['請求書 作成','#4f46e5'],mitsumori:['見積書 作成','#0d8a7f'],nohinsho:['納品書 作成','#0377b3'],ryoshusho:['領収書 作成','#d9540f'],hacchusho:['発注書・注文書 作成','#be123c'],
  sofujo:['送付状 作成','#16803c'],keihi:['経費精算書 作成','#4d7c0f'],eigyobi:['営業日・支払期日 計算','#6d28d9'],shohizei:['消費税計算','#a21caf'],hiwari:['日割り計算','#b45309']};
 // 月ごとの「この時期に役立つツール」
 var S={1:['年明けの事務に',[['eigyobi','年末年始の休みを除いた支払日を確認'],['seikyusho','新しい年の請求書を作成'],['gensen','確定申告の前に、源泉徴収された額を確認']]],
  2:['確定申告の時期に',[['gensen','報酬から引かれた源泉徴収税を確認'],['keihi','立て替えた経費を整理'],['shohizei','税込・税抜の計算に']]],
  3:['年度末・引っ越しの時期に',[['hiwari','月の途中の入居・退去の家賃を日割り'],['keihi','年度末の経費精算に'],['seikyusho','年度末の請求書をまとめて作成']]],
  4:['入社・新年度の時期に',[['hiwari','月の途中の入社の給与を日割り'],['eigyobi','新しい取引先の支払日を確認'],['mitsumori','新年度の見積書を作成']]],
  5:['新生活が落ち着く時期に',[['zangyo','4月・5月の残業代を確認'],['hiwari','家賃・利用料の日割りに'],['seikyusho','請求書の作成に']]],
  6:['夏のボーナス・繁忙期に',[['zangyo','忙しい月の残業代を確認'],['shohizei','セール価格の税込・税抜計算に'],['ryoshusho','領収書の作成と印紙の確認']]],
  7:['夏の繁忙期に',[['zangyo','残業代・深夜手当を確認'],['eigyobi','お盆休みを除いた支払日を確認'],['seikyusho','請求書の作成に']]],
  8:['お盆・夏休みの時期に',[['eigyobi','夏季休暇を除いた営業日を計算'],['furusato','ふるさと納税の上限を早めに確認'],['zangyo','残業代の確認に']]],
  9:['下半期のはじまりに',[['furusato','年内のふるさと納税の上限を確認'],['hiwari','月の途中の異動・引っ越しに'],['mitsumori','下半期の見積書を作成']]],
  10:['年末調整の準備の時期に',[['nenmatsu','今年の年末調整でいくら戻るか確認'],['furusato','年内のふるさと納税の上限を確認'],['zangyo','残業代の確認に']]],
  11:['年末調整・ふるさと納税の時期に',[['nenmatsu','令和8年の改正で、いくら戻るか確認'],['furusato','年内のふるさと納税、上限はいくら?'],['zangyo','年末の繁忙期の残業代を確認']]],
  12:['年末の時期に',[['furusato','12月31日までのふるさと納税の上限を確認'],['nenmatsu','年末調整で戻る額を確認'],['eigyobi','年末年始の休みを除いた支払日を確認']]]};
 // 記事とツールを結びつけるキーワード
 var K={nenmatsu:['年末調整','還付'],furusato:['ふるさと納税'],zangyo:['残業','深夜手当'],gensen:['源泉徴収'],seikyusho:['請求書','インボイス'],mitsumori:['見積'],
  nohinsho:['納品書'],ryoshusho:['領収書','収入印紙'],hacchusho:['発注書','注文書'],sofujo:['送付状'],keihi:['経費精算','交通費精算'],eigyobi:['支払期日','営業日','支払日'],shohizei:['消費税'],hiwari:['日割り']};
 var here=(location.pathname.split('/')[1]||'');
 var sb=document.getElementById('season');
 if(sb){var m=new Date().getMonth()+1,s=S[m];
  sb.innerHTML='<div class="xs-card"><h2>'+esc(s[0])+'</h2><p class="xs-sub">'+m+'月に役立つツール</p><div class="xs-list">'+s[1].map(function(x){var t=T[x[0]];return '<a href="/'+x[0]+'/" style="--c:'+t[1]+'"><i class="xs-dot"></i><span><b>'+esc(t[0])+'</b><span class="d">'+esc(x[1])+'</span></span></a>'}).join('')+'</div></div>';sb.hidden=false}
 var nb=document.getElementById('noteFeed');
 if(!nb)return;
 var tool=nb.getAttribute('data-tool');
 fetch('/api/note').then(function(r){return r.ok?r.json():{items:[]}}).then(function(d){
  var it=(d&&d.items)||[];
  if(tool){var kw=K[tool]||[];it=it.filter(function(x){var t=x.title+' '+x.desc;return kw.some(function(k){return t.indexOf(k)>=0})})}
  it=it.slice(0,tool?3:6);if(!it.length)return;
  nb.innerHTML='<div class="xs-card"><h2>'+(tool?'関連する解説・コラム':'お知らせ・活用コラム')+'</h2><p class="xs-sub">'+(tool?'このツールの使いどころを、noteで解説しています':'ツールの使い方や、制度の変更点をnoteで解説しています')+'</p><div class="xs-cards'+(it.length===1?' one':'')+'">'+
   it.map(function(x){return '<a href="'+esc(x.link)+'" target="_blank" rel="noopener"><span class="th">'+(x.thumb?'<img src="'+esc(x.thumb)+'" alt="" loading="lazy">':'')+'</span><b>'+esc(x.title)+'</b><span class="meta"><i></i>Kens'+(x.date?'<time datetime="'+esc(x.date)+'">・'+esc(x.date.replace(/-/g,'/'))+'</time>':'')+'</span></a>'}).join('')+
   '</div>'+(tool?'':'<a class="xs-more" href="https://note.com/k88855888" target="_blank" rel="noopener">noteの記事をすべて見る →</a>')+'</div>';
  nb.hidden=false}).catch(function(){});
})();
