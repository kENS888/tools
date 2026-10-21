/* しごと計算ラボ 見積書・請求書・領収書 作成(画面) */
(function(){
var $=function(id){return document.getElementById(id)};
var T={q:{n:'見積書',d:'見積日',amt:'お見積金額',lead:'下記のとおりお見積り申し上げます。',url:'/mitsumori/'},
       i:{n:'請求書',d:'請求日',amt:'ご請求金額',lead:'下記のとおりご請求申し上げます。',url:'/seikyusho/'},
       r:{n:'領収書',d:'領収日',amt:'領収金額',lead:'',url:'/ryoshusho/'}};
var PAY={cash:'現金',bank:'銀行振込',card:'クレジットカード',other:'電子マネー・その他'};
var KEY='shorui_v1';
function today(o){var t=new Date();if(o)t.setDate(t.getDate()+o);return iso(t)}
function iso(t){var p=function(n){return ('0'+n).slice(-2)};return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate())}
function eom(){var t=new Date();return iso(new Date(t.getFullYear(),t.getMonth()+2,0))}
function defNo(){return today().replace(/-/g,'')+'-01'}
function blank(){return {to:'',hon:'御中',subj:'',no:defNo(),date:today(),valid:today(30),nouki:'',due:eom(),tad:'',pay:'cash',elec:false,memo:'',incl:false,rnd:'floor',wOn:false,
 rows:[{n:'',q:'1',u:'式',p:''}].map(function(r){r.r='10';return r})}}
var S=blank(),ME={from:'',regno:'',addr:'',tel:'',bank:'',ink:'',color:'navy'},keep=true;
S.type=document.body.dataset.type||'q';
try{var sv=JSON.parse(localStorage.getItem(KEY)||'null');if(sv){if(sv.me)ME=Object.assign(ME,sv.me);if(sv.doc){var t0=S.type;S=Object.assign(blank(),sv.doc);S.type=t0}if(sv.keep===false)keep=false}}catch(_){}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function z2h(s){return String(s||'').replace(/[０-９．，－]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0)}).replace(/[−ー‐]/g,'-')}
function ival(s){s=z2h(s);var neg=/^\s*-/.test(s),v=parseInt(s.replace(/[^0-9]/g,''),10)||0;return neg?-v:v}
function fval(s){var v=parseFloat(z2h(s).replace(/[^0-9.\-]/g,''));return isFinite(v)?v:0}
function fmtI(s){s=z2h(s);var neg=/^\s*-/.test(s),d=s.replace(/[^0-9]/g,'');if(!d)return neg?'-':'';return (neg?'-':'')+(+d).toLocaleString('ja-JP')}
function yen(n){return (n<0?'−':'')+Math.abs(n).toLocaleString('ja-JP')+' 円'}
function Y(n){return (n<0?'−':'')+'¥'+Math.abs(n).toLocaleString('ja-JP')}
function jd(v){if(!v)return '';var p=v.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function ph(v,p){return v?esc(v):'<span class="ph">'+p+'</span>'}
function toast(m){var t=$('toast');t.textContent=m;t.className='toast on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},1900)}
function rowsN(){return S.rows.map(function(r){return {q:fval(r.q),p:ival(r.p),r:r.r}})}
function opt(){return {incl:S.incl,rnd:S.rnd,wOn:S.wOn}}

/* ---------- フォーム ---------- */
function F(id,lbl,ph_,o){o=o||{};return '<div'+(o.w?' class="w"':'')+(o.show?' data-show="'+o.show+'"':'')+'><label class="f" for="'+id+'"'+(o.lid?' id="'+o.lid+'"':'')+'>'+lbl+(o.em?'<em>'+o.em+'</em>':'')+'</label>'+
 (o.ta?'<textarea id="'+id+'" rows="'+(o.ta)+'" placeholder="'+ph_+'"></textarea>':'<input id="'+id+'" type="'+(o.t||'text')+'" placeholder="'+ph_+'"'+(o.a?' autocomplete="'+o.a+'"':'')+'>')+'</div>'}
function build(){
 var h='<div class="app"><div class="card fm">'+
 '<div class="types" role="tablist" aria-label="書類の種類">'+['q','i','r'].map(function(k){return '<button type="button" role="tab" data-type="'+k+'">'+T[k].n+'<small>'+({q:'仕事の前に',i:'納品したら',r:'入金されたら'})[k]+'</small></button>'}).join('')+'</div>'+
 '<p class="hint">入力した内容はそのままで、書類の種類だけを切り替えられます。</p>'+

 '<section class="sec"><div class="sh"><span class="n">1</span><h2>宛先と書類の情報</h2></div>'+
 '<label class="f" for="to">宛名</label><div class="toH"><input id="to" type="text" placeholder="株式会社〇〇"><select id="hon" aria-label="敬称"><option>御中</option><option>様</option><option value="">なし</option></select></div>'+
 '<div class="g2">'+F('subj','件名','ホームページ制作',{em:'任意',show:'q i',w:1})+F('tad','但し書き','ホームページ制作費として',{show:'r',w:1})+
 F('no','番号','20261021-01')+F('date','発行日','',{t:'date',lid:'dateL'})+
 F('valid','有効期限','',{t:'date',show:'q'})+F('nouki','納期','2026年11月末',{em:'任意',show:'q'})+
 F('due','お支払期限','',{t:'date',show:'i'})+
 '<div data-show="r"><label class="f" for="pay">お支払方法</label><select id="pay">'+Object.keys(PAY).map(function(k){return '<option value="'+k+'">'+PAY[k]+'</option>'}).join('')+'</select></div>'+
 '<div data-show="r"><label class="f" for="elec">渡し方</label><select id="elec"><option value="0">紙で渡す・郵送</option><option value="1">PDFで送る</option></select></div>'+
 '</div><div id="chip" data-show="r"></div></section>'+

 '<section class="sec"><div class="sh"><span class="n">2</span><h2>明細</h2><span class="r">値引きはマイナスの単価で</span></div>'+
 '<div id="rows"></div><button type="button" class="add" id="addRow">＋ 明細を追加</button>'+
 '<div class="opts"><div class="pill" id="incl"><button type="button" data-v="0">税抜で入力</button><button type="button" data-v="1">税込で入力</button></div>'+
 '<label>端数 <select id="rnd"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label></div>'+
 '<label class="ck"><input type="checkbox" id="wOn"><span>源泉徴収税を差し引く<span class="note">個人のフリーランスが、デザイン料・原稿料などを法人に請求する場合</span></span></label>'+
 '<div class="sum" id="sum"></div></section>'+

 '<details class="sec" id="meSec"><summary><div class="sh"><span class="n">3</span><h2>あなた(発行者)の情報</h2><span class="r" id="meSt"></span></div></summary>'+
 '<div class="g2">'+F('from','氏名・屋号・会社名','山田デザイン事務所 山田 太郎',{w:1,a:'organization'})+
 F('addr','住所','〒100-0001 東京都千代田区…',{w:1,ta:2})+F('tel','電話・メール','03-0000-0000',{em:'任意'})+F('regno','登録番号','T1234567890123',{em:'インボイス・任意'})+
 F('bank','振込先','〇〇銀行 〇〇支店 普通 1234567 ヤマダ タロウ',{w:1,show:'q i'})+'</div>'+
 '<label class="f">印影(はんこ)の画像<em>任意・背景が透明なPNGがきれいです</em></label><div class="inkan"><img id="inkImg" alt="" hidden><button type="button" class="btn s" id="inkBtn">画像を選ぶ</button><button type="button" class="btn s" id="inkDel" hidden>削除</button><input type="file" id="inkFile" accept="image/*" hidden></div>'+
 '<label class="f">書類の色</label><div class="sw" id="sw">'+[['navy','#1e3a8a','ネイビー'],['black','#222','ブラック'],['green','#0f766e','グリーン'],['red','#9f1239','えんじ']].map(function(c){return '<button type="button" data-c="'+c[0]+'" style="background:'+c[1]+'" aria-label="'+c[2]+'" title="'+c[2]+'"></button>'}).join('')+'</div>'+
 '<label class="ck"><input type="checkbox" id="keep"><span>この端末に入力内容を保存する<span class="note">保存先はこのブラウザだけで、サーバーには送信されません。共用のパソコンではオフにしてください。</span></span></label>'+
 '</details>'+

 '<section class="sec"><div class="sh"><span class="n">4</span><h2>備考</h2><span class="r">任意</span></div>'+
 '<textarea id="memo" rows="3" placeholder="お振込手数料は貴社にてご負担をお願いいたします。"></textarea></section>'+
 '<div class="acts"><button type="button" class="btn p" id="print1">印刷 / PDFで保存</button><button type="button" class="btn" id="reset">新しく作る</button></div>'+
 '<button type="button" class="next" id="next"></button>'+
 '</div>'+

 '<div class="pv" id="pv"><div class="card"><div class="pvh"><h2>プレビュー</h2><span class="note"><span class="dot"></span>入力するとすぐに反映されます</span></div>'+
 '<div class="pvwrap"><div class="pvbox" id="pvbox"><div id="paperHost"></div></div></div>'+
 '<div class="acts pvacts"><button type="button" class="btn p" id="print2">印刷 / PDFで保存</button></div>'+
 '<p class="note" style="margin:10px 0 0">PDFにするには、印刷画面の送信先で「PDFに保存」を選んでください。日付やURLが印字される場合は「ヘッダーとフッター」をオフにします。</p></div></div></div>';
 $('app').innerHTML=h;
 document.body.insertAdjacentHTML('beforeend','<div class="bar"><div class="t"><small id="barL"></small><b id="barV"></b></div><button type="button" class="btn" id="toPv">プレビュー</button><button type="button" class="btn p" id="print3">PDF保存</button></div><div class="toast" id="toast"></div><div id="prt"></div>');
}

function drawRows(){
 $('rows').innerHTML=S.rows.map(function(r,i){return '<div class="it" data-i="'+i+'"><div class="l1"><span class="idx">'+(i+1)+'</span><input type="text" data-k="n" value="'+esc(r.n)+'" placeholder="品目(例：トップページ デザイン)" aria-label="品目">'+
 '<button type="button" class="ib" data-act="up" title="上へ" aria-label="上へ"'+(i?'':' disabled style="visibility:hidden"')+'>↑</button>'+
 '<button type="button" class="ib" data-act="del" title="削除" aria-label="削除"'+(S.rows.length>1?'':' style="visibility:hidden"')+'>×</button></div>'+
 '<div class="l2"><label><span class="cap">数量</span><input type="text" class="num" inputmode="decimal" data-k="q" value="'+esc(r.q)+'"></label>'+
 '<label><span class="cap">単位</span><input type="text" data-k="u" value="'+esc(r.u)+'" placeholder="式" list="units"></label>'+
 '<label><span class="cap">単価('+(S.incl?'税込':'税抜')+')</span><input type="text" class="num" inputmode="numeric" data-k="p" value="'+esc(r.p)+'" placeholder="0"></label>'+
 '<label><span class="cap">税率</span><select data-k="r"><option value="10"'+(r.r==='10'?' selected':'')+'>10%</option><option value="8"'+(r.r==='8'?' selected':'')+'>8%</option><option value="0"'+(r.r==='0'?' selected':'')+'>対象外</option></select></label></div>'+
 '<div class="amt"><span>金額</span><b data-amt></b></div></div>'}).join('')+'<datalist id="units"><option>式<option>個<option>件<option>時間<option>日<option>人月<option>ページ<option>本<option>枚<option>回</datalist>';
}

/* ---------- 帳票 ---------- */
function docHTML(c){
 var t=S.type,cls='paper c-'+ME.color+(t==='r'?' rcp':''),n=T[t].n;
 var to='<div class="d-to"><span style="font-size:inherit;flex:1">'+ph(S.to,'宛名')+'</span><span>'+esc(S.hon)+'</span></div>';
 var meta=(S.no?'No. '+esc(S.no)+'<br>':'')+T[t].d+'：'+(jd(S.date)||'');
 var me='<div class="d-r">'+(ME.ink?'<img src="'+ME.ink+'" alt="">':'')+'<div class="nm"'+(ME.ink?' style="padding-right:18mm"':'')+'>'+ph(ME.from,'あなたの氏名・屋号')+'</div>'+
  (ME.addr?'<div class="ad2">'+esc(ME.addr)+'</div>':'')+(ME.tel?'<div>'+esc(ME.tel)+'</div>':'')+(ME.regno?'<div>登録番号：'+esc(ME.regno)+'</div>':'')+'</div>';
 var has8=false,rows=S.rows.map(function(r,i){var a=c.lines[i];if(r.r==='8')has8=true;
  return '<tr><td>'+esc(r.n)+(r.r==='8'?'<span class="m">※</span>':'')+(r.r==='0'?'<span class="m" style="color:#666">(非課税・不課税)</span>':'')+'</td><td class="c">'+(r.q!==''?esc(r.q):'')+'</td><td class="c">'+esc(r.u)+'</td><td class="r">'+(r.p!==''?ival(r.p).toLocaleString('ja-JP'):'')+'</td><td class="r">'+(r.n||r.p?a.toLocaleString('ja-JP'):'')+'</td></tr>'});
 var minR=t==='r'?3:10;while(rows.length<minR)rows.push('<tr><td></td><td></td><td></td><td></td><td></td></tr>');
 var items='<table class="d-it"><colgroup><col><col style="width:14mm"><col style="width:14mm"><col style="width:26mm"><col style="width:28mm"></colgroup><thead><tr><th>品目</th><th>数量</th><th>単位</th><th>単価'+(S.incl?'(税込)':'')+'</th><th>金額'+(S.incl?'(税込)':'')+'</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
 var bd='';['10','8'].forEach(function(k){if(c.gross[k]||c.tax[k])bd+='<tr class="sm"><td>'+k+'%対象 '+Y(c.base[k])+'</td><td>消費税 '+Y(c.tax[k])+'</td></tr>'});
 if(c.gross['0'])bd+='<tr class="sm"><td>対象外</td><td>'+Y(c.base['0'])+'</td></tr>';
 var memo=S.memo?'<div class="d-memo"><b>備考</b>'+esc(S.memo)+'</div>':'';
 if(t!=='r'){
  var sum='<table class="d-sum"><tr><td>小計(税抜)</td><td>'+Y(c.sub)+'</td></tr><tr><td>消費税</td><td>'+Y(c.ct)+'</td></tr>'+
   (c.w?'<tr><td>合計(税込)</td><td>'+Y(c.total)+'</td></tr><tr><td>源泉徴収税</td><td>−'+Y(c.w)+'</td></tr><tr class="t"><td>差引金額</td><td>'+Y(c.pay)+'</td></tr>':'<tr class="t"><td>合計(税込)</td><td>'+Y(c.total)+'</td></tr>')+bd+'</table>';
  var kv='';if(t==='q'){kv+='<tr><th>有効期限</th><td>'+jd(S.valid)+'</td></tr>';if(S.nouki)kv+='<tr><th>納期</th><td>'+esc(S.nouki)+'</td></tr>'}
  if(t==='i'){kv+='<tr><th>お支払期限</th><td>'+jd(S.due)+'</td></tr><tr><th>お振込先</th><td>'+ph(ME.bank,'振込先')+'</td></tr>'}
  return '<div class="'+cls+'"><div class="d-top"><h1 class="d-ttl">'+n+'</h1><div class="d-meta">'+meta+'</div></div>'+
   '<div class="d-hd"><div class="d-l">'+to+(S.subj?'<p class="d-subj">件名：'+esc(S.subj)+'</p>':'')+'<p class="d-lead">'+T[t].lead+'</p>'+
   '<div class="d-amt"><span>'+T[t].amt+'</span><b>'+Y(c.pay)+'-</b><small>(税込)</small></div><table class="d-kv">'+kv+'</table></div>'+me+'</div>'+
   items+'<div class="d-sumw"><div class="lf">'+(has8?'※は軽減税率(8%)対象':'')+'</div>'+sum+'</div>'+memo+'</div>';
 }
 var st=stamp(c,{pay:S.pay,elec:S.elec});
 var bk='<table class="rc-bk"><tr><th colspan="2">内訳</th></tr>';
 ['10','8'].forEach(function(k){if(c.gross[k]||c.tax[k])bk+='<tr><td>'+k+'%対象(税抜)</td><td>'+Y(c.base[k])+'</td></tr><tr><td>消費税('+k+'%)</td><td>'+Y(c.tax[k])+'</td></tr>'});
 if(c.gross['0'])bk+='<tr><td>対象外</td><td>'+Y(c.base['0'])+'</td></tr>';
 if(c.w)bk+='<tr><td>合計(税込)</td><td>'+Y(c.total)+'</td></tr><tr><td>源泉徴収税</td><td>−'+Y(c.w)+'</td></tr>';
 bk+='</table>';
 return '<div class="'+cls+'"><div class="d-top"><h1 class="d-ttl">'+n+'</h1></div><div class="d-meta">'+meta+'</div>'+to+
  '<div class="rc-amt"><span>金額</span><b>'+Y(c.pay)+'-</b><small>(税込)</small></div>'+
  '<div class="rc-tad">但し <span class="u">'+ph(S.tad,'〇〇代として')+'</span><br>上記正に領収いたしました。</div>'+
  '<div class="rc-low"><div><div class="rc-left">'+(st.duty&&!S.elec?'<div class="rc-stamp"><b>収入印紙</b>'+st.duty.toLocaleString('ja-JP')+'円</div>':'')+bk+'</div>'+
  '<div class="rc-pm">お支払方法：'+PAY[S.pay]+'</div></div>'+me+'</div>'+
  (S.rows.length>1||S.rows[0].n?items+(has8?'<div class="d-sumw"><div class="lf">※は軽減税率(8%)対象</div></div>':''):'')+memo+'</div>';
}

/* ---------- 描画 ---------- */
var last;
function render(){
 var c=calc(rowsN(),opt());last=c;
 // 明細の金額
 [].forEach.call(document.querySelectorAll('#rows .it'),function(el,i){el.querySelector('[data-amt]').textContent=yen(c.lines[i]||0)});
 // 合計
 var h='<div><span>小計(税抜)</span><span>'+yen(c.sub)+'</span></div>';
 ['10','8'].forEach(function(k){if(c.tax[k]||c.gross[k])h+='<div><span>消費税('+k+'%)</span><span>'+yen(c.tax[k])+'</span></div>'});
 if(c.w)h+='<div><span>合計(税込)</span><span>'+yen(c.total)+'</span></div><div class="neg"><span>源泉徴収税</span><span>−'+yen(c.w)+'</span></div>';
 h+='<div class="big"><span>'+T[S.type].amt+'</span><b>'+yen(c.pay)+'</b></div>';
 $('sum').innerHTML=h;$('barL').textContent=T[S.type].amt;$('barV').textContent=yen(c.pay);
 // 印紙
 if(S.type==='r'){var st=stamp(c,{pay:S.pay,elec:S.elec}),a='判定の金額(税抜)：'+yen(st.amt);
  var m=st.why==='need'?['warn','!','収入印紙 '+st.duty.toLocaleString('ja-JP')+'円 が必要です','紙の領収書に貼り、消印をしてください。'+a]:
   st.why==='elec'?['','✓','収入印紙は不要です','PDFなどの電子データで渡す領収書には印紙税がかかりません。']:
   st.why==='card'?['','✓','収入印紙は不要です','クレジットカード払いは、支払方法を領収書に書けば非課税です(自動で記載されます)。']:
   ['','✓','収入印紙は不要です','税抜5万円未満は非課税です。'+a];
  $('chip').innerHTML='<div class="chip '+m[0]+'"><i>'+m[1]+'</i><div><b>'+m[2]+'</b><span>'+m[3]+'</span>'+(S.pay==='other'&&st.why==='need'?'<br><span>電子マネー・QR決済は、決済の仕組みによって扱いが異なる場合があります。</span>':'')+'</div></div>';}
 $('paperHost').innerHTML=docHTML(c);fit();
 $('meSt').textContent=ME.from?'保存済み：'+ME.from.slice(0,14):'未入力';
 var nx={q:['i','この見積書の内容で請求書を作る →'],i:['r','この請求書の内容で領収書を作る →'],r:null}[S.type];
 $('next').className='next'+(nx&&c.total?' on':'');if(nx){$('next').textContent=nx[1];$('next').dataset.to=nx[0]}
 save();
}
var raf;function upd(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
function fit(){var box=$('pvbox'),p=box.querySelector('.paper');if(!p)return;var W=box.parentNode.clientWidth-parseFloat(getComputedStyle(box.parentNode).paddingLeft)*2,s=Math.min(1,W/p.offsetWidth);
 p.style.transform='scale('+s+')';box.style.width=p.offsetWidth*s+'px';box.style.height=p.offsetHeight*s+'px'}
function save(){try{if(keep)localStorage.setItem(KEY,JSON.stringify({me:ME,doc:S,keep:true}));else localStorage.setItem(KEY,JSON.stringify({keep:false}))}catch(_){}}

function setType(t){S.type=t;
 [].forEach.call(document.querySelectorAll('.types button'),function(b){var on=b.dataset.type===t;b.className=on?'on':'';b.setAttribute('aria-selected',on)});
 [].forEach.call(document.querySelectorAll('[data-show]'),function(el){el.hidden=el.dataset.show.split(' ').indexOf(t)<0});
 $('dateL').textContent=T[t].d;
 if(t==='r'&&!S.tad&&S.subj)S.tad=S.subj+'代として',$('tad').value=S.tad;
 document.title=document.title;render()}

/* ---------- 入力イベント ---------- */
function bind(){
 var SF=['to','hon','subj','no','date','valid','nouki','due','tad','memo','rnd'],MF=['from','addr','tel','regno','bank'];
 SF.forEach(function(k){$(k).value=S[k];$(k).addEventListener('input',function(){S[k]=this.value;upd()})});
 MF.forEach(function(k){$(k).value=ME[k];$(k).addEventListener('input',function(){ME[k]=this.value;upd()})});
 $('pay').value=S.pay;$('pay').onchange=function(){S.pay=this.value;upd()};
 $('elec').value=S.elec?'1':'0';$('elec').onchange=function(){S.elec=this.value==='1';upd()};
 $('wOn').checked=S.wOn;$('wOn').onchange=function(){S.wOn=this.checked;upd()};
 $('keep').checked=keep;$('keep').onchange=function(){keep=this.checked;save();toast(keep?'この端末に保存します':'保存を停止し、保存内容を消しました')};
 $('meSec').open=!ME.from;
 function pill(){[].forEach.call($('incl').children,function(b){b.className=(b.dataset.v==='1')===S.incl?'on':''})}pill();
 $('incl').onclick=function(e){var v=e.target.dataset.v;if(v==null)return;S.incl=v==='1';pill();drawRows();upd()};
 $('rows').addEventListener('input',function(e){var t=e.target,k=t.dataset.k,it=t.closest('.it');if(!k||!it)return;var r=S.rows[+it.dataset.i];
  if(k==='p'){var p=t.selectionStart,l=t.value.length;t.value=fmtI(t.value);try{var q=Math.max(0,p+t.value.length-l);t.setSelectionRange(q,q)}catch(_){}}
  if(k==='q')t.value=z2h(t.value).replace(/[^0-9.]/g,'');
  r[k]=t.value;upd()});
 $('rows').addEventListener('change',function(e){if(e.target.dataset.k==='r'){S.rows[+e.target.closest('.it').dataset.i].r=e.target.value;upd()}});
 $('rows').addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var i=+b.closest('.it').dataset.i;
  if(b.dataset.act==='del')S.rows.splice(i,1);else if(i>0){var x=S.rows[i];S.rows[i]=S.rows[i-1];S.rows[i-1]=x}drawRows();upd()});
 $('addRow').onclick=function(){var l=S.rows[S.rows.length-1];S.rows.push({n:'',q:'1',u:l?l.u:'式',p:'',r:l?l.r:'10'});drawRows();upd();
  var ins=document.querySelectorAll('#rows .it input[data-k="n"]');ins[ins.length-1].focus()};
 [].forEach.call(document.querySelectorAll('.types button'),function(b){b.onclick=function(){setType(b.dataset.type)}});
 $('next').onclick=function(){setType(this.dataset.to);window.scrollTo({top:$('app').offsetTop-8,behavior:'smooth'});toast(T[S.type].n+'に切り替えました')};
 $('sw').onclick=function(e){var c=e.target.dataset.c;if(!c)return;ME.color=c;sw();upd()};
 function sw(){[].forEach.call($('sw').children,function(b){b.className=b.dataset.c===ME.color?'on':''})}sw();
 // 印影
 function ink(){$('inkImg').hidden=!ME.ink;$('inkDel').hidden=!ME.ink;if(ME.ink)$('inkImg').src=ME.ink}ink();
 $('inkBtn').onclick=function(){$('inkFile').click()};
 $('inkDel').onclick=function(){ME.ink='';ink();upd()};
 $('inkFile').onchange=function(){var f=this.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){var im=new Image();im.onload=function(){
  var s=Math.min(1,240/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);
  cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);ME.ink=cv.toDataURL('image/png');ink();upd()};im.src=rd.result};rd.readAsDataURL(f);this.value=''};
 $('reset').onclick=function(){if(!confirm('宛先・明細・備考を消して、新しい書類を作りますか？\n(あなたの情報はそのまま残ります)'))return;var t=S.type;S=blank();S.type=t;
  ['to','hon','subj','no','date','valid','nouki','due','tad','memo','rnd'].forEach(function(k){$(k).value=S[k]});$('pay').value='cash';$('elec').value='0';$('wOn').checked=false;pill();drawRows();setType(t);toast('新しい書類にしました')};
 $('print1').onclick=$('print2').onclick=$('print3').onclick=doPrint;
 $('toPv').onclick=function(){$('pv').scrollIntoView({behavior:'smooth'})};
 window.addEventListener('resize',fit);
}
function doPrint(){var html=docHTML(last),nm=T[S.type].n+(S.no?'_'+S.no:'')+(S.to?'_'+S.to:'');
 var inFrame=false;try{inFrame=window.self!==window.top}catch(_){inFrame=true}
 if(!inFrame){$('prt').innerHTML=html;var tt=document.title;document.title=nm;window.print();setTimeout(function(){document.title=tt;$('prt').innerHTML=''},800);return}
 var w=window.open('','_blank');if(!w){toast('ポップアップを許可してください');return}
 var css=[].map.call(document.querySelectorAll('link[rel=stylesheet]'),function(l){return '<link rel="stylesheet" href="'+l.href+'">'}).join('');
 w.document.write('<!doctype html><meta charset="utf-8"><title>'+esc(nm)+'</title>'+css+'<body><div id="prt">'+html+'</div><script>onload=function(){setTimeout(print,200)}<\/script>');w.document.close()}

build();drawRows();bind();setType(S.type);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
