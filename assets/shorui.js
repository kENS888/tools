/* しごと計算ラボ 見積書・納品書・請求書・領収書・発注書 作成(画面) */
(function(){
var $=function(id){return document.getElementById(id)};
var ICON={q:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 n:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 i:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 7.5l3 4 3-4M12 11.5v6.5M9.2 13h5.6M9.2 15.6h5.6"/>',
 r:'<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 11l2 2 4-4"/>',
 o:'<path d="M9 3h6v3H9z"/><path d="M15 4.5h3a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h3"/><path d="M9 12h6M9 16h4"/>'};
function ico(k){return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ICON[k]+'</svg>'}
var T={q:{n:'見積書',s:'仕事の前に',d:'見積日',amt:'お見積金額',lead:'下記のとおりお見積り申し上げます。',url:'/mitsumori/'},
       n:{n:'納品書',s:'納品のときに',d:'納品日',amt:'合計金額',lead:'下記のとおり納品いたします。',url:'/nohinsho/'},
       i:{n:'請求書',s:'代金の請求に',d:'請求日',amt:'ご請求金額',lead:'下記のとおりご請求申し上げます。',url:'/seikyusho/'},
       r:{n:'領収書',s:'入金されたら',d:'領収日',amt:'領収金額',lead:'',url:'/ryoshusho/'},
       o:{n:'発注書',s:'仕事を頼むとき',d:'発注日',amt:'発注金額',lead:'下記のとおり発注いたします。',url:'/hacchusho/'}};
var ORDER=['q','n','i','r'];
// よく使う単位。ない場合は「その他」で自由入力
var UNITS=[['式','式'],['個','個'],['件','件'],['回','回'],['時間','時間'],['日','日'],['人月','人月'],['','なし'],['x','その他']];
var PAY={cash:'現金',bank:'銀行振込',card:'クレジットカード',other:'電子マネー・その他'};
var KEY='shorui_v1';
// 発注書は発注する側の書類なので、宛先・明細は見積書〜領収書と別に保存する(あなたの情報は共通)
var DKEY='shorui_po_v1';
// 作成履歴(PDF保存・印刷した書類)。発注書と、見積書〜領収書は別グループで表示する
var HKEY='shorui_hist_v1',LKEY='shorui_load_v1';
function grp(){return document.body.dataset.type==='o'?['o']:['q','n','i','r']}
function hist(){try{var l=JSON.parse(localStorage.getItem(HKEY)||'[]');return Array.isArray(l)?l:[]}catch(_){return []}}
function myHist(){var g=grp();return hist().filter(function(x){return g.indexOf(x.t)>=0})}
function ymd(){return today().replace(/-/g,'')}
// 同じ種類の書類の番号から採番(書類ごとに番号の付け方が違うため)。今日の日付形式の番号があれば、その最大の次
function newNo(){var h=myHist(),ty=document.body.dataset.type||'q',src=h.filter(function(x){return x.t===ty}),d=ymd(),mx=null;
 src.forEach(function(x){var m=String(x.no||'').match(/^(\d{8})-(\d+)$/);if(m&&m[1]===d&&(!mx||+m[2]>+mx.match(/-(\d+)$/)[1]))mx=x.no});
 return nextNo(mx||(src.length?src[0].no:''),d)}
function iso(t){var p=function(n){return ('0'+n).slice(-2)};return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate())}
function today(o){var t=new Date();if(o)t.setDate(t.getDate()+o);return iso(t)}
function eom(){var t=new Date();return iso(new Date(t.getFullYear(),t.getMonth()+2,0))}
function blank(){return {to:'',hon:'御中',subj:'',no:newNo(),date:today(),valid:today(30),nouki:'',jouken:'',due:eom(),tad:'',pay:'cash',elec:false,memo:'',
 ottl:'発注書',basho:'',mno:'',uke:false,
 incl:false,rnd:'floor',noTax:false,wOn:false,feeOn:false,fee:'440',wareki:false,reiss:false,rows:[{n:'',q:'1',u:'式',p:'',r:'10',xr:'',nw:false}]}}
var S=blank(),ME={from:'',regno:'',addr:'',tel:'',bank:'',tanto:'',ink:'',color:'navy'},keep=true;
var TYPE=document.body.dataset.type||'q',PO=TYPE==='o';
var restored=false,svDoc=null;
function useDoc(d){if(d){S=Object.assign(blank(),d);restored=!!(S.to||S.rows.some(function(r){return r.n||r.p}))}}
try{var sv=JSON.parse(localStorage.getItem(KEY)||'null');if(sv){if(sv.me)ME=Object.assign(ME,sv.me);svDoc=sv.doc||null;if(!PO)useDoc(sv.doc);if(sv.keep===false)keep=false}}catch(_){}
try{if(PO&&keep)useDoc(JSON.parse(localStorage.getItem(DKEY)||'null'))}catch(_){}
// 保存をオフにしている時も、書類の種類を切り替える間だけは内容を引き継ぐ(発注書は対象外)
try{var ss=JSON.parse(sessionStorage.getItem(KEY)||'null');if(ss&&!PO){S=Object.assign(blank(),ss.doc);ME=Object.assign(ME,ss.me);restored=false}}catch(_){}
function poT(){T.o.n=S.ottl==='注文書'?'注文書':'発注書';T.o.amt=T.o.n==='注文書'?'ご注文金額':'発注金額';T.o.lead=T.o.n==='注文書'?'下記のとおり注文いたします。':'下記のとおり発注いたします。'}
var fromHist=null;
try{var ld=JSON.parse(sessionStorage.getItem(LKEY)||'null');sessionStorage.removeItem(LKEY);if(ld){fromHist=ld;var ot=S.ottl;S=Object.assign(blank(),ld.doc);S.date=today();S.no=newNo();S.valid=today(30);S.due=eom();S.reiss=false;if(PO&&!ld.doc.ottl)S.ottl=ot;restored=false}}catch(_){}
if(PO)poT();

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function z2h(s){return String(s||'').replace(/[０-９．，－]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0)}).replace(/[−ー‐]/g,'-')}
function ival(s){s=z2h(s);var neg=/^\s*-/.test(s),v=parseInt(s.replace(/[^0-9]/g,''),10)||0;return neg?-v:v}
function fval(s){var v=parseFloat(z2h(s).replace(/[^0-9.\-]/g,''));return isFinite(v)?v:0}
function fmtI(s,noNeg){s=z2h(s);var neg=!noNeg&&/^\s*-/.test(s),d=s.replace(/[^0-9]/g,'');if(!d)return neg?'-':'';return (neg?'-':'')+(+d).toLocaleString('ja-JP')}
function yen(n){return (n<0?'−':'')+Math.abs(n).toLocaleString('ja-JP')+' 円'}
function Y(n){return (n<0?'−':'')+'¥'+Math.abs(n).toLocaleString('ja-JP')}
function jd(v){if(!v)return '';if(S.wareki)return wareki(v);var p=v.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function ph(v,p){return v?esc(v):'<span class="ph">'+p+'</span>'}
function RL(k){return k==='0'?'対象外':k+'%'}
function toast(m){var t=$('toast');t.textContent=m;t.className='toast on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},1900)}
function rowsN(){return S.rows.map(function(r){return {q:fval(r.q),p:ival(r.p),r:r.r,xr:r.xr,nw:!!r.nw}})}
function opt(){return {incl:S.incl,rnd:S.rnd,noTax:S.noTax,wOn:!PO&&S.wOn,fee:TYPE==='i'&&S.feeOn?ival(S.fee):0}}

/* ---------- フォーム ---------- */
function F(id,lbl,ph_,o){o=o||{};return '<div'+(o.w?' class="w"':'')+(o.show?' data-show="'+o.show+'"':'')+'><label class="f" for="'+id+'"'+(o.lid?' id="'+o.lid+'"':'')+'>'+lbl+(o.em?'<em>'+o.em+'</em>':'')+'</label>'+
 (o.ta?'<textarea id="'+id+'" rows="'+o.ta+'" placeholder="'+ph_+'"></textarea>':'<input id="'+id+'" type="'+(o.t||'text')+'" placeholder="'+ph_+'"'+(o.a?' autocomplete="'+o.a+'"':'')+'>')+'</div>'}
function CK(id,lbl,note,show){return '<label class="ck"'+(show?' data-show="'+show+'"':'')+'><input type="checkbox" id="'+id+'"><span>'+lbl+(note?'<span class="note">'+note+'</span>':'')+'</span></label>'}
function build(){
 var h='<div class="app"><div class="card fm">'+
 (PO?'<div class="pill ttl" id="ottl" role="group" aria-label="書類の名前"><button type="button" data-v="発注書">'+ico('o')+'発注書</button><button type="button" data-v="注文書">'+ico('o')+'注文書</button></div>':
 '<nav class="types" aria-label="書類の種類">'+ORDER.map(function(k){return '<a href="'+T[k].url+'" data-type="'+k+'"'+(k===TYPE?' class="on" aria-current="page"':'')+'>'+ico(k)+T[k].n+'<small>'+T[k].s+'</small></a>'}).join('')+'</nav>')+
 (restored?'<div class="restore" id="restore"><span>前回の入力内容を表示しています</span><button type="button" id="restoreNew">新しく作る</button></div>':'')+
 '<p class="hint">'+(PO?'発注書と注文書は名前が違うだけで、書く内容は同じです。取引先で使われている呼び方を選んでください。':'入力した内容はそのままで、書類の種類だけを切り替えられます。')+'</p>'+
 '<button type="button" class="hbtn" id="histBtn" aria-haspopup="dialog" hidden><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>過去の書類から作る<span id="histN"></span></button>'+

 '<section class="sec"><div class="sh"><span class="n">1</span><h2>宛先と書類の情報</h2></div>'+
 '<label class="f" for="to">'+(PO?'宛名(仕事を頼む相手)':'宛名')+'</label><div class="toH"><input id="to" type="text" placeholder="株式会社〇〇" list="dlTo" autocomplete="off"><select id="hon" aria-label="敬称"><option>御中</option><option>様</option><option value="">なし</option></select></div>'+
 '<div class="g2">'+F('subj','件名','ホームページ制作',{em:'任意',show:'q n i o',w:1})+F('tad','但し書き','ホームページ制作費として',{show:'r',w:1})+
 F('no','番号','20261021-01')+F('date','発行日','',{t:'date',lid:'dateL'})+
 F('valid','有効期限','',{t:'date',show:'q'})+F('nouki','納期','2026年11月末',{em:PO?'':'任意',show:'q o'})+
 F('basho','納品場所','貴社指定の場所／メールで納品',{em:'任意',show:'o'})+
 F('jouken',PO?'支払期日・支払条件':'支払条件','月末締め翌月末払い',{em:PO?'':'任意',show:'q o',w:1})+
 F('mno','見積書の番号','Q-20261015',{em:'任意',show:'o'})+
 F('due','お支払期限','',{t:'date',show:'i'})+
 '<div data-show="r"><label class="f" for="pay">お支払方法</label><select id="pay">'+Object.keys(PAY).map(function(k){return '<option value="'+k+'">'+PAY[k]+'</option>'}).join('')+'</select></div>'+
 '<div data-show="r o"><label class="f" for="elec">渡し方</label><select id="elec"><option value="0">紙で渡す・郵送</option><option value="1">PDFで送る</option></select></div>'+
 '</div>'+CK('uke','「注文請書をご提出ください」と書く','相手に注文請書(引き受けたことを示す書類)を出してもらう場合','o')+'<div id="chip" data-show="r o"></div></section>'+

 '<section class="sec"><div class="sh"><span class="n">2</span><h2>明細</h2><span class="r">値引きはマイナスの単価で</span></div>'+
 '<div id="rows"></div><button type="button" class="add" id="addRow">＋ 明細を追加</button>'+
 '<details class="more" id="optBox"><summary>オプション<span class="ms" id="optSum"></span></summary>'+
 '<div class="opts"><div class="pill" id="incl"><button type="button" data-v="0">税抜で入力</button><button type="button" data-v="1">税込で入力</button></div>'+
 '<label>端数 <select id="rnd"><option value="floor">切り捨て</option><option value="round">四捨五入</option><option value="ceil">切り上げ</option></select></label></div>'+
 '<div class="optl">'+
  CK('wOn','源泉徴収税を差し引く','個人が法人から、デザイン料・原稿料・講演料などを受け取る場合。交通費など対象外の明細は、明細ごとに外せます','q n i r')+
  CK('noTax','消費税を加算しない',PO?'相手が消費税を請求しない場合(免税事業者の見積りが税込総額のみ、など)':'免税事業者で、消費税を請求しない場合')+
  CK('feeOn','振込手数料を差し引く(当方負担)','','i')+'<div class="subin" data-show="i" id="feeBox"><input id="fee" class="num" type="text" inputmode="numeric" aria-label="振込手数料(円)"><span class="note">円</span></div>'+
  CK('wareki','日付を和暦(令和)で表示する')+
  CK('reiss','「再発行」と表示する','紛失などで領収書を発行し直す場合','r')+
 '</div></details>'+
 '<div class="sum" id="sum"></div></section>'+

 '<details class="sec" id="meSec"><summary><div class="sh"><span class="n">3</span><h2>あなた(発行者)の情報</h2><span class="r" id="meSt"></span></div></summary>'+
 '<div class="g2">'+F('from','氏名・屋号・会社名','山田デザイン事務所 山田 太郎',{w:1,a:'organization'})+
 F('addr','住所','〒100-0001 東京都千代田区…',{w:1,ta:2})+F('tel','電話・メール','03-0000-0000',{em:'任意'})+F('regno','登録番号','T1234567890123',{em:'インボイス・任意',show:'q n i r'})+
 F('tanto','ご担当者','発注担当：佐藤',{em:'任意',show:'o'})+
 F('bank','振込先','〇〇銀行 〇〇支店 普通 1234567 ヤマダ タロウ',{w:1,show:'q i'})+'</div>'+
 '<label class="f">印影(はんこ)の画像<em>任意・白い紙に押して撮った写真でもOK(背景は自動で透明になります)</em></label><div class="inkan"><img id="inkImg" alt="" hidden><button type="button" class="btn s" id="inkBtn">画像を選ぶ</button><button type="button" class="btn s" id="inkDel" hidden>削除</button><input type="file" id="inkFile" accept="image/*" hidden></div>'+
 '<label class="f">書類の色</label><div class="sw" id="sw">'+[['navy','#1e3a8a','ネイビー'],['black','#222','ブラック'],['green','#0f766e','グリーン'],['red','#9f1239','えんじ']].map(function(c){return '<button type="button" data-c="'+c[0]+'" style="background:'+c[1]+'" aria-label="'+c[2]+'" title="'+c[2]+'"></button>'}).join('')+'</div>'+
 '<label class="ck"><input type="checkbox" id="keep"><span>この端末に入力内容を保存する<span class="note">保存先はこのブラウザだけで、サーバーには送信されません。共用のパソコンではオフにしてください。</span></span></label>'+
 '</details>'+

 '<section class="sec"><div class="sh"><span class="n">4</span><h2>備考</h2><span class="r">任意</span></div>'+
 '<textarea id="memo" aria-label="備考" rows="3" placeholder="'+(PO?'納品物の形式：PDF・AIデータ一式／検収：納品後7日以内':'お振込手数料は貴社にてご負担をお願いいたします。')+'"></textarea></section>'+
 ''+
 '<a class="next" id="next"></a>'+
 '<div class="share" id="shareAsk" hidden><b>PDFができました</b><span>便利だと思ったら、お仕事仲間にシェアしていただけるとうれしいです。</span><div class="sbtns" data-share></div></div>'+
 '<a class="next" id="toSf" href="/sofujo/">郵送・FAXで送るなら、送付状も作る →</a>'+
 '</div>'+

 '<div class="pv" id="pv"><div class="card"><div class="pvh"><h2>プレビュー <span class="pv-chip">'+T[TYPE].n+'</span></h2><span class="note"><span class="dot"></span>入力するとすぐに反映されます</span></div>'+
 '<div class="pvwrap"><div class="pvbox" id="pvbox"><div id="paperHost"></div></div></div>'+
 '<div class="acts pvacts"><button type="button" class="btn p" id="pdf2">PDFをダウンロード</button><button type="button" class="btn" id="print2">印刷</button><button type="button" class="btn" id="reset">新しく作る</button></div>'+
 '<p class="note" style="margin:10px 0 0">スマホでもPDFをそのまま保存できます。コンビニで印刷する場合は、保存したPDFをセブン‐イレブンの「netprint」や、ファミリーマート・ローソンなどの「ネットワークプリント」のアプリに登録してください。</p></div></div></div>';
 h+='<datalist id="dlTo"></datalist><datalist id="dlIt"></datalist>'+
 '<dialog class="hdlg" id="hdlg" aria-labelledby="hdlgT"><div class="hh"><b id="hdlgT">過去の書類から作る</b><button type="button" class="ib" id="hClose" aria-label="閉じる">×</button></div>'+
 '<p class="note">選ぶと内容が入ります。日付と番号は新しくなります。</p><input type="search" id="hq" placeholder="宛名・件名で検索" aria-label="宛名・件名で検索" hidden><ul class="hl" id="hlist"></ul>'+
 '<p class="note">PDF保存・印刷した書類を、このブラウザに最新30件まで記録しています(サーバーには送信されません)。</p></dialog>';
 $('app').innerHTML=h;
 document.body.insertAdjacentHTML('beforeend','<div class="bar"><div class="t"><small id="barL"></small><b id="barV"></b></div><button type="button" class="btn" id="toPv">プレビュー</button><button type="button" class="btn p" id="pdf3">PDF保存</button></div><div class="toast" id="toast"></div><div id="prt"></div>');
 var hd=document.querySelector('header.top');if(hd)hd.insertAdjacentHTML('beforeend','<svg class="deco" viewBox="0 0 250 150" aria-hidden="true"><g transform="rotate(-8 90 80)"><rect class="pg" x="40" y="20" width="96" height="124" rx="8"/></g><rect class="pg" x="100" y="8" width="96" height="124" rx="8"/><path class="ln" d="M116 34h44M116 52h64M116 66h64M116 80h40M116 106h28"/><circle class="acc" cx="196" cy="118" r="22"/><path d="M186 104l10 13 10-13M196 117v16M188 119.5h16M188 126h16" stroke="'+getComputedStyle(document.body).getPropertyValue('--h2')+'" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>');
}

function drawRows(){
 $('rows').innerHTML=S.rows.map(function(r,i){var uo=r.uo||UNITS.every(function(u){return u[0]!==r.u});return '<div class="it" data-i="'+i+'"><div class="l1"><span class="idx">'+(i+1)+'</span><input type="text" data-k="n" value="'+esc(r.n)+'" placeholder="品目(例：トップページ デザイン)" aria-label="品目" list="dlIt" autocomplete="off">'+
 '<button type="button" class="ib" data-act="up" title="上へ" aria-label="上へ"'+(i?'':' disabled style="visibility:hidden"')+'>↑</button>'+
 '<button type="button" class="ib" data-act="del" title="削除" aria-label="削除"'+(S.rows.length>1?'':' style="visibility:hidden"')+'>×</button></div>'+
 '<div class="l2"><label><span class="cap">数量</span><input type="text" class="num" inputmode="decimal" data-k="q" value="'+esc(r.q)+'"></label>'+
 '<label><span class="cap">単位</span><select data-k="us">'+UNITS.map(function(u){var on=uo?u[0]==='x':u[0]===r.u;return '<option value="'+u[0]+'"'+(on?' selected':'')+'>'+u[1]+'</option>'}).join('')+'</select>'+
 (uo?'<input type="text" data-k="u" value="'+esc(r.u)+'" placeholder="例：kg" aria-label="単位を入力" class="uin">':'')+'</label>'+
 '<label><span class="cap">単価('+(S.incl?'税込':'税抜')+')</span><input type="text" class="num" inputmode="numeric" data-k="p" value="'+esc(r.p)+'" placeholder="0"></label>'+
 '<label><span class="cap">税率</span><span class="tx"><select data-k="r">'+[['10','10%'],['8','8%'],['0','対象外'],['x','その他']].map(function(o){return '<option value="'+o[0]+'"'+(r.r===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'+
 (r.r==='x'?'<input type="text" class="num" inputmode="decimal" data-k="xr" value="'+esc(r.xr)+'" placeholder="%" aria-label="税率(%)">':'')+'</span></label></div>'+
 '<div class="amt"><label class="wck"><input type="checkbox" data-k="w"'+(r.nw?'':' checked')+'>源泉徴収の対象</label><span style="margin-left:auto;margin-right:8px">金額</span><b data-amt></b></div></div>'}).join('')+'';
}

/* ---------- 帳票 ---------- */
function docHTML(c){
 var t=TYPE,cls='paper c-'+ME.color+(t==='r'?' rcp':''),n=T[t].n,inc=S.noTax?'':'<small>(税込)</small>';
 var to='<div class="d-to"><span style="font-size:inherit;flex:1">'+ph(S.to,'宛名')+'</span><span>'+esc(S.hon)+'</span></div>';
 var meta=(S.no?'No. '+esc(S.no)+'<br>':'')+T[t].d+'：'+jd(S.date);
 var me='<div class="d-r">'+(ME.ink?'<img src="'+ME.ink+'" alt="">':'')+'<div class="nm"'+(ME.ink?' style="padding-right:18mm"':'')+'>'+ph(ME.from,'あなたの氏名・屋号')+'</div>'+
  (ME.addr?'<div class="ad2">'+esc(ME.addr)+'</div>':'')+(ME.tel?'<div>'+esc(ME.tel)+'</div>':'')+(PO?(ME.tanto?'<div>'+esc(ME.tanto)+'</div>':''):(ME.regno?'<div>登録番号：'+esc(ME.regno)+'</div>':''))+'</div>';
 var has8=false,rows=S.rows.map(function(r,i){var a=c.lines[i],k=rkey(r);if(k==='8')has8=true;
  var mk=k==='8'?'<span class="m">※</span>':k==='0'?'<span class="m" style="color:#666">(対象外)</span>':k!=='10'?'<span class="m" style="color:#666">('+k+'%)</span>':'';
  return '<tr><td>'+esc(r.n)+mk+'</td><td class="c">'+(r.q!==''?esc(r.q):'')+'</td><td class="c">'+esc(r.u)+'</td><td class="r">'+(r.p!==''?ival(r.p).toLocaleString('ja-JP'):'')+'</td><td class="r">'+(r.n||r.p?a.toLocaleString('ja-JP'):'')+'</td></tr>'});
 var minR=t==='r'?3:10;while(rows.length<minR)rows.push('<tr><td></td><td></td><td></td><td></td><td></td></tr>');
 var items='<table class="d-it"><colgroup><col><col style="width:14mm"><col style="width:14mm"><col style="width:26mm"><col style="width:28mm"></colgroup><thead><tr><th>品目</th><th>数量</th><th>単位</th><th>単価'+(S.incl?'(税込)':'')+'</th><th>金額'+(S.incl?'(税込)':'')+'</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
 var bd='';if(!S.noTax)c.keys.forEach(function(k){bd+='<tr class="sm"><td>'+RL(k)+(k!=='0'?'対象 ':' ')+Y(c.base[k])+'</td><td>'+(k!=='0'?'消費税 '+Y(c.tax[k]):'')+'</td></tr>'});
 var memo=S.memo?'<div class="d-memo"><b>備考</b>'+esc(S.memo)+'</div>':'';
 var deduct=(c.w?'<tr><td>源泉徴収税</td><td>−'+Y(c.w)+'</td></tr>':'')+(c.fee?'<tr><td>振込手数料(当方負担)</td><td>−'+Y(c.fee)+'</td></tr>':'');
 if(t!=='r'){
  var tl=S.noTax?'合計':'合計(税込)';
  var sum='<table class="d-sum"><tr><td>小計'+(S.noTax?'':'(税抜)')+'</td><td>'+Y(c.sub)+'</td></tr>'+(S.noTax?'':'<tr><td>消費税</td><td>'+Y(c.ct)+'</td></tr>')+
   (deduct?'<tr><td>'+tl+'</td><td>'+Y(c.total)+'</td></tr>'+deduct+'<tr class="t"><td>差引金額</td><td>'+Y(c.pay)+'</td></tr>':'<tr class="t"><td>'+tl+'</td><td>'+Y(c.total)+'</td></tr>')+bd+'</table>';
  var kv='';if(t==='q'){kv+='<tr><th>有効期限</th><td>'+jd(S.valid)+'</td></tr>';if(S.nouki)kv+='<tr><th>納期</th><td>'+esc(S.nouki)+'</td></tr>';if(S.jouken)kv+='<tr><th>支払条件</th><td>'+esc(S.jouken)+'</td></tr>'}
  if(t==='i'){kv+='<tr><th>お支払期限</th><td>'+jd(S.due)+'</td></tr><tr><th>お振込先</th><td>'+ph(ME.bank,'振込先')+'</td></tr>'}
  if(t==='o'){kv+='<tr><th>納期</th><td>'+ph(S.nouki,'納期')+'</td></tr>'+(S.basho?'<tr><th>納品場所</th><td>'+esc(S.basho)+'</td></tr>':'')+
   '<tr><th>お支払</th><td>'+ph(S.jouken,'支払期日・支払条件')+'</td></tr>'+(S.mno?'<tr><th>見積書番号</th><td>'+esc(S.mno)+'</td></tr>':'')}
  return '<div class="'+cls+'"><div class="d-top"><h1 class="d-ttl">'+n+'</h1><div class="d-meta">'+meta+'</div></div>'+
   '<div class="d-hd"><div class="d-l">'+to+(S.subj?'<p class="d-subj">件名：'+esc(S.subj)+'</p>':'')+'<p class="d-lead">'+T[t].lead+'</p>'+
   '<div class="d-amt"><span>'+T[t].amt+'</span><b>'+Y(c.pay)+'-</b>'+inc+'</div><table class="d-kv">'+kv+'</table></div>'+me+'</div>'+
   items+'<div class="d-sumw"><div class="lf">'+(has8?'※は軽減税率(8%)対象':'')+'</div>'+sum+'</div>'+memo+
   (t==='o'&&S.uke?'<p class="d-uke">本書の内容でお引き受けいただける場合は、注文請書をご提出ください。</p>':'')+'</div>';
 }
 var st=stamp(c,{pay:S.pay,elec:S.elec});
 var bk='<table class="rc-bk"><tr><th colspan="2">内訳</th></tr>';
 c.keys.forEach(function(k){bk+='<tr><td>'+(k==='0'?'対象外':k+'%対象'+(S.noTax?'':'(税抜)'))+'</td><td>'+Y(c.base[k])+'</td></tr>'+(k!=='0'&&!S.noTax?'<tr><td>消費税('+k+'%)</td><td>'+Y(c.tax[k])+'</td></tr>':'')});
 if(deduct)bk+='<tr><td>'+(S.noTax?'合計':'合計(税込)')+'</td><td>'+Y(c.total)+'</td></tr>'+deduct;
 bk+='</table>';
 return '<div class="'+cls+'"><div class="d-top"><h1 class="d-ttl">'+n+'</h1></div><div class="d-meta">'+meta+'</div>'+(S.reiss?'<div class="reiss">再発行</div>':'')+to+
  '<div class="rc-amt"><span>金額</span><b>'+Y(c.pay)+'-</b>'+inc+'</div>'+
  '<div class="rc-tad">但し <span class="u">'+ph(S.tad,'〇〇代として')+'</span><br>上記正に領収いたしました。</div>'+
  '<div class="rc-low"><div><div class="rc-left">'+(st.duty&&!S.elec?'<div class="rc-stamp"><b>収入印紙</b>'+st.duty.toLocaleString('ja-JP')+'円</div>':'')+bk+'</div>'+
  '<div class="rc-pm">お支払方法：'+PAY[S.pay]+'</div></div>'+me+'</div>'+
  (S.rows.length>1||S.rows[0].n?items+(has8?'<div class="d-sumw"><div class="lf">※は軽減税率(8%)対象</div></div>':''):'')+memo+'</div>';
}

/* ---------- 描画 ---------- */
function optSum(){var a=[];if(!PO&&S.wOn&&TYPE!=='o')a.push('源泉徴収');if(S.noTax)a.push('消費税なし');if(TYPE==='i'&&S.feeOn)a.push('振込手数料');if(S.incl)a.push('税込入力');if(S.rnd&&S.rnd!=='floor')a.push(S.rnd==='round'?'四捨五入':'切り上げ');if(S.wareki)a.push('和暦');if(TYPE==='r'&&S.reiss)a.push('再発行');
 var el=$('optSum');if(!el)return;el.textContent=a.length?a.join('・'):(TYPE==='o'?'税込入力・端数・和暦など':TYPE==='i'?'源泉徴収・振込手数料・税込入力など':'源泉徴収・税込入力・和暦など');el.className='ms'+(a.length?' on':'');
 if(a.length&&!optSum.done){$('optBox').open=true}optSum.done=1}
var last;
function render(){
 var c=calc(rowsN(),opt());last=c;
 optSum();
 [].forEach.call(document.querySelectorAll('#rows .it'),function(el,i){el.querySelector('[data-amt]').textContent=yen(c.lines[i]||0)});
 document.querySelector('.app').classList.toggle('won',!PO&&S.wOn);
 var h='<div><span>小計'+(S.noTax?'':'(税抜)')+'</span><span>'+yen(c.sub)+'</span></div>';
 if(!S.noTax)c.keys.forEach(function(k){if(k!=='0')h+='<div><span>消費税('+k+'%)</span><span>'+yen(c.tax[k])+'</span></div>'});
 if(c.w||c.fee)h+='<div><span>合計'+(S.noTax?'':'(税込)')+'</span><span>'+yen(c.total)+'</span></div>';
 if(c.w)h+='<div class="neg"><span>源泉徴収税'+(c.wb!==c.sub?'(対象 '+yen(c.wb)+')':'')+'</span><span>−'+yen(c.w)+'</span></div>';
 if(c.fee)h+='<div class="neg"><span>振込手数料</span><span>−'+yen(c.fee)+'</span></div>';
 h+='<div class="big"><span>'+T[TYPE].amt+'</span><b>'+yen(c.pay)+'</b></div>';
 $('sum').innerHTML=h;$('barL').textContent=T[TYPE].amt;$('barV').textContent=yen(c.pay);
 if(TYPE==='r'){var st=stamp(c,{pay:S.pay,elec:S.elec}),a='判定の金額(税抜)：'+yen(st.amt);
  var m=st.why==='need'?['warn','!','収入印紙 '+st.duty.toLocaleString('ja-JP')+'円 が必要です','紙の領収書に貼り、消印をしてください。'+a]:
   st.why==='elec'?['','✓','収入印紙は不要です','PDFなどの電子データで渡す領収書には印紙税がかかりません。']:
   st.why==='card'?['','✓','収入印紙は不要です','クレジットカード払いは、支払方法を領収書に書けば非課税です(自動で記載されます)。']:
   ['','✓','収入印紙は不要です','税抜5万円未満は非課税です。'+a];
  $('chip').innerHTML='<div class="chip '+m[0]+'"><i>'+m[1]+'</i><div><b>'+m[2]+'</b><span>'+m[3]+'</span>'+(S.pay==='other'&&st.why==='need'?'<br><span>電子マネー・QR決済は、決済の仕組みによって扱いが異なる場合があります。</span>':'')+'</div></div>';}
 if(PO){var po=poStamp({elec:S.elec,mno:S.mno,uke:S.uke}),pm=po==='elec'?['','✓','収入印紙は不要です','PDFなどの電子データで送る発注書には印紙税がかかりません。']:
   po==='uke'?['','✓','この発注書には収入印紙は通常不要です','注文請書を出してもらう旨を書いているため、契約書には当たらないとされています。なお、制作・工事・修理などの請負で、相手が紙の注文請書を出す場合は、注文請書の側に収入印紙が必要です(1万円未満は不要)。']:
   po==='risk'?['warn','!','請負の注文で紙で渡す場合は、収入印紙が必要になることがあります','見積書の番号を書いた注文書は契約書として扱われ、制作・工事・修理などの請負なら金額に応じた印紙が必要です(1万円未満は不要)。商品の仕入れ(売買)なら通常は不要です。「注文請書をご提出ください」と書くか、PDFで送れば不要です。']:
   ['','✓','収入印紙は通常不要です','申し込むだけの発注書・注文書は、原則として印紙税の対象外です。ただし、取引基本契約で「注文書だけで契約が成立する」と決めている場合は、契約書として扱われることがあります。'];
  $('chip').innerHTML='<div class="chip '+pm[0]+'"><i>'+pm[1]+'</i><div><b>'+pm[2]+'</b><span>'+pm[3]+'</span></div></div>'}
 $('feeBox').hidden=TYPE!=='i'||!S.feeOn;
 $('paperHost').innerHTML=docHTML(c);fit();
 $('meSt').textContent=ME.from?'保存済み：'+ME.from.slice(0,14):'未入力';
 if(PO){[].forEach.call($('ottl').children,function(b){var on=b.dataset.v===T.o.n;b.className=on?'on':'';b.setAttribute('aria-pressed',on)});var pc=document.querySelector('.pv-chip');if(pc)pc.textContent=T.o.n}
 var nx={q:'i',n:'i',i:'r'}[TYPE];
 $('next').className='next'+(nx&&c.total?' on':'');if(nx){$('next').textContent='この内容で'+T[nx].n+'を作る →';$('next').href=T[nx].url}
 save();
}
var raf;function upd(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
function fit(){var box=$('pvbox'),p=box.querySelector('.paper');if(!p)return;var W=box.parentNode.clientWidth-parseFloat(getComputedStyle(box.parentNode).paddingLeft)*2,s=Math.min(1,W/p.offsetWidth);
 // パソコン(プレビューが追従する幅)では、ボタンまで画面に収まるよう高さでも縮める
 if(innerWidth>980){var cd=box.closest('.card'),ex=cd.offsetHeight-box.offsetHeight;s=Math.max(.3,Math.min(s,(innerHeight-32-ex)/p.offsetHeight))}
 p.style.transform='scale('+s+')';box.style.width=p.offsetWidth*s+'px';box.style.height=p.offsetHeight*s+'px'}
function save(){if(tourOn)return;try{if(keep){if(PO){try{var cur=JSON.parse(localStorage.getItem(KEY)||'null');if(cur&&cur.doc)svDoc=cur.doc}catch(_){}}
  localStorage.setItem(KEY,JSON.stringify({me:ME,doc:PO?svDoc:S,keep:true}));if(PO)localStorage.setItem(DKEY,JSON.stringify(S))}
 else{localStorage.setItem(KEY,JSON.stringify({keep:false}));localStorage.removeItem(DKEY);localStorage.removeItem(HKEY)}}catch(_){}}
/* ---------- 作成履歴 ---------- */
var ITEMS=Object.create(null);
function hasContent(){return !!(S.to||S.rows.some(function(r){return r.n||r.p}))}
function record(){if(tourOn||!keep||!last||!hasContent())return;var it={id:Date.now(),t:TYPE,at:today(),no:S.no,to:S.to,subj:S.subj,total:last.pay,doc:JSON.parse(JSON.stringify(S))};
 try{localStorage.setItem(HKEY,JSON.stringify(histAdd(hist(),it,30)))}catch(_){}histUI()}
function histUI(){var h=myHist(),seen={},to=[];ITEMS=Object.create(null);
 h.forEach(function(x){if(x.to&&!seen[x.to]){seen[x.to]=1;to.push(x.to)}(x.doc.rows||[]).forEach(function(r){if(r.n&&!ITEMS[r.n])ITEMS[r.n]={u:r.u,uo:r.uo,p:r.p,r:r.r,xr:r.xr}})});
 $('dlTo').innerHTML=to.map(function(v){return '<option value="'+esc(v)+'">'}).join('');
 $('dlIt').innerHTML=Object.keys(ITEMS).map(function(v){return '<option value="'+esc(v)+'">'}).join('');
 $('histBtn').hidden=!h.length;$('histN').textContent=h.length?'('+h.length+'件)':'';$('hq').hidden=h.length<=6;drawHist()}
function drawHist(){var q=$('hq').value.trim(),h=myHist().filter(function(x){return !q||(x.to+' '+(x.subj||'')).indexOf(q)>=0});
 $('hlist').innerHTML=h.length?h.map(function(x){var nm=x.t==='o'?(x.doc.ottl||'発注書'):T[x.t].n,d=x.at.split('-');
  return '<li><button type="button" class="hit" data-id="'+x.id+'"><span class="ty t-'+x.t+'">'+esc(nm)+'</span><span class="m"><b>'+(x.to?esc(x.to):'(宛名なし)')+'</b><small>'+(+d[1])+'/'+(+d[2])+(x.subj?'・'+esc(x.subj):'')+'</small></span><span class="v">'+Y(x.total||0)+'</span></button>'+
  '<button type="button" class="ib hdel" data-del="'+x.id+'" aria-label="この履歴を削除">×</button></li>'}).join(''):'<li class="none">見つかりませんでした</li>'}

/* ---------- 入力イベント ---------- */
function bind(){
 [].forEach.call(document.querySelectorAll('[data-show]'),function(el){el.hidden=el.dataset.show.split(' ').indexOf(TYPE)<0});
 $('dateL').textContent=T[TYPE].d;
 if(TYPE==='r'&&!S.tad&&S.subj)S.tad=S.subj+'代として';
 var SF=['to','hon','subj','no','date','valid','nouki','jouken','due','tad','memo','rnd','basho','mno'],MF=['from','addr','tel','regno','bank','tanto'];
 SF.forEach(function(k){$(k).value=S[k];$(k).addEventListener('input',function(){S[k]=this.value;upd()})});
 MF.forEach(function(k){$(k).value=ME[k];$(k).addEventListener('input',function(){ME[k]=this.value;upd()})});
 $('pay').value=S.pay;$('pay').onchange=function(){S.pay=this.value;upd()};
 $('elec').value=S.elec?'1':'0';$('elec').onchange=function(){S.elec=this.value==='1';upd()};
 ['wOn','noTax','feeOn','wareki','reiss','uke'].forEach(function(k){$(k).checked=!!S[k];$(k).onchange=function(){S[k]=this.checked;upd()}});
 $('fee').value=fmtI(S.fee,1);$('fee').oninput=function(){this.value=fmtI(this.value,1);S.fee=this.value;upd()};
 $('keep').checked=keep;$('keep').onchange=function(){keep=this.checked;save();histUI();toast(keep?'この端末に保存します':'保存を停止し、保存内容を消しました')};
 $('meSec').open=!ME.from;
 if(PO)$('ottl').onclick=function(e){var b=e.target.closest('[data-v]');if(!b)return;S.ottl=b.dataset.v;poT();upd()};
 function pill(){[].forEach.call($('incl').children,function(b){var on=(b.dataset.v==='1')===S.incl;b.className=on?'on':'';b.setAttribute('aria-pressed',on)})}pill();
 $('incl').onclick=function(e){var v=e.target.dataset.v;if(v==null)return;S.incl=v==='1';pill();drawRows();upd()};
 $('rows').addEventListener('input',function(e){var t=e.target,k=t.dataset.k,it=t.closest('.it');if(!k||!it||k==='r'||k==='w'||k==='us')return;var r=S.rows[+it.dataset.i];
  if(k==='p'){var p=t.selectionStart,l=t.value.length;t.value=fmtI(t.value);try{var q=Math.max(0,p+t.value.length-l);t.setSelectionRange(q,q)}catch(_){}}
  if(k==='q'||k==='xr')t.value=z2h(t.value).replace(/[^0-9.]/g,'');
  r[k]=t.value;upd()});
 $('rows').addEventListener('change',function(e){var t=e.target,k=t.dataset.k,it=t.closest('.it');if(!it)return;var r=S.rows[+it.dataset.i];
  if(k==='r'){r.r=t.value;drawRows();upd();if(t.value==='x'){var x=document.querySelector('.it[data-i="'+it.dataset.i+'"] [data-k=xr]');if(x)x.focus()}}
  if(k==='w'){r.nw=!t.checked;upd()}
  if(k==='n'){var kn=ITEMS[r.n];if(kn&&!r.p){r.u=kn.u;r.uo=kn.uo;r.p=kn.p;r.r=kn.r;r.xr=kn.xr;drawRows();upd()}}
  if(k==='us'){if(t.value==='x'){r.uo=true;r.u=''}else{r.uo=false;r.u=t.value}drawRows();upd();if(r.uo){var u=document.querySelector('.it[data-i="'+it.dataset.i+'"] [data-k=u]');if(u)u.focus()}}});
 $('rows').addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var i=+b.closest('.it').dataset.i;
  if(b.dataset.act==='del')S.rows.splice(i,1);else if(i>0){var x=S.rows[i];S.rows[i]=S.rows[i-1];S.rows[i-1]=x}drawRows();upd()});
 $('addRow').onclick=function(){var l=S.rows[S.rows.length-1]||{};S.rows.push({n:'',q:'1',u:l.u!=null?l.u:'式',uo:!!l.uo,p:'',r:l.r||'10',xr:l.xr||'',nw:false});drawRows();upd();
  var ins=document.querySelectorAll('#rows .it input[data-k="n"]');ins[ins.length-1].focus()};
 // 書類の種類を切り替える時は、入力内容を引き継いでページを移動する
 function carry(){try{sessionStorage.setItem(KEY,JSON.stringify({doc:S,me:ME}))}catch(_){}}
 [].forEach.call(document.querySelectorAll('.types a'),function(a){a.addEventListener('click',carry)});
 $('next').addEventListener('click',carry);
 // 送付状へ：宛名と書類名を引き継ぐ
 $('toSf').addEventListener('click',function(){try{sessionStorage.setItem('sofujo_in',JSON.stringify({to:S.to,hon:S.hon,rows:[{n:T[TYPE].n,q:'1',u:'部'}]}))}catch(_){}});
 $('sw').onclick=function(e){var c=e.target.dataset.c;if(!c)return;ME.color=c;sw();upd()};
 function sw(){[].forEach.call($('sw').children,function(b){b.className=b.dataset.c===ME.color?'on':''})}sw();
 function ink(){$('inkImg').hidden=!ME.ink;$('inkDel').hidden=!ME.ink;if(ME.ink)$('inkImg').src=ME.ink}ink();
 $('inkBtn').onclick=function(){$('inkFile').click()};
 $('inkDel').onclick=function(){ME.ink='';ink();upd()};
 $('inkFile').onchange=function(){var f=this.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){var im=new Image();im.onload=function(){ME.ink=cleanInk(im);ink();upd()};im.src=rd.result};rd.readAsDataURL(f);this.value=''};
 function fresh(){var ot=S.ottl;S=blank();S.ottl=ot;try{sessionStorage.removeItem(KEY)}catch(_){}save();location.reload()}
 $('reset').onclick=function(){if(confirm('宛先・明細・備考を消して、新しい書類を作りますか？\n(あなたの情報はそのまま残ります)'))fresh()};
 if($('restoreNew'))$('restoreNew').onclick=fresh;
 $('print2').onclick=doPrint;
 var dlg=$('hdlg');
 $('histBtn').onclick=function(){$('hq').value='';drawHist();if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')};
 $('hClose').onclick=function(){if(dlg.close)dlg.close();else dlg.removeAttribute('open')};
 dlg.addEventListener('click',function(e){if(e.target===dlg)$('hClose').onclick()});
 $('hq').oninput=drawHist;
 $('hlist').onclick=function(e){var d=e.target.closest('[data-del]');if(d){try{localStorage.setItem(HKEY,JSON.stringify(hist().filter(function(x){return String(x.id)!==d.dataset.del})))}catch(_){}histUI();if(!myHist().length){$('hClose').onclick();$('to').focus()}return}
  var b=e.target.closest('[data-id]');if(!b)return;var x=hist().filter(function(x){return String(x.id)===b.dataset.id})[0];if(!x)return;
  if(hasContent()&&!hist().some(function(h){return h.t===TYPE&&h.no===S.no})&&!confirm('今入力している内容は消えます。よろしいですか？'))return;
  try{sessionStorage.setItem(LKEY,JSON.stringify({doc:x.doc,t:x.t,to:x.to}));sessionStorage.removeItem(KEY)}catch(_){}location.reload()};
 $('pdf2').onclick=$('pdf3').onclick=doPdf;
 $('toPv').onclick=function(){$('pv').scrollIntoView({behavior:'smooth'})};
 window.addEventListener('resize',fit);
}
// 印影：縮小し、白い背景を透明にする(もともと透明な画像はそのまま)
function cleanInk(im){var s=Math.min(1,240/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.width*s));cv.height=Math.max(1,Math.round(im.height*s));
 var x=cv.getContext('2d');x.drawImage(im,0,0,cv.width,cv.height);
 try{var d=x.getImageData(0,0,cv.width,cv.height),p=d.data,tr=0;for(var i=3;i<p.length;i+=4)if(p[i]<250){tr++;if(tr>p.length/400)break}
  if(tr<=p.length/400){for(i=0;i<p.length;i+=4){var mn=Math.min(p[i],p[i+1],p[i+2]);if(mn>215)p[i+3]=0;else if(mn>160)p[i+3]=Math.round(p[i+3]*(215-mn)/55)}x.putImageData(d,0,0)}}catch(_){}
 return cv.toDataURL('image/png')}
// PDFを直接ダウンロードする(スマホ・コンビニ印刷用)。ライブラリは押した時だけ読み込む
function load(src){return new Promise(function(ok,ng){if(document.querySelector('script[src="'+src+'"]'))return ok();var e=document.createElement('script');e.src=src;e.onload=ok;e.onerror=ng;document.head.appendChild(e)})}
var busy=false;
function doPdf(){if(busy)return;busy=true;var bs=[$('pdf2'),$('pdf3')],lb=bs.map(function(b){return b.textContent});bs.forEach(function(b){b.textContent='作成中…';b.disabled=true});
 var nm=T[TYPE].n+(S.no?'_'+S.no:'')+(S.to?'_'+S.to:''),box=document.createElement('div');
 box.className='pdfmode';box.style.cssText='position:fixed;left:-10000px;top:0;width:210mm';box.innerHTML=docHTML(last);document.body.appendChild(box);
 function end(){busy=false;bs.forEach(function(b,i){b.textContent=lb[i];b.disabled=false});if(box.parentNode)box.parentNode.removeChild(box)}
 Promise.all([load('/assets/vendor/html2canvas.min.js'),load('/assets/vendor/jspdf.umd.min.js')]).then(function(){return (document.fonts?document.fonts.ready:Promise.resolve())}).then(function(){
  return html2canvas(box.firstChild,{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true})}).then(function(cv){
  var pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});pdf.addImage(cv.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297);
  pdf.setProperties({title:nm});pdf.save(nm.replace(/[\\/:*?"<>|]/g,'')+'.pdf');end();record();$('toSf').classList.add('on');toast('PDFを保存しました');$('shareAsk').hidden=false;$('shareAsk').scrollIntoView({behavior:'smooth',block:'center'})}).catch(function(){end();toast('PDFを作れませんでした。「印刷」からお試しください')})}
function doPrint(){record();$('toSf').classList.add('on');var html=docHTML(last),nm=T[TYPE].n+(S.no?'_'+S.no:'')+(S.to?'_'+S.to:'');
 var inFrame=false;try{inFrame=window.self!==window.top}catch(_){inFrame=true}
 if(!inFrame){$('prt').innerHTML=html;var tt=document.title;document.title=nm;window.print();setTimeout(function(){document.title=tt;$('prt').innerHTML=''},800);return}
 var w=window.open('','_blank');if(!w){toast('ポップアップを許可してください');return}
 var css=[].map.call(document.querySelectorAll('link[rel=stylesheet]'),function(l){return '<link rel="stylesheet" href="'+l.href+'">'}).join('');
 w.document.write('<!doctype html><meta charset="utf-8"><title>'+esc(nm)+'</title>'+css+'<body><div id="prt">'+html+'</div><script>onload=function(){setTimeout(print,200)}<\/script>');w.document.close()}

// 使い方の案内：例の内容を入れて、画面の該当部分を順に光らせる(終わったら元の入力に戻せる)
var tourOn=false;
(function(){
 function R(n,q,u,p,r,o){var x={n:n,q:String(q),u:u,p:p,r:r||'10',xr:'',nw:false};if(o)Object.assign(x,o);return x}
 var SC={
  q:{
   free:{t:'個人・フリーランスで仕事を受ける人',d:{to:'株式会社サンプル商事',subj:'ホームページ制作',rows:[R('トップページ デザイン',1,'式','80,000'),R('下層ページ デザイン',5,'件','20,000'),R('コーディング',1,'式','120,000')]},steps:[
    ['to','<b>宛名</b>と<b>件名</b>を入れます。有効期限は30日後が自動で入ります。'],
    ['rows','<b>品目・数量・単価</b>を入れると、金額と消費税が自動で計算されます。'],
    ['pv','プレビューを見ながら<b>PDFで保存</b>して、そのまま相手に送れます。']]},
   shop:{t:'商品を売るお店・小さな会社',d:{to:'株式会社サンプル商事',subj:'事務用品・飲料',rows:[R('コピー用紙 A4',10,'個','2,800'),R('お茶(2L)',12,'個','198','8')]},steps:[
    ['rows','食べ物・飲み物は、明細ごとに<b>税率8%</b>を選べます。'],
    ['sum','<b>税率ごとの合計と消費税</b>が自動で入ります(インボイス対応)。'],
    ['types','注文が決まったら、上の<b>「請求書」</b>を押すだけで、同じ内容の請求書に切り替わります。']]},
   wh:{t:'デザイン料・原稿料を受け取る個人',d:{to:'株式会社サンプル出版',subj:'イラスト制作',wOn:true,rows:[R('表紙イラスト',1,'式','100,000')]},steps:[
    ['opt','「オプション」の<b>源泉徴収税を差し引く</b>をオンにします。'],
    ['sum','源泉徴収税(10.21%)を差し引いた、<b>実際に受け取る金額</b>が出ます。'],
    ['pv','書類にも、源泉徴収税と差し引き後の金額が入ります。']]}},
  n:{
   est:{t:'見積書を作ったあとに納品する人',d:{to:'株式会社サンプル商事',subj:'ホームページ制作',rows:[R('トップページ デザイン',1,'式','80,000'),R('コーディング',1,'式','120,000')]},steps:[
    ['types','見積書を作っていれば、上の<b>「納品書」</b>を押すだけで同じ内容になります。'],
    ['rows','実際に納めた<b>品目と数量</b>に合わせて直します。'],
    ['pv','PDFで保存して、納品物と一緒に渡します。']]},
   goods:{t:'商品を届けるお店・会社',d:{to:'サンプル食堂',hon:'様',subj:'10月分 食材',rows:[R('お米(5kg)',4,'個','2,400','8'),R('食用油(1L)',6,'個','420','8'),R('紙ナプキン',10,'個','150')]},steps:[
    ['to','届け先の<b>宛名</b>を入れます。個人のお店なら敬称を「様」に。'],
    ['rows','食べ物は<b>8%</b>、それ以外は<b>10%</b>を明細ごとに選べます。'],
    ['sum','税率ごとの合計が自動で入ります。']]}},
  i:{
   free:{t:'個人・フリーランスで仕事を受けた人',d:{to:'株式会社サンプル商事',subj:'10月分 Web運用',wOn:true,rows:[R('Webサイト更新作業',1,'式','150,000')]},steps:[
    ['due','<b>お支払期限</b>は、来月末が自動で入ります。'],
    ['opt','デザイン・原稿料などで源泉徴収される時は、<b>源泉徴収税を差し引く</b>をオンにします。'],
    ['sum','差し引いた<b>お振込み額</b>が、そのまま請求書に入ります。']]},
   fee:{t:'振込手数料を引いて支払われる人',d:{to:'株式会社サンプル商事',subj:'翻訳料',feeOn:true,fee:'440',rows:[R('翻訳(日本語→英語)',20,'件','5,000')]},steps:[
    ['opt','相手が振込手数料を差し引いて払う約束なら、<b>振込手数料を差し引く</b>をオンにして金額を入れます。'],
    ['sum','手数料を引いた<b>お振込み額</b>が出ます。']]},
   mix:{t:'10%と8%の品目がまざる人',d:{to:'株式会社サンプル商事',subj:'ケータリング',rows:[R('お弁当(持ち帰り)',20,'個','900','8'),R('会場設営',1,'式','15,000')]},steps:[
    ['rows','品目ごとに<b>税率</b>を選びます。持ち帰りの食べ物は8%です。'],
    ['sum','<b>税率ごとの合計と消費税</b>が入るので、インボイスの条件を満たします。']]}},
  r:{
   cash:{t:'代金を現金で受け取った人',d:{to:'株式会社サンプル商事',tad:'ホームページ制作費として',pay:'cash',rows:[R('ホームページ制作',1,'式','80,000')]},steps:[
    ['to','<b>宛名</b>と<b>但し書き</b>(何の代金か)を入れます。'],
    ['chip','税抜5万円以上の現金・紙の領収書には<b>収入印紙</b>が必要です。いくらの印紙かを自動で判定します。'],
    ['pv','PDFで保存して印刷し、印紙を貼って渡します。']]},
   pdf:{t:'領収書をPDFで送る人',d:{to:'株式会社サンプル商事',tad:'ホームページ制作費として',pay:'bank',elec:true,rows:[R('ホームページ制作',1,'式','80,000')]},steps:[
    ['elec','<b>渡し方</b>を「PDFで送る」にします。'],
    ['chip','PDFなど電子データで渡す領収書には、<b>収入印紙はいりません</b>。']]}},
  o:{
   out:{t:'外注先に仕事を頼む人',d:{to:'サンプルデザイン事務所',subj:'パンフレット デザイン',nouki:'2026年12月15日',basho:'メールで納品',jouken:'月末締め翌月末払い',rows:[R('パンフレット デザイン(8ページ)',1,'式','160,000')]},steps:[
    ['to','頼む相手と<b>納期・納品場所・支払条件</b>を入れます。'],
    ['rows','頼む内容と金額を入れます。'],
    ['pv','PDFで保存して、相手に送ります。']]},
   uke:{t:'相手に注文請書をもらいたい人',d:{to:'株式会社サンプル工業',subj:'部品加工',nouki:'2026年11月30日',uke:true,rows:[R('部品加工 A-100',500,'個','320')]},steps:[
    ['uke','<b>「注文請書をご提出ください」と書く</b>をオンにすると、書類に一文が入ります。'],
    ['chip','<b>収入印紙</b>がいるかどうかも表示します。']]}}
 }[TYPE]||{};
 window.SR_SC=SC;
 function q(s){return document.querySelector(s)}
 var TG={to:function(){return document.querySelectorAll('.fm .sec')[0]},rows:function(){return document.querySelectorAll('.fm .sec')[1]},sum:function(){return $('sum')},opt:function(){return $('optBox')},
  types:function(){return q('.types')||$('ottl')},pv:function(){return $('pv').querySelector('.card')},due:function(){return $('due').parentNode},chip:function(){return $('chip')},
  elec:function(){return $('elec').parentNode},uke:function(){return $('uke').closest('label')}};
 var cur=null,i=0,saved=null,ring,bub,shade;
 function fill(){['to','hon','subj','no','date','valid','nouki','jouken','due','tad','memo','rnd','basho','mno'].forEach(function(k){$(k).value=S[k]});
  $('pay').value=S.pay;$('elec').value=S.elec?'1':'0';['wOn','noTax','feeOn','wareki','reiss','uke'].forEach(function(k){$(k).checked=!!S[k]});
  $('fee').value=fmtI(S.fee,1);[].forEach.call($('incl').children,function(b){var on=(b.dataset.v==='1')===S.incl;b.className=on?'on':'';b.setAttribute('aria-pressed',on)});
  drawRows();render()}
 function el(c){var e=document.createElement('div');e.className=c;document.body.appendChild(e);return e}
 function start(k){var c=SC[k];if(!c)return;saved={S:JSON.stringify(S),opt:$('optBox').open,y:window.scrollY};cur=c;i=0;tourOn=true;
  var ot=S.ottl;S=Object.assign(blank(),JSON.parse(JSON.stringify(c.d)));if(PO)S.ottl=ot;$('optBox').open=false;fill();
  shade=el('tshade');ring=el('tring');bub=el('tbub');bub.setAttribute('role','dialog');bub.setAttribute('aria-label','使い方：'+c.t);
  document.addEventListener('keydown',key);window.addEventListener('resize',place);setTimeout(show,60)}
 function key(e){if(e.key==='Escape')end(false)}
 function show(){var st=cur.steps[i],n=cur.steps.length,last=i===n-1;if(st[0]==='opt')$('optBox').open=true;
  bub.innerHTML='<div class="th"><span>使い方の例：'+cur.t+'</span><button type="button" class="tx" aria-label="閉じる">×</button></div><p>'+st[1]+'</p>'+
   '<div class="tf"><span class="tn">'+(i+1)+' / '+n+'</span>'+(i?'<button type="button" class="tb0">戻る</button>':'')+
   (last?'<button type="button" class="tb0" data-r="1">元の入力に戻す</button><button type="button" class="tb1">この例のまま使う</button>':'<button type="button" class="tb1">次へ</button>')+'</div>';
  bub.querySelector('.tx').onclick=function(){end(false)};
  [].forEach.call(bub.querySelectorAll('.tb0'),function(b){b.onclick=b.dataset.r?function(){end(false)}:function(){i--;show()}});
  bub.querySelector('.tb1').onclick=last?function(){end(true)}:function(){i++;show()};
  var t=TG[st[0]]();t.scrollIntoView({block:t.offsetHeight>innerHeight*.6?'start':'center'});place();
  setTimeout(function(){try{bub.querySelector('.tb1').focus({preventScroll:true})}catch(_){}},0)}
 function place(){if(!cur)return;var t=TG[cur.steps[i][0]](),r=t.getBoundingClientRect(),sx=window.scrollX,sy=window.scrollY,pad=6,vh=window.innerHeight,vw=document.documentElement.clientWidth;
  ring.style.cssText='left:'+(r.left+sx-pad)+'px;top:'+(r.top+sy-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px';
  var bw=Math.min(340,vw-24),bh=bub.offsetHeight,left=Math.max(12,Math.min(r.left+r.width/2-bw/2,vw-bw-12)),top;
  if(r.bottom+pad+12+bh<=vh)top=r.bottom+pad+12;else if(r.top-pad-12-bh>=0)top=r.top-pad-12-bh;else top=vh-bh-12;
  bub.style.cssText='width:'+bw+'px;left:'+(left+sx)+'px;top:'+(top+sy)+'px'}
 function end(use){if(!cur)return;cur=null;tourOn=false;
  [shade,ring,bub].forEach(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e)});
  document.removeEventListener('keydown',key);window.removeEventListener('resize',place);
  if(use){save();toast('この例の内容を入れました。書き換えて使えます');TG.to().scrollIntoView({block:'start'})}
  else{S=JSON.parse(saved.S);$('optBox').open=saved.opt;fill();window.scrollTo(0,saved.y)}}
 window.SRTour=function(){[].forEach.call(document.querySelectorAll('.who [data-sc]'),function(b){b.onclick=function(){start(b.dataset.sc)}})};
})();

build();drawRows();bind();render();histUI();SRTour();if(window.SKShare)SKShare();
if(fromHist)toast((fromHist.to||'過去の書類')+' の内容を読み込みました');
try{sessionStorage.removeItem(KEY)}catch(_){}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
