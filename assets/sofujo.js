/* しごと計算ラボ 送付状(郵送・FAX) 作成(画面)。あなたの情報は見積書〜発注書と共通 */
(function(){
var $=function(id){return document.getElementById(id)};
var KEY='shorui_v1',SKEY='sofujo_v1',HKEY='sofujo_hist_v1',DHKEY='shorui_hist_v1',INKEY='sofujo_in';
var DOCN={q:'見積書',n:'納品書',i:'請求書',r:'領収書',o:'発注書'};
var DOCS=['請求書','見積書','納品書','領収書','発注書','注文書','注文請書','契約書','資料'];
var MEMO=[['ご返送のお願い','お手数ですが、ご署名・ご捺印のうえ、1部をご返送くださいますようお願い申し上げます。'],
 ['返信用封筒を同封','返信用封筒を同封しておりますので、ご利用ください。'],
 ['原本の送付','原本をお送りいたしますので、お手元で保管くださいますようお願いいたします。'],
 ['お問い合わせ先','ご不明な点がございましたら、担当までお気軽にお問い合わせください。']];
var UNITS=[['部','部'],['通','通'],['枚','枚'],['冊','冊'],['点','点'],['式','式'],['','なし']];
var TTL={p:['書類送付のご案内','送付状','送付のご案内'],f:['FAX送信のご案内','FAX送付状','FAX送信票']};
var GREET=[['auto','おまかせ'],['jikou','拝啓＋時候の挨拶'],['jika','拝啓＋時下(季節を問わない)'],['kinkei','謹啓＋時候の挨拶(より丁寧)'],['none','頭語なし(簡潔)']];
var ICON={p:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 f:'<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M7 15h10v6H7z"/><path d="M17.5 12h.01"/>'};
function ico(k){return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ICON[k]+'</svg>'}
function iso(t){var p=function(n){return ('0'+n).slice(-2)};return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate())}
function today(){return iso(new Date())}
function J(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(_){return d}}
function blank(){return {mode:'p',to:'',hon:'御中',person:'',tofax:'',rows:[{n:'',q:'1',u:'部'}],date:today(),subj:'',ttlP:TTL.p[0],ttlF:TTL.f[0],greet:'auto',body:'',memo:'',pages:'',wareki:false}}
var S=blank(),ME={from:'',addr:'',tel:'',fax:'',tanto:'',color:'navy'},keep=true,restored=false,inMsg='';
var sv=J(KEY,null);if(sv){if(sv.me)ME=Object.assign(ME,sv.me);if(sv.keep===false)keep=false}
function hasContent(){return !!(S.to.trim()||S.person.trim()||S.rows.some(function(r){return r.n.trim()}))}
// 送付状の日付は、開いた日にする
if(keep){var d=J(SKEY,null);if(d){S=Object.assign(blank(),d);S.date=today();restored=hasContent()}}
// 見積書〜発注書の「送付状も作る」から来た場合
try{var inn=JSON.parse(sessionStorage.getItem(INKEY)||'null');sessionStorage.removeItem(INKEY);
 if(inn){var md=S.mode;S=blank();S.mode=md;S.to=inn.to||'';S.hon=inn.hon!=null?inn.hon:'御中';S.rows=inn.rows&&inn.rows.length?inn.rows:S.rows;restored=false;inMsg=(inn.rows&&inn.rows[0]?inn.rows[0].n:'書類')+'の宛名と書類名を入れました'}}catch(_){}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ph(v,p){return v?esc(v):'<span class="ph">'+p+'</span>'}
function jd(v){if(!v)return '';if(S.wareki)return wareki(v);var p=v.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function toast(m){var t=$('toast');t.textContent=m;t.className='toast on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},2200)}
function FX(){return S.mode==='f'}
function ttl(){return FX()?S.ttlF:S.ttlP}
function greet(){return S.greet==='auto'?(FX()?'none':'jikou'):S.greet}
function named(){return S.rows.filter(function(r){return r.n.trim()})}
function F(id,lbl,ph_,o){o=o||{};return '<div'+(o.w?' class="w"':'')+(o.show?' data-show="'+o.show+'"':'')+'><label class="f" for="'+id+'">'+lbl+(o.em?'<em>'+o.em+'</em>':'')+'</label>'+
 (o.ta?'<textarea id="'+id+'" rows="'+o.ta+'" placeholder="'+ph_+'"></textarea>':'<input id="'+id+'" type="'+(o.t||'text')+'" placeholder="'+ph_+'"'+(o.a?' autocomplete="'+o.a+'"':'')+(o.l?' list="'+o.l+'" autocomplete="off"':'')+(o.im?' inputmode="'+o.im+'"':'')+'>')+'</div>'}

/* ---------- フォーム ---------- */
function build(){
 var h='<div class="app"><div class="card fm">'+
 '<div class="pill ttl" id="mode" role="group" aria-label="送り方"><button type="button" data-v="p">'+ico('p')+'郵送・手渡し</button><button type="button" data-v="f">'+ico('f')+'FAX</button></div>'+
 (restored?'<div class="restore" id="restore"><span>前回の入力内容を表示しています</span><button type="button" id="restoreNew">新しく作る</button></div>':'')+
 '<div class="restore recent" id="recent" hidden><span id="recentT"></span><button type="button" id="recentB">入れる</button></div>'+
 '<button type="button" class="hbtn" id="histBtn" aria-haspopup="dialog" hidden><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>過去の送付状から作る<span id="histN"></span></button>'+

 '<section class="sec"><div class="sh"><span class="n">1</span><h2>送る相手</h2></div>'+
 '<label class="f" for="to">宛名(会社名・お名前)</label><div class="toH"><input id="to" type="text" placeholder="株式会社〇〇 経理部" list="dlTo" autocomplete="off"><select id="hon" aria-label="敬称"><option>御中</option><option>様</option><option value="">なし</option></select></div>'+
 '<div class="g2">'+F('person','ご担当者','山田 太郎',{em:'任意',l:'dlPs'})+F('tofax','相手のFAX番号','03-0000-0000',{show:'f',im:'tel'})+'</div></section>'+

 '<section class="sec"><div class="sh"><span class="n">2</span><h2>送る書類</h2></div>'+
 '<div id="rows"></div>'+
 '<button type="button" class="add" id="addDoc">＋ 書類を追加</button>'+
 '<details class="more" id="txtBox"><summary>日付・文面<span class="ms" id="txtSum"></span></summary>'+
 '<div class="g2">'+F('date','日付','',{t:'date'})+
 '<div><label class="f" for="ttl">タイトル</label><select id="ttl"></select></div>'+
 '<div class="w"><label class="f" for="greet">あいさつ文</label><select id="greet">'+GREET.map(function(g){return '<option value="'+g[0]+'">'+g[1]+'</option>'}).join('')+'</select></div>'+
 F('subj','件名','10月分ご請求書の送付について',{em:'任意',w:1})+
 F('body','本文','',{em:'変える場合だけ',w:1,ta:3})+
 F('pages','送信枚数(この送付状を含む)','自動',{show:'f',im:'numeric'})+
 '</div><label class="ck"><input type="checkbox" id="wareki"><span>日付を和暦(令和)で表示する</span></label></details>'+
 '<details class="more" id="memoBox"><summary>連絡事項<span class="ms" id="memoSum"></span></summary>'+
 '<div class="qk">'+MEMO.map(function(m,i){return '<button type="button" data-m="'+i+'">＋'+m[0]+'</button>'}).join('')+'</div>'+
 '<textarea id="memo" aria-label="連絡事項" rows="3" placeholder="例：先日お打ち合わせいただいた件の資料です。"></textarea></details></section>'+

 '<details class="sec" id="meSec"><summary><div class="sh"><span class="n">3</span><h2>あなた(差出人)の情報</h2><span class="r" id="meSt"></span></div></summary>'+
 '<div class="g2">'+F('from','会社名・屋号・氏名','山田デザイン事務所',{w:1,a:'organization'})+
 F('addr','住所','〒100-0001 東京都千代田区…',{w:1,ta:2})+F('tel','電話・メール','03-0000-0000',{em:'任意'})+F('fax','FAX番号','03-0000-0001',{em:'任意',im:'tel'})+
 F('tanto','担当者','営業部 佐藤',{em:'任意',w:1})+'</div>'+
 '<label class="f">書類の色</label><div class="sw" id="sw">'+[['navy','#1e3a8a','ネイビー'],['black','#222','ブラック'],['green','#0f766e','グリーン'],['red','#9f1239','えんじ']].map(function(c){return '<button type="button" data-c="'+c[0]+'" style="background:'+c[1]+'" aria-label="'+c[2]+'" title="'+c[2]+'"></button>'}).join('')+'</div>'+
 '<label class="ck"><input type="checkbox" id="keep"><span>この端末に入力内容を保存する<span class="note">保存先はこのブラウザだけで、サーバーには送信されません。共用のパソコンではオフにしてください。会社名・住所などは見積書・請求書などのツールと共通です。</span></span></label>'+
 '</details>'+
 ''+
 '<div class="share" id="shareAsk" hidden><b>PDFができました</b><span>便利だと思ったら、お仕事仲間にシェアしていただけるとうれしいです。</span><div class="sbtns" data-share></div></div>'+
 '</div>'+

 '<div class="pv" id="pv"><div class="card"><div class="pvh"><h2>プレビュー <span class="pv-chip" id="pvChip"></span></h2><span class="note"><span class="dot"></span>入力するとすぐに反映されます</span></div>'+
 '<div class="pvwrap"><div class="pvbox" id="pvbox"><div id="paperHost"></div></div></div>'+
 '<div class="acts pvacts"><button type="button" class="btn p" id="pdf2">PDFをダウンロード</button><button type="button" class="btn" id="print2">印刷</button><button type="button" class="btn" id="reset">新しく作る</button></div>'+
 '<p class="note" style="margin:10px 0 0">送付状は、送る書類の一番上に重ねて封筒に入れます。コンビニで印刷する場合は、保存したPDFをセブン‐イレブンの「netprint」や、ファミリーマート・ローソンなどの「ネットワークプリント」のアプリに登録してください。</p></div></div></div>'+
 '<datalist id="dlTo"></datalist><datalist id="dlPs"></datalist><datalist id="dlDoc"></datalist>'+
 '<dialog class="hdlg" id="hdlg" aria-labelledby="hdlgT"><div class="hh"><b id="hdlgT">過去の送付状から作る</b><button type="button" class="ib" id="hClose" aria-label="閉じる">×</button></div>'+
 '<p class="note">選ぶと内容が入ります。日付は今日になります。</p><input type="search" id="hq" placeholder="宛名・書類名で検索" aria-label="宛名・書類名で検索" hidden><ul class="hl" id="hlist"></ul>'+
 '<p class="note">PDF保存・印刷した送付状を、このブラウザに最新30件まで記録しています(サーバーには送信されません)。</p></dialog>';
 $('app').innerHTML=h;
 document.body.insertAdjacentHTML('beforeend','<div class="bar"><div class="t"><small>送る書類</small><b id="barV"></b></div><button type="button" class="btn" id="toPv">プレビュー</button><button type="button" class="btn p" id="pdf3">PDF保存</button></div><div class="toast" id="toast"></div><div id="prt"></div>');
 var hd=document.querySelector('header.top');if(hd)hd.insertAdjacentHTML('beforeend','<svg class="deco" viewBox="0 0 250 150" aria-hidden="true"><g transform="rotate(-8 90 80)"><rect class="pg" x="40" y="20" width="96" height="124" rx="8"/></g><rect class="pg" x="100" y="8" width="96" height="124" rx="8"/><path class="ln" d="M116 34h44M116 52h64M116 66h64M116 80h40M116 106h28"/><circle class="acc" cx="196" cy="118" r="22"/><path d="M184 111h24v15h-24zM184 112l12 8 12-8" stroke="'+getComputedStyle(document.body).getPropertyValue('--h2')+'" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>');
}
function drawRows(){
 $('rows').innerHTML=S.rows.map(function(r,i){var uo=UNITS.every(function(u){return u[0]!==r.u}),ot=r.o||(r.n!==''&&DOCS.indexOf(r.n)<0);return '<div class="sfr" data-i="'+i+'"><span class="idx">'+(i+1)+'</span>'+
 '<div class="dn'+(ot?' o':'')+'"><select data-k="ds" aria-label="書類の種類"><option value=""'+(!ot&&!r.n?' selected':'')+' disabled>書類を選ぶ</option>'+DOCS.map(function(d){return '<option'+(!ot&&d===r.n?' selected':'')+'>'+d+'</option>'}).join('')+'<option value="x"'+(ot?' selected':'')+'>その他(入力)</option></select>'+
 (ot?'<input type="text" data-k="n" value="'+esc(r.n)+'" placeholder="書類名" aria-label="書類名" list="dlDoc" autocomplete="off">':'')+'</div>'+
 '<input type="text" class="num" inputmode="numeric" data-k="q" value="'+esc(r.q)+'" aria-label="数量">'+
 '<select data-k="u" aria-label="単位">'+UNITS.map(function(u){return '<option value="'+u[0]+'"'+(u[0]===r.u||(uo&&u[0]==='部')?' selected':'')+'>'+u[1]+'</option>'}).join('')+'</select>'+
 '<button type="button" class="ib" data-act="del" aria-label="この書類を削除"'+(S.rows.length>1?'':' style="visibility:hidden"')+'>×</button></div>'}).join('');
}

/* ---------- 送付状 ---------- */
function toHTML(a,cls){var s='';if(a.co||!a.ps)s+='<div>'+ph(a.co,'宛名')+(a.coH?'<span class="h">'+esc(a.coH)+'</span>':'')+'</div>';if(a.ps)s+='<div>'+esc(a.ps)+'<span class="h">様</span></div>';return '<div class="'+cls+'">'+s+'</div>'}
function tantoL(){var t=ME.tanto.trim();return t?(/担当/.test(t)?t:'担当：'+t):''}
function listHTML(){var rs=named();
 var b=rs.length?rs.map(function(r,i){return '<tr><td class="n">'+(i+1)+'.</td><td>'+esc(r.n)+'</td><td class="q">'+(String(r.q).trim()?esc(r.q)+esc(r.u):'')+'</td></tr>'}).join(''):'<tr><td class="n">1.</td><td><span class="ph">送る書類</span></td><td class="q"></td></tr>';
 return '<table class="sf-list"><tbody>'+b+'</tbody></table>'}
function bodyHTML(z){return '<div class="sf-body"><p>'+esc(z.p1)+'</p><p>'+(z.formal?'　':'')+esc(z.p2)+'</p></div>'+(z.close?'<p class="sf-r">'+z.close+'</p>':'')}
function docHTML(){
 var a=atena(S.to,S.hon,S.person),z=letter(greet(),S.date,a.indiv,FX(),S.body),cls='paper sf c-'+ME.color;
 var memo=S.memo.trim()?'<div class="sf-memo"><b>連絡事項</b>'+esc(S.memo.trim())+'</div>':'';
 if(!FX()){
  var me='<div class="sf-from"><div class="nm">'+ph(ME.from,'あなたの会社名・氏名')+'</div>'+(ME.addr?'<div class="ad2">'+esc(ME.addr)+'</div>':'')+
   (ME.tel?'<div>'+(/^[\d\-()（） +]+$/.test(ME.tel)?'TEL：':'')+esc(ME.tel)+'</div>':'')+(ME.fax?'<div>FAX：'+esc(ME.fax)+'</div>':'')+(tantoL()?'<div>'+esc(tantoL())+'</div>':'')+'</div>';
  return '<div class="'+cls+'"><div class="sf-date">'+jd(S.date)+'</div>'+toHTML(a,'sf-to')+me+
   '<h1 class="sf-ttl"><span>'+esc(ttl())+'</span></h1>'+(S.subj.trim()?'<p class="sf-subj">件名：'+esc(S.subj.trim())+'</p>':'')+
   bodyHTML(z)+'<p class="sf-ki">記</p>'+listHTML()+memo+'<p class="sf-ijo">以上</p></div>'}
 var pg=faxPages(S.rows,S.pages);
 return '<div class="'+cls+' fx"><div class="sf-fxt"><h1>'+esc(ttl())+'</h1><div>送信日：'+jd(S.date)+'</div></div>'+
  '<table class="sf-fx"><tr><th>宛先</th><td colspan="3" class="big">'+toHTML(a,'sf-fxto')+'</td></tr>'+
  '<tr><th>FAX番号</th><td colspan="3">'+ph(S.tofax,'相手のFAX番号')+'</td></tr>'+
  '<tr><th>発信元</th><td colspan="3"><b>'+ph(ME.from,'あなたの会社名・氏名')+'</b>'+(tantoL()?'　'+esc(tantoL()):'')+(ME.addr?'<div class="ad2">'+esc(ME.addr)+'</div>':'')+'</td></tr>'+
  '<tr><th>TEL</th><td>'+esc(ME.tel)+'</td><th>FAX</th><td>'+esc(ME.fax)+'</td></tr>'+
  '<tr><th>送信枚数</th><td colspan="3">'+(pg?pg+' 枚':'<span class="blank"></span>枚')+'(この送付状を含む)</td></tr>'+
  (S.subj.trim()?'<tr><th>件名</th><td colspan="3">'+esc(S.subj.trim())+'</td></tr>':'')+'</table>'+
  bodyHTML(z)+'<p class="sf-ki">記</p>'+listHTML()+
  '<div class="sf-memo fxm"><b>連絡事項</b>'+esc(S.memo.trim())+'</div><p class="sf-ijo">以上</p>'+
  '<p class="sf-fxn">※送信枚数が足りない場合や、読み取りにくい箇所がございましたら、お手数ですが上記の発信元までご連絡ください。</p></div>'}

/* ---------- 描画 ---------- */
function txtSum(){var a=[],z=greet();
 var gl={jikou:'拝啓・'+jikou(S.date),jika:'拝啓・時下',kinkei:'謹啓・'+jikou(S.date),none:'頭語なし'}[z];
 a.push([jd(S.date),S.date!==today()]);a.push([gl,S.greet!=='auto']);a.push([ttl(),ttl()!==TTL[S.mode][0]]);
 if(S.subj.trim())a.push(['件名あり',1]);if(S.body.trim())a.push(['本文を変更',1]);if(FX()&&S.pages.trim())a.push(['送信枚数 '+S.pages,1]);
 $('txtSum').innerHTML=a.map(function(x){return x[1]?'<span class="c">'+esc(x[0])+'</span>':esc(x[0])}).join('・')}
var raf;function upd(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
function render(){
 [].forEach.call(document.querySelectorAll('[data-show]'),function(el){el.hidden=el.dataset.show!==S.mode});
 [].forEach.call($('mode').children,function(b){var on=b.dataset.v===S.mode;b.className=on?'on':'';b.setAttribute('aria-pressed',on)});
 var tv=ttl();$('ttl').innerHTML=TTL[S.mode].map(function(t){return '<option'+(t===tv?' selected':'')+'>'+t+'</option>'}).join('');
 $('hon').disabled=!!S.person.trim();$('hon').title=S.person.trim()?'担当者名を入れたので、会社名には敬称を付けず「〇〇様」になります':'';
 txtSum();
 var m=S.memo.trim();$('memoSum').textContent=m?m.replace(/\s+/g,' ').slice(0,24)+(m.length>24?'…':''):'ご返送のお願い・返信用封筒など';$('memoSum').className='ms'+(m?' on':'');
 if(m&&!render.mo){$('memoBox').open=true}render.mo=1;
 var rs=named();$('barV').textContent=rs.length?rs[0].n+(rs.length>1?' ほか'+(rs.length-1)+'点':''):'未入力';
 $('pvChip').textContent=FX()?'FAX':'郵送';var ap=faxPages(S.rows,'');$('pages').placeholder=ap?'自動：'+ap+'枚':'書類を「枚」で入れると自動';
 $('paperHost').innerHTML=docHTML();fit();
 $('meSt').textContent=ME.from?'保存済み：'+ME.from.slice(0,14):'未入力';
 recentUI();save();
}
function fit(){var box=$('pvbox'),p=box.querySelector('.paper');if(!p)return;var W=box.parentNode.clientWidth-parseFloat(getComputedStyle(box.parentNode).paddingLeft)*2,s=Math.min(1,W/p.offsetWidth);
 // パソコン(プレビューが追従する幅)では、ボタンまで画面に収まるよう高さでも縮める
 if(innerWidth>980){var cd=box.closest('.card'),ex=cd.offsetHeight-box.offsetHeight;s=Math.max(.3,Math.min(s,(innerHeight-32-ex)/p.offsetHeight))}
 p.style.transform='scale('+s+')';box.style.width=p.offsetWidth*s+'px';box.style.height=p.offsetHeight*s+'px'}
function save(){try{var cur=J(KEY,{})||{};
 if(keep){cur.me=ME;cur.keep=true;localStorage.setItem(KEY,JSON.stringify(cur));localStorage.setItem(SKEY,JSON.stringify(S))}
 else{localStorage.setItem(KEY,JSON.stringify({keep:false}));localStorage.removeItem(SKEY);localStorage.removeItem(HKEY)}}catch(_){}}

/* ---------- 最近作った書類・作成履歴 ---------- */
function docHist(){var l=J(DHKEY,[]);return Array.isArray(l)?l:[]}
function hist(){var l=J(HKEY,[]);return Array.isArray(l)?l:[]}
function dname(x){return x.t==='o'?((x.doc&&x.doc.ottl)||'発注書'):DOCN[x.t]||'書類'}
var REC=null,recentOff=false;
function recentUI(){var x=docHist()[0],el=$('recent');REC=null;
 if(!x||recentOff||hasContent()||!x.to){el.hidden=true;return}
 REC=x;var d=x.at.split('-');$('recentT').textContent='最近作った'+dname(x)+'('+x.to+'・'+(+d[1])+'/'+(+d[2])+')を送りますか？';el.hidden=false}
function useRec(){var x=REC;if(!x)return;S.to=x.to;S.hon=x.doc&&x.doc.hon!=null?x.doc.hon:'御中';S.rows=[{n:dname(x),q:'1',u:'部'}];$('to').value=S.to;$('hon').value=S.hon;recentOff=true;drawRows();upd();toast('宛名と書類名を入れました')}
function record(){if(!keep||!hasContent())return;var it={id:Date.now(),at:today(),mode:S.mode,to:S.to,person:S.person,docs:named().map(function(r){return r.n}).join('・'),doc:JSON.parse(JSON.stringify(S))};
 var l=hist().filter(function(x){return !(x.at===it.at&&x.to===it.to&&x.person===it.person&&x.docs===it.docs&&x.mode===it.mode)});l.unshift(it);
 try{localStorage.setItem(HKEY,JSON.stringify(l.slice(0,30)))}catch(_){}histUI()}
function histUI(){var h=hist(),to={},ps={},dn={};
 docHist().concat(h).forEach(function(x){if(x.to)to[x.to]=1});h.forEach(function(x){if(x.person)ps[x.person]=1;(x.doc.rows||[]).forEach(function(r){if(r.n)dn[r.n]=1})});
 DOCS.concat(['見積書(控)','納品書(控)']).forEach(function(n){dn[n]=1});
 var o=function(m){return Object.keys(m).map(function(v){return '<option value="'+esc(v)+'">'}).join('')};
 $('dlTo').innerHTML=o(to);$('dlPs').innerHTML=o(ps);$('dlDoc').innerHTML=o(dn);
 $('histBtn').hidden=!h.length;$('histN').textContent=h.length?'('+h.length+'件)':'';$('hq').hidden=h.length<=6;drawHist()}
function drawHist(){var q=$('hq').value.trim(),h=hist().filter(function(x){return !q||(x.to+' '+(x.person||'')+' '+x.docs).indexOf(q)>=0});
 $('hlist').innerHTML=h.length?h.map(function(x){var d=x.at.split('-');
  return '<li><button type="button" class="hit" data-id="'+x.id+'"><span class="ty">'+(x.mode==='f'?'FAX':'郵送')+'</span><span class="m"><b>'+(x.to||x.person?esc(x.to||x.person):'(宛名なし)')+'</b><small>'+(+d[1])+'/'+(+d[2])+(x.docs?'・'+esc(x.docs):'')+'</small></span></button>'+
  '<button type="button" class="ib hdel" data-del="'+x.id+'" aria-label="この履歴を削除">×</button></li>'}).join(''):'<li class="none">見つかりませんでした</li>'}

/* ---------- 入力イベント ---------- */
var SF=['to','hon','person','tofax','date','subj','body','memo','pages'],MF=['from','addr','tel','fax','tanto'];
function fill(){SF.forEach(function(k){$(k).value=S[k]});$('greet').value=S.greet;$('wareki').checked=!!S.wareki}
function bind(){
 fill();
 SF.forEach(function(k){$(k).addEventListener('input',function(){S[k]=this.value;upd()})});
 MF.forEach(function(k){$(k).value=ME[k]||'';$(k).addEventListener('input',function(){ME[k]=this.value;upd()})});
 $('hon').onchange=function(){S.hon=this.value;upd()};
 $('date').onchange=function(){if(!this.value){this.value=S.date=today()}upd()};
 $('ttl').onchange=function(){if(FX())S.ttlF=this.value;else S.ttlP=this.value;upd()};
 $('greet').onchange=function(){S.greet=this.value;upd()};
 $('wareki').onchange=function(){S.wareki=this.checked;upd()};
 $('mode').onclick=function(e){var b=e.target.closest('[data-v]');if(!b||b.dataset.v===S.mode)return;S.mode=b.dataset.v;var fr=FX()?'部':'枚',tu=FX()?'枚':'部';S.rows.forEach(function(r){if(r.u===fr)r.u=tu});drawRows();upd();
  if(FX()&&!S.tofax)setTimeout(function(){$('tofax').focus()},50)};
 $('rows').addEventListener('input',function(e){var t=e.target,k=t.dataset.k,it=t.closest('.sfr');if(!k||!it||k==='u')return;
  if(k==='q')t.value=t.value.replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0)}).replace(/[^0-9]/g,'');
  S.rows[+it.dataset.i][k]=t.value;upd()});
 $('rows').addEventListener('change',function(e){var t=e.target,it=t.closest('.sfr');if(!it)return;var i=+it.dataset.i,r=S.rows[i];
  if(t.dataset.k==='u'){r.u=t.value;upd()}
  if(t.dataset.k==='ds'){if(t.value==='x'){r.o=true;r.n=''}else{r.o=false;r.n=t.value}drawRows();upd();if(r.o){var x=document.querySelector('.sfr[data-i="'+i+'"] input[data-k=n]');if(x)x.focus()}}});
 $('rows').addEventListener('click',function(e){var b=e.target.closest('[data-act=del]');if(!b)return;S.rows.splice(+b.closest('.sfr').dataset.i,1);drawRows();upd()});
 // よく送る書類：空いている行に入れる。なければ行を足す
 $('addDoc').onclick=function(){S.rows.push({n:'',q:'1',u:FX()?'枚':'部'});drawRows();upd();var ss=document.querySelectorAll('#rows select[data-k=ds]');ss[ss.length-1].focus()};
 $('memoBox').addEventListener('click',function(e){var b=e.target.closest('[data-m]');if(!b)return;var t=MEMO[+b.dataset.m][1];
  if(S.memo.indexOf(t)>=0){toast('もう入っています');return}S.memo=(S.memo.trim()?S.memo.replace(/\s+$/,'')+'\n':'')+t;$('memo').value=S.memo;upd()});
 $('recentB').onclick=useRec;
 $('keep').checked=keep;$('keep').onchange=function(){keep=this.checked;save();histUI();toast(keep?'この端末に保存します':'保存を停止し、保存内容を消しました')};
 $('meSec').open=!ME.from;
 $('sw').onclick=function(e){var c=e.target.dataset.c;if(!c)return;ME.color=c;sw();upd()};
 function sw(){[].forEach.call($('sw').children,function(b){b.className=b.dataset.c===ME.color?'on':''})}sw();
 function fresh(){var md=S.mode;S=blank();S.mode=md;save();location.reload()}
 $('reset').onclick=function(){if(confirm('宛名・書類・連絡事項を消して、新しい送付状を作りますか？\n(あなたの情報はそのまま残ります)'))fresh()};
 if($('restoreNew'))$('restoreNew').onclick=fresh;
 $('print2').onclick=doPrint;
 $('pdf2').onclick=$('pdf3').onclick=doPdf;
 var dlg=$('hdlg');
 $('histBtn').onclick=function(){$('hq').value='';drawHist();if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')};
 $('hClose').onclick=function(){if(dlg.close)dlg.close();else dlg.removeAttribute('open')};
 dlg.addEventListener('click',function(e){if(e.target===dlg)$('hClose').onclick()});
 $('hq').oninput=drawHist;
 $('hlist').onclick=function(e){var d=e.target.closest('[data-del]');if(d){try{localStorage.setItem(HKEY,JSON.stringify(hist().filter(function(x){return String(x.id)!==d.dataset.del})))}catch(_){}histUI();if(!hist().length)$('hClose').onclick();return}
  var b=e.target.closest('[data-id]');if(!b)return;var x=hist().filter(function(x){return String(x.id)===b.dataset.id})[0];if(!x)return;
  if(hasContent()&&!confirm('今入力している内容は消えます。よろしいですか？'))return;
  S=Object.assign(blank(),x.doc);S.date=today();recentOff=true;fill();drawRows();$('hClose').onclick();upd();toast((x.to||'過去の送付状')+' の内容を読み込みました')};
 $('toPv').onclick=function(){$('pv').scrollIntoView({behavior:'smooth'})};
 window.addEventListener('resize',fit);
}
// PDFを直接ダウンロードする(スマホ・コンビニ印刷用)。ライブラリは押した時だけ読み込む
function load(src){return new Promise(function(ok,ng){if(document.querySelector('script[src="'+src+'"]'))return ok();var e=document.createElement('script');e.src=src;e.onload=ok;e.onerror=ng;document.head.appendChild(e)})}
function fname(){var a=atena(S.to,S.hon,S.person);return (FX()?'FAX送付状':'送付状')+(a.co||a.ps?'_'+(a.co||a.ps):'')+'_'+S.date.replace(/-/g,'')}
var busy=false;
function doPdf(){if(busy)return;busy=true;var bs=[$('pdf2'),$('pdf3')],lb=bs.map(function(b){return b.textContent});bs.forEach(function(b){b.textContent='作成中…';b.disabled=true});
 var nm=fname(),box=document.createElement('div');
 box.className='pdfmode';box.style.cssText='position:fixed;left:-10000px;top:0;width:210mm';box.innerHTML=docHTML();document.body.appendChild(box);
 function end(){busy=false;bs.forEach(function(b,i){b.textContent=lb[i];b.disabled=false});if(box.parentNode)box.parentNode.removeChild(box)}
 Promise.all([load('/assets/vendor/html2canvas.min.js'),load('/assets/vendor/jspdf.umd.min.js')]).then(function(){return (document.fonts?document.fonts.ready:Promise.resolve())}).then(function(){
  return html2canvas(box.firstChild,{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true})}).then(function(cv){
  var pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});pdf.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297);
  pdf.setProperties({title:nm});pdf.save(nm.replace(/[\\/:*?"<>|]/g,'')+'.pdf');end();record();toast('PDFを保存しました');$('shareAsk').hidden=false;$('shareAsk').scrollIntoView({behavior:'smooth',block:'center'})}).catch(function(){end();toast('PDFを作れませんでした。「印刷」からお試しください')})}
function doPrint(){record();var html=docHTML(),nm=fname();
 var inFrame=false;try{inFrame=window.self!==window.top}catch(_){inFrame=true}
 if(!inFrame){$('prt').innerHTML=html;var tt=document.title;document.title=nm;window.print();setTimeout(function(){document.title=tt;$('prt').innerHTML=''},800);return}
 var w=window.open('','_blank');if(!w){toast('ポップアップを許可してください');return}
 var css=[].map.call(document.querySelectorAll('link[rel=stylesheet]'),function(l){return '<link rel="stylesheet" href="'+l.href+'">'}).join('');
 w.document.write('<!doctype html><meta charset="utf-8"><title>'+esc(nm)+'</title>'+css+'<body><div id="prt">'+html+'</div><script>onload=function(){setTimeout(print,200)}<\/script>');w.document.close()}

build();drawRows();bind();render();histUI();if(window.SKShare)SKShare();
if(inMsg)toast(inMsg);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
