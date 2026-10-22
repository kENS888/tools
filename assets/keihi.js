/* しごと計算ラボ 経費精算書・交通費精算書 作成(画面)。計算は keihi/index.html の script#core */
(function(){
var $=function(id){return document.getElementById(id)};
var KEY='keihi_v1',HKEY='keihi_hist_v1',MAXR=25;
var HOW=[['','指定なし'],['銀行振込','銀行振込'],['現金','現金'],['給与と合わせて支給','給与と合わせて支給']];
var TTLS=[['auto','おまかせ(全部が交通費なら交通費精算書)'],['経費精算書','経費精算書'],['交通費精算書','交通費精算書'],['立替経費精算書','立替経費精算書']];
var APV={'3':['経理','承認','申請者'],'2':['承認','申請者'],'0':[]};
var APVN=[['3','3つ(経理・承認・申請者)'],['2','2つ(承認・申請者)'],['0','なし']];
function iso(t){var p=function(n){return ('0'+n).slice(-2)};return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate())}
function today(){return iso(new Date())}
function J(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(_){return d}}
function row(d,c){return {d:d||today(),c:c||'',co:false,n:'',to:'',p:'',po:false,a:'',rt:false,rc:c!==KH_TRAIN,rcT:false}}
// 科目ごとの支払方法・支払先の候補・内容の例(当てはまらない時は「その他」で入力)
var PAY_BASE=['現金','クレジットカード','タッチ決済','QRコード決済','電子マネー'];
var PAY={'旅費交通費':['交通系IC','切符(現金)','クレジットカード','タッチ決済','QRコード決済','ETCカード','現金'],
 '通信費':PAY_BASE.concat(['口座引き落とし']),'新聞図書費':PAY_BASE.concat(['口座引き落とし']),
 '支払手数料':['現金','口座引き落とし','クレジットカード','QRコード決済']};
function payList(c){return PAY[c]||PAY_BASE}
var SHOP={'旅費交通費':['JR','地下鉄','私鉄','バス','タクシー','新幹線','航空会社','ホテル','駐車場','高速道路'],
 '消耗品費':['文具店','家電量販店','100円ショップ','ホームセンター','ネット通販','コンビニ'],
 '会議費':['カフェ','コンビニ','飲食店','お弁当屋','貸会議室'],
 '接待交際費':['飲食店','百貨店','和菓子店','花屋','ネット通販'],
 '通信費':['郵便局','宅配便','携帯電話会社','ネット通販'],
 '新聞図書費':['書店','ネット通販','新聞販売店','電子書籍ストア'],
 '福利厚生費':['スーパー','コンビニ','ドラッグストア','飲食店'],
 '支払手数料':['銀行','法務局','市区町村役場','郵便局'],'雑費':[]};
var EX={'旅費交通費':'区間(例：新宿→渋谷)','消耗品費':'内容(例：コピー用紙)','会議費':'内容(例：打ち合わせの飲み物)','接待交際費':'内容(例：〇〇社と会食)',
 '通信費':'内容(例：切手)','新聞図書費':'内容(例：参考書)','福利厚生費':'内容(例：社内用のお茶)','支払手数料':'内容(例：振込手数料)'};
var SHOPPH={'旅費交通費':'交通機関','新聞図書費':'書店など','支払手数料':'銀行など'};
function blank(){return {rows:[row()],adv:'',how:'',date:today(),ttl:'auto',per:'',no:'',memo:'',apv:'3',wareki:false}}
var S=blank(),ME={name:'',dept:'',eno:'',co:'',color:'navy'},keep=true,restored=false;
var sv=J(KEY,null);
if(sv){if(sv.me)ME=Object.assign(ME,sv.me);if(sv.keep===false)keep=false;
 if(keep&&sv.s){S=Object.assign(blank(),sv.s);if(!S.rows||!S.rows.length)S.rows=[row()];S.date=today();restored=hasContent()}}
function hasContent(){return S.rows.some(khUsed)}

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ph(v,p){return v?esc(v):'<span class="ph">'+p+'</span>'}
function yen(n){return (n<0?'-':'')+Math.abs(n).toLocaleString('ja-JP')}
function jd(v){if(!v)return '';if(S.wareki)return wareki(v);var p=v.split('-');return p[0]+'年'+(+p[1])+'月'+(+p[2])+'日'}
function md(v,y){if(!v)return '';var p=v.split('-');return (y?p[0]+'/':'')+(+p[1])+'/'+(+p[2])}
function per(c){return S.per.trim()||perAuto(c)}
function perAuto(c){if(!c.from)return '';
 if(!S.wareki)return khPeriod(c.from,c.to);
 var a=c.from.split('-'),b=c.to.split('-');if(a[0]===b[0]&&a[1]===b[1])return wareki(c.from).replace(/\d+日$/,'')+'分';return wareki(c.from)+'〜'+wareki(c.to)}
function toast(m){var t=$('toast');t.textContent=m;t.className='toast on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className='toast'},2200)}
function F(id,lbl,ph_,o){o=o||{};return '<div'+(o.w?' class="w"':'')+'><label class="f" for="'+id+'">'+lbl+(o.em?'<em>'+o.em+'</em>':'')+'</label>'+
 (o.ta?'<textarea id="'+id+'" rows="'+o.ta+'" placeholder="'+ph_+'"></textarea>':
 o.yen?'<div class="yen"><input id="'+id+'" type="text" inputmode="numeric" placeholder="'+ph_+'" autocomplete="off"><span>円</span></div>':
 '<input id="'+id+'" type="'+(o.t||'text')+'" placeholder="'+ph_+'"'+(o.a?' autocomplete="'+o.a+'"':'')+'>')+'</div>'}
function opts(a,v){return a.map(function(x){return '<option value="'+esc(x[0])+'"'+(x[0]===v?' selected':'')+'>'+x[1]+'</option>'}).join('')}
var IC={dup:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'};

/* ---------- フォーム ---------- */
function build(){
 var h='<div class="app"><div class="card fm">'+
 (restored?'<div class="restore" id="restore"><span>前回の入力内容を表示しています</span><button type="button" id="restoreNew">新しく作る</button></div>':'')+
 '<button type="button" class="hbtn" id="histBtn" aria-haspopup="dialog" hidden><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>過去の精算書から作る<span id="histN"></span></button>'+

 '<section class="sec" id="secRows"><div class="sh"><span class="n">1</span><h2>立て替えた経費</h2><span class="r" id="rowsN"></span></div>'+
 '<div id="rows"></div>'+
 '<button type="button" class="add" id="addRow">＋ 明細を追加</button>'+
 '<div class="sum" id="sum" aria-live="polite"></div>'+
 '<details class="more" id="advBox"><summary>仮払金<span class="ms" id="advSum"></span></summary>'+
 '<div class="g2">'+F('adv','仮払金(先に受け取ったお金)','0',{yen:1})+'<div><label class="f" for="how">精算方法</label><select id="how">'+opts(HOW,'')+'</select></div></div></details>'+
 '<details class="more" id="docBox"><summary>書類の設定<span class="ms" id="docSum"></span></summary>'+
 '<div class="g2">'+F('date','提出日','',{t:'date'})+F('no','書類番号','',{em:'任意'})+
 '<div class="w"><label class="f" for="ttl">タイトル</label><select id="ttl">'+opts(TTLS,'auto')+'</select></div>'+
 F('per','対象期間','明細の日付から自動',{em:'変える場合だけ',w:1})+
 '<div class="w"><label class="f" for="apv">承認欄(はんこを押す欄)</label><select id="apv">'+opts(APVN,'3')+'</select></div>'+
 F('memo','備考','例：領収書は別紙に貼り付けています。',{em:'任意',w:1,ta:2})+
 '</div><label class="ck"><input type="checkbox" id="wareki"><span>日付を和暦(令和)で表示する</span></label></details></section>'+

 '<details class="sec" id="meSec"><summary><div class="sh"><span class="n">2</span><h2>申請する人</h2><span class="r" id="meSt"></span></div></summary>'+
 '<div class="g2">'+F('name','氏名','山田 太郎',{a:'name'})+F('dept','所属(部署)','営業部',{em:'任意'})+
 F('eno','社員番号','',{em:'任意'})+F('co','会社名','株式会社〇〇',{em:'任意',a:'organization'})+'</div>'+
 '<label class="f">書類の色</label><div class="sw" id="sw">'+[['navy','#1e3a8a','ネイビー'],['black','#222','ブラック'],['green','#0f766e','グリーン'],['red','#9f1239','えんじ']].map(function(c){return '<button type="button" data-c="'+c[0]+'" style="background:'+c[1]+'" aria-label="'+c[2]+'" title="'+c[2]+'"></button>'}).join('')+'</div>'+
 '<label class="ck"><input type="checkbox" id="keep"><span>この端末に入力内容を保存する<span class="note">保存先はこのブラウザだけで、サーバーには送信されません。共用のパソコンではオフにしてください。</span></span></label>'+
 '</details>'+
 '<div class="share" id="shareAsk" hidden><b>PDFができました</b><span>便利だと思ったら、お仕事仲間にシェアしていただけるとうれしいです。</span><div class="sbtns" data-share></div></div>'+
 '</div>'+

 '<div class="pv" id="pv"><div class="card"><div class="pvh"><h2>プレビュー <span class="pv-chip" id="pvChip"></span></h2></div>'+
 '<div class="pvwrap"><div class="pvbox" id="pvbox"><div id="paperHost"></div></div></div>'+
 '<div class="acts pvacts"><button type="button" class="btn p" id="pdf2">PDFをダウンロード</button><button type="button" class="btn" id="print2">印刷</button><button type="button" class="btn" id="reset">新しく作る</button></div>'+
 '</div></div></div>'+
 
 '<dialog class="hdlg" id="hdlg" aria-labelledby="hdlgT"><div class="hh"><b id="hdlgT">過去の精算書から作る</b><button type="button" class="ib" id="hClose" aria-label="閉じる">×</button></div>'+
 '<p class="note">選ぶと明細が入ります。提出日は今日になります。明細の日付は必要に応じて直してください。</p><input type="search" id="hq" placeholder="内容・期間で検索" aria-label="内容・期間で検索" hidden><ul class="hl" id="hlist"></ul>'+
 '<p class="note">PDF保存・印刷した精算書を、このブラウザに最新30件まで記録しています(サーバーには送信されません)。</p></dialog>';
 $('app').innerHTML=h;
 document.body.insertAdjacentHTML('beforeend','<div class="bar"><div class="t"><small id="barL">受け取る金額</small><b id="barV"></b></div><button type="button" class="btn" id="toPv">プレビュー</button><button type="button" class="btn p" id="pdf3">PDF保存</button></div><div class="toast" id="toast"></div><div id="prt"></div>');
}
// 同じ科目で前に使った値＋科目ごとの候補
function sugg(c,k){var m={},h=keep?hist():[];
 h.map(function(x){return x.doc.rows||[]}).concat([S.rows]).forEach(function(rs){rs.forEach(function(r){var v=String(r[k]||'').trim();if(v&&r.c===c)m[v]=1})});
 if(k==='to')(SHOP[c]||[]).forEach(function(v){m[v]=1});return Object.keys(m).slice(0,40)}
function TG(k,on,lbl,ic,i){return '<button type="button" class="tg'+(on?' on':'')+'" data-act="'+k+'" aria-pressed="'+on+'" aria-label="'+(i+1)+'行目：'+lbl+'"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ic+'</svg>'+lbl+'</button>'}
function rowHTML(r,i){var tr=r.c===KH_TRAIN,ot=r.co||(r.c!==''&&KH_CATS.indexOf(r.c)<0),pl=payList(r.c),po=r.po||(r.p!==''&&pl.indexOf(r.p)<0);
 return '<div class="kr'+(tr?' tr':'')+'" data-i="'+i+'">'+
 '<div class="kh0"><span>明細 '+(i+1)+'</span><span class="kb"><button type="button" class="ib" data-act="dup" aria-label="'+(i+1)+'行目を複製" title="この行を複製"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+IC.dup+'</svg></button>'+
 '<button type="button" class="ib" data-act="del" aria-label="'+(i+1)+'行目を削除" title="この行を削除"'+(S.rows.length>1?'':' hidden')+'>×</button></span></div>'+
 '<input type="date" class="kd" data-k="d" value="'+esc(r.d)+'" aria-label="'+(i+1)+'行目の日付">'+
 '<div class="kc'+(ot?' o':'')+'"><select data-k="cs" aria-label="'+(i+1)+'行目の科目"><option value=""'+(!ot&&!r.c?' selected':'')+'>科目を選ぶ</option>'+KH_CATS.map(function(c){return '<option'+(!ot&&c===r.c?' selected':'')+'>'+c+'</option>'}).join('')+'<option value="x"'+(ot?' selected':'')+'>その他(入力)</option></select>'+
 (ot?'<input type="text" data-k="c" value="'+esc(r.c)+'" placeholder="科目名" aria-label="科目名">':'')+'</div>'+
 '<div class="ka yen"><input type="text" inputmode="numeric" data-k="a" value="'+esc(r.a)+'" placeholder="'+(tr&&r.rt?'片道':'金額')+'" aria-label="'+(i+1)+'行目の金額'+(tr&&r.rt?'(片道)':'')+'" autocomplete="off"><span>円</span></div>'+
 '<input type="text" class="kn" data-k="n" value="'+esc(r.n)+'" placeholder="'+(EX[r.c]||'内容')+'" aria-label="'+(i+1)+'行目の内容" data-sg="n" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">'+
 '<input type="text" class="kt" data-k="to" value="'+esc(r.to)+'" placeholder="'+(SHOPPH[r.c]||'お店')+'" aria-label="'+(i+1)+'行目の支払先" data-sg="to" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">'+
 '<div class="ko"><div class="kp'+(po?' o':'')+'"><select data-k="ps" aria-label="'+(i+1)+'行目の支払方法"><option value=""'+(!po&&!r.p?' selected':'')+'>支払方法</option>'+pl.map(function(v){return '<option'+(!po&&v===r.p?' selected':'')+'>'+v+'</option>'}).join('')+'<option value="x"'+(po?' selected':'')+'>その他(入力)</option></select>'+
 (po?'<input type="text" data-k="p" value="'+esc(r.p)+'" placeholder="支払方法" aria-label="支払方法">':'')+'</div>'+
 (tr?TG('rt',!!r.rt,'往復','<path d="M7 7h12l-3-3M17 17H5l3 3"/>',i):'')+
 TG('rc',!!r.rc,'領収書','<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',i)+'<span class="kx"></span></div></div>'}
function drawRows(){$('rows').innerHTML=S.rows.map(rowHTML).join('');$('addRow').disabled=S.rows.length>=MAXR}

/* ---------- 精算書 ---------- */
function docHTML(){
 var c=khCalc(S.rows,S.adv),rs=khSort(S.rows.filter(khUsed)),ys={};rs.forEach(function(r){if(r.d)ys[r.d.slice(0,4)]=1});var my=Object.keys(ys).length>1;
 var lines=Math.max(12,rs.length),body='',pc=rs.some(function(r){return String(r.p||'').trim()});
 for(var i=0;i<lines;i++){var r=rs[i];
  if(!r){body+='<tr><td class="c">'+(i+1)+'</td><td></td><td></td><td></td><td></td>'+(pc?'<td></td>':'')+'<td></td><td></td></tr>';continue}
  var a=khAmt(r),tr=r.c===KH_TRAIN&&r.rt;
  body+='<tr><td class="c">'+(i+1)+'</td><td class="c">'+md(r.d,my)+'</td><td>'+esc(r.c)+'</td><td>'+esc(r.n)+(tr?'<span class="kh-rt">(往復 '+yen(khYen(r.a))+'円×2)</span>':'')+'</td><td>'+esc(r.to)+'</td>'+(pc?'<td class="pm">'+esc(r.p)+'</td>':'')+'<td class="r">'+(String(r.a).trim()?yen(a):'')+'</td><td class="c">'+(r.rc?'あり':'なし')+'</td></tr>'}
 var ap=APV[S.apv]||[],pt=per(c);
 var apH=ap.length?'<table class="kh-ap"><tr>'+ap.map(function(x){return '<th>'+x+'</th>'}).join('')+'</tr><tr>'+ap.map(function(){return '<td></td>'}).join('')+'</tr></table>':'';
 var who='<tr><th>所属</th><td>'+esc(ME.dept)+'</td></tr><tr><th>氏名</th><td class="nm">'+ph(ME.name,'氏名')+'</td></tr>'+(ME.eno.trim()?'<tr><th>社員番号</th><td>'+esc(ME.eno)+'</td></tr>':'')+
  '<tr><th>対象期間</th><td>'+esc(pt)+'</td></tr>'+(S.how?'<tr><th>精算方法</th><td>'+esc(S.how)+'</td></tr>':'');
 var big=c.back?['返金額',c.back,'仮払金のうち、会社に返す金額']:[c.adv?'差引 支給額':'精算額',c.adv?c.pay:c.total,c.adv?'合計 '+yen(c.total)+'円 − 仮払金 '+yen(c.adv)+'円':''];
 var cats=c.cats.length>1||(c.cats.length===1&&c.cats[0][0]!=='(科目なし)')?'<table class="kh-cat"><tr><th colspan="2">科目別の合計</th></tr>'+c.cats.map(function(x){return '<tr><td>'+esc(x[0])+'</td><td>'+yen(x[1])+'円</td></tr>'}).join('')+'</table>':'';
 var sum='<table class="d-sum"><tr><td>合計('+c.n+'件)</td><td>'+yen(c.total)+'円</td></tr>'+
  (c.adv?'<tr><td>仮払金</td><td>'+yen(c.adv)+'円</td></tr><tr class="t"><td>'+(c.back?'返金額':'差引 支給額')+'</td><td>'+yen(c.back||c.pay)+'円</td></tr>':'<tr class="t"><td>精算額</td><td>'+yen(c.total)+'円</td></tr>')+'</table>';
 return '<div class="paper kh c-'+ME.color+(lines>18?' dense':'')+'">'+
  '<div class="d-top"><h1 class="d-ttl">'+esc(khTitle(S.ttl,c))+'</h1><div class="d-meta">'+(ME.co.trim()?esc(ME.co)+'<br>':'')+(S.no.trim()?'No. '+esc(S.no)+'<br>':'')+'提出日：'+jd(S.date)+'</div></div>'+
  '<div class="kh-hd"><table class="kh-who">'+who+'</table>'+apH+'</div>'+
  '<div class="d-amt"><span>'+big[0]+'</span><b>¥'+yen(big[1])+'</b><small>'+esc(big[2])+'</small></div>'+
  '<table class="d-it kh-it'+(pc?' wp':'')+'"><thead><tr><th>No.</th><th>日付</th><th>科目</th><th>内容</th><th>支払先</th>'+(pc?'<th>支払方法</th>':'')+'<th>金額(円)</th><th>領収書</th></tr></thead><tbody>'+body+'</tbody></table>'+
  '<div class="d-sumw"><div class="lf">'+cats+'</div>'+sum+'</div>'+
  (S.memo.trim()?'<div class="d-memo"><b>備考</b>'+esc(S.memo.trim())+'</div>':'')+'</div>'}

/* ---------- 描画 ---------- */
var raf;function upd(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
function C(t,on){return on?'<span class="c">'+esc(t)+'</span>':esc(t)}
function render(){
 var c=khCalc(S.rows,S.adv);
 // 合計と、受け取る(返す)金額
 var lab,val,neg=false;
 if(c.back){lab='会社に返す金額';val=c.back;neg=true}else{lab='あなたが受け取る金額';val=c.adv?c.pay:c.total}
 $('sum').innerHTML='<div><span>経費の合計('+c.n+'件)</span><span>'+yen(c.total)+'円</span></div>'+
  (c.adv?'<div class="neg"><span>仮払金</span><span>−'+yen(c.adv)+'円</span></div>':'')+
  '<div class="big'+(neg?' bk':'')+'"><span>'+lab+'</span><b>'+yen(val)+'<small>円</small></b></div>';
 $('barL').textContent=lab;$('barV').textContent=yen(val)+'円';
 $('rowsN').textContent=S.rows.length>1?S.rows.length+'行':'';
 // 行ごとの往復の金額
 [].forEach.call(document.querySelectorAll('#rows .kr'),function(el){var r=S.rows[+el.dataset.i];if(!r)return;var x=el.querySelector('.kx');
  x.textContent=r.c===KH_TRAIN&&r.rt&&khYen(r.a)?'往復 '+yen(khAmt(r))+'円':''});
 $('advSum').innerHTML=c.adv||S.how?[c.adv?C(yen(c.adv)+'円',1):'',S.how?C(S.how,1):''].filter(String).join('・'):'なし';
 var t=khTitle(S.ttl,c);
 $('docSum').innerHTML=[C(t,S.ttl!=='auto')].concat(S.date!==today()?[C(jd(S.date),1)]:[],S.apv!=='3'?[C('承認欄 '+(APV[S.apv]||[]).length+'つ',1)]:[],S.no.trim()?[C('No. '+S.no.trim(),1)]:[],S.per.trim()?[C(S.per.trim(),1)]:[],S.memo.trim()?[C('備考あり',1)]:[],S.wareki?[C('和暦',1)]:[]).join('・');
 $('per').placeholder=c.from?'自動：'+perAuto(c):'明細の日付から自動';
 $('pvChip').textContent=t;
 $('paperHost').innerHTML=docHTML();fit();
 $('meSt').textContent=ME.name?'保存済み：'+ME.name.slice(0,12):'未入力';
 save();
}
function fit(){var box=$('pvbox'),p=box.querySelector('.paper');if(!p)return;var W=box.parentNode.clientWidth-parseFloat(getComputedStyle(box.parentNode).paddingLeft)*2,s=Math.min(1,W/p.offsetWidth);
 if(innerWidth>980){var cd=box.closest('.card'),ex=cd.offsetHeight-box.offsetHeight;s=Math.max(.3,Math.min(s,(innerHeight-32-ex)/p.offsetHeight))}
 if(window.PVZ)s=PVZ.adj(s,p,box);
 p.style.transform='scale('+s+')';box.style.width=p.offsetWidth*s+'px';box.style.height=p.offsetHeight*s+'px'}
window.PVfit=fit;
function save(){if(tourOn)return;try{
 if(keep)localStorage.setItem(KEY,JSON.stringify({keep:true,me:ME,s:S}));
 else{localStorage.setItem(KEY,JSON.stringify({keep:false}));localStorage.removeItem(HKEY)}}catch(_){}}

/* ---------- 作成履歴・入力候補 ---------- */
function hist(){var l=J(HKEY,[]);return Array.isArray(l)?l:[]}
function record(){if(!keep||!hasContent()||tourOn)return;var c=khCalc(S.rows,S.adv),it={id:Date.now(),at:today(),per:per(c),title:khTitle(S.ttl,c),total:c.total,n:c.n,doc:JSON.parse(JSON.stringify(S))};
 var l=hist().filter(function(x){return !(x.at===it.at&&x.per===it.per&&x.total===it.total&&x.n===it.n)});l.unshift(it);
 try{localStorage.setItem(HKEY,JSON.stringify(l.slice(0,30)))}catch(_){}histUI()}
function histUI(){var h=keep?hist():[];
 $('histBtn').hidden=!h.length;$('histN').textContent=h.length?'('+h.length+'件)':'';$('hq').hidden=h.length<=6;drawHist()}
function drawHist(){var q=$('hq').value.trim(),h=hist().filter(function(x){return !q||(x.per+' '+x.title+' '+(x.doc.rows||[]).map(function(r){return r.n+' '+r.to}).join(' ')).indexOf(q)>=0});
 $('hlist').innerHTML=h.length?h.map(function(x){var d=x.at.split('-');
  return '<li><button type="button" class="hit" data-id="'+x.id+'"><span class="ty">'+(x.title==='交通費精算書'?'交通費':'経費')+'</span><span class="m"><b>'+esc(x.per||'(期間なし)')+'</b><small>'+(+d[1])+'/'+(+d[2])+'提出・'+x.n+'件</small></span><span class="v">'+yen(x.total)+'円</span></button>'+
  '<button type="button" class="ib hdel" data-del="'+x.id+'" aria-label="この履歴を削除">×</button></li>'}).join(''):'<li class="none">見つかりませんでした</li>'}

/* ---------- 入力候補(支払先・内容) ----------
 ブラウザ標準の候補(datalist)は、入っている文字に合う候補しか出さないため、「JR(Suica)」が入っていると他を選べない。
 自前の一覧にして、欄を押した時は全部の候補を出し、文字を打ったら絞り込む */
var SG={el:null,inp:null,all:[],typed:false};
function sgOpen(inp){var it=inp.closest('.kr');if(!it)return;var r=S.rows[+it.dataset.i];SG.inp=inp;SG.typed=false;SG.all=sugg(r.c,inp.dataset.sg);sgDraw()}
function sgDraw(){var inp=SG.inp;if(!inp)return;var q=SG.typed?inp.value.trim():'',a=SG.all.filter(function(v){return !q||v.indexOf(q)>=0}).filter(function(v){return v!==inp.value.trim()||!SG.typed});
 if(!SG.el){SG.el=document.createElement('div');SG.el.className='sg';SG.el.setAttribute('role','listbox');document.body.appendChild(SG.el);
  SG.el.addEventListener('mousedown',function(e){e.preventDefault()});
  SG.el.addEventListener('click',function(e){var b=e.target.closest('[data-v]');if(!b||!SG.inp)return;var t=SG.inp;t.value=b.dataset.v;t.dispatchEvent(new Event('input',{bubbles:true}));sgClose();
   var nx=t.dataset.sg==='n'?t.closest('.kr').querySelector('[data-sg=to]'):null;if(nx&&!nx.value)nx.focus()})}
 if(!a.length){sgClose(true);return}
 SG.el.innerHTML='<div class="sgh">'+(inp.dataset.sg==='to'?'支払先の候補':'前に入れた内容')+'</div>'+a.map(function(v){return '<button type="button" role="option" data-v="'+esc(v)+'"'+(v===inp.value.trim()?' class="on"':'')+'>'+esc(v)+'</button>'}).join('');
 var rc=inp.getBoundingClientRect();SG.el.style.cssText='left:'+(rc.left+window.scrollX)+'px;top:'+(rc.bottom+window.scrollY+4)+'px;width:'+Math.max(rc.width,180)+'px';SG.el.hidden=false;inp.setAttribute('aria-expanded','true')}
function sgClose(keepInp){if(SG.el)SG.el.hidden=true;if(SG.inp)SG.inp.setAttribute('aria-expanded','false');if(!keepInp)SG.inp=null}

/* ---------- 入力イベント ---------- */
var SF=['adv','date','per','no','memo'],MF=['name','dept','eno','co'];
function fill(){SF.forEach(function(k){$(k).value=S[k]});$('how').value=S.how;$('ttl').value=S.ttl;$('apv').value=S.apv;$('wareki').checked=!!S.wareki}
function z2h(v){return v.replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0)}).replace(/[，]/g,',').replace(/[－ー−]/g,'-')}
function fmtYen(el){var v=khYen(el.value);if(el.value.trim()&&v)el.value=yen(v).replace(/^-/,'-')}
function bind(){
 fill();
 SF.forEach(function(k){$(k).addEventListener('input',function(){if(k==='adv')this.value=z2h(this.value).replace(/[^0-9,]/g,'');S[k]=this.value;upd()})});
 $('adv').addEventListener('blur',function(){fmtYen(this);S.adv=this.value});
 MF.forEach(function(k){$(k).value=ME[k]||'';$(k).addEventListener('input',function(){ME[k]=this.value;upd()})});
 $('how').onchange=function(){S.how=this.value;upd()};
 $('ttl').onchange=function(){S.ttl=this.value;upd()};
 $('apv').onchange=function(){S.apv=this.value;upd()};
 $('date').onchange=function(){if(!this.value){this.value=S.date=today()}upd()};
 $('wareki').onchange=function(){S.wareki=this.checked;upd()};
 var R=$('rows');
 R.addEventListener('focusin',function(e){var t=e.target;if(t.dataset&&t.dataset.sg){sgOpen(t);if(t.value){t._sel=true;try{t.select()}catch(_){}setTimeout(function(){try{if(document.activeElement===t)t.select()}catch(_){}},30)}}});
 R.addEventListener('click',function(e){var t=e.target;if(t.dataset&&t.dataset.sg&&(SG.inp!==t||SG.el.hidden)){sgOpen(t);if(t.value)try{t.select()}catch(_){}}});
 R.addEventListener('mouseup',function(e){var t=e.target;if(t._sel){e.preventDefault();t._sel=false}});
 R.addEventListener('focusout',function(e){if(e.target.dataset&&e.target.dataset.sg)setTimeout(function(){if(SG.inp===e.target&&document.activeElement!==e.target)sgClose()},120)});
 R.addEventListener('keydown',function(e){if(e.key==='Escape'&&SG.inp)sgClose()});
 window.addEventListener('resize',function(){if(SG.inp)sgDraw()});
 R.addEventListener('input',function(e){var t=e.target,k=t.dataset.k,it=t.closest('.kr');if(!k||!it||t.type==='checkbox'||k==='cs'||k==='ps')return;
  if(k==='a')t.value=z2h(t.value).replace(/[^0-9,\-]/g,'');
  if(t.dataset.sg&&SG.inp===t&&e.isTrusted){SG.typed=true;sgDraw()}
  S.rows[+it.dataset.i][k]=t.value;upd()});
 R.addEventListener('focusout',function(e){var t=e.target;if(t.dataset&&t.dataset.k==='a'){fmtYen(t);var it=t.closest('.kr');if(it)S.rows[+it.dataset.i].a=t.value;upd()}});
 R.addEventListener('change',function(e){var t=e.target,it=t.closest('.kr');if(!it)return;var i=+it.dataset.i,r=S.rows[i],k=t.dataset.k;
  if(k==='d'){r.d=t.value;upd()}
  if(k==='ps'){if(t.value==='x'){r.po=true;r.p=''}else{r.po=false;r.p=t.value}drawRows();upd();if(r.po){var q=document.querySelector('.kr[data-i="'+i+'"] input[data-k=p]');if(q)q.focus()}}
  if(k==='cs'){if(t.value==='x'){r.co=true;r.c=''}else{r.co=false;r.c=t.value}
   if(r.c!==KH_TRAIN)r.rt=false;if(!r.rcT)r.rc=r.c!==KH_TRAIN;if(!r.po&&r.p&&payList(r.c).indexOf(r.p)<0)r.p='';
   drawRows();upd();var nx=document.querySelector('.kr[data-i="'+i+'"] '+(r.co?'input[data-k=c]':'input[data-k=a]'));if(nx&&(r.co||!khYen(r.a)))nx.focus()}});
 R.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var i=+b.closest('.kr').dataset.i;
  var r=S.rows[i];
  if(b.dataset.act==='rc'||b.dataset.act==='rt'){var k=b.dataset.act;r[k]=!r[k];if(k==='rc')r.rcT=true;b.classList.toggle('on',r[k]);b.setAttribute('aria-pressed',r[k]);
   if(k==='rt'){var a=b.closest('.kr').querySelector('[data-k=a]');a.placeholder=r.rt?'片道':'金額';if(r.rt&&!khYen(r.a))a.focus()}upd();return}
  if(b.dataset.act==='del'){S.rows.splice(i,1);drawRows();upd();return}
  if(S.rows.length>=MAXR){toast('1枚に入るのは'+MAXR+'行までです');return}
  var cp=JSON.parse(JSON.stringify(S.rows[i]));S.rows.splice(i+1,0,cp);drawRows();upd();
  var d=document.querySelector('.kr[data-i="'+(i+1)+'"] input[data-k=d]');if(d)d.focus();toast('行を複製しました。日付を直してください')});
 $('addRow').onclick=function(){if(S.rows.length>=MAXR){toast('1枚に入るのは'+MAXR+'行までです');return}
  var last=S.rows[S.rows.length-1]||{};S.rows.push(row(last.d||today(),last.co?'':last.c||''));var nw=S.rows[S.rows.length-1];if(last.p){nw.p=last.p;nw.po=!!last.po}if(last.co){var nr=S.rows[S.rows.length-1];nr.co=true;nr.c=last.c;nr.rc=true}
  drawRows();upd();var ns=document.querySelectorAll('#rows .kr');var f=ns[ns.length-1].querySelector('input[data-k=a]');if(f)f.focus()};
 $('keep').checked=keep;$('keep').onchange=function(){keep=this.checked;save();histUI();drawRows();toast(keep?'この端末に保存します':'保存を停止し、保存内容を消しました')};
 $('meSec').open=!ME.name;
 $('sw').onclick=function(e){var c=e.target.dataset.c;if(!c)return;ME.color=c;sw();upd()};
 function sw(){[].forEach.call($('sw').children,function(b){b.className=b.dataset.c===ME.color?'on':''})}sw();
 function fresh(){S=blank();save();location.reload()}
 $('reset').onclick=function(){if(confirm('明細・仮払金を消して、新しい精算書を作りますか？\n(申請する人の情報はそのまま残ります)'))fresh()};
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
  S=Object.assign(blank(),JSON.parse(JSON.stringify(x.doc)));S.date=today();fill();drawRows();$('hClose').onclick();upd();toast((x.per||'過去の精算書')+' の明細を読み込みました')};
 $('toPv').onclick=function(){$('pv').scrollIntoView({behavior:'smooth'})};
 window.addEventListener('resize',fit);
}
// PDFを直接ダウンロードする(スマホ・コンビニ印刷用)。ライブラリは押した時だけ読み込む
function load(src){return new Promise(function(ok,ng){if(document.querySelector('script[src="'+src+'"]'))return ok();var e=document.createElement('script');e.src=src;e.onload=ok;e.onerror=ng;document.head.appendChild(e)})}
function fname(){var c=khCalc(S.rows,S.adv),p=c.from?c.from.slice(0,7).replace('-',''):S.date.replace(/-/g,'');return khTitle(S.ttl,c)+(ME.name.trim()?'_'+ME.name.trim().replace(/\s+/g,''):'')+'_'+p}
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

/* ---------- 「こんな人・こんな時に」：例を入れて、画面の該当部分を光らせて案内 ---------- */
var tourOn=false;
(function(){
 function dd(n){var t=new Date();t.setDate(t.getDate()-n);return iso(t)}
 function R(d,c,n,to,a,o){var r=row(dd(d),c);r.n=n;r.to=to;r.a=a;if(o)Object.assign(r,o);return r}
 var SC={
  train:{t:'電車・バスで外出した人',rows:function(){return [R(6,KH_TRAIN,'客先訪問 新宿→渋谷','JR','178',{rt:true,p:'交通系IC'}),R(4,KH_TRAIN,'打ち合わせ 渋谷→品川','JR','178',{p:'交通系IC'}),R(1,KH_TRAIN,'セミナー参加 東京→横浜','JR','490',{rt:true,p:'切符(現金)'})]},steps:[
   ['rows','科目を<b>「旅費交通費」</b>にすると<b>「往復」</b>ボタンが出ます。押すと、片道の運賃が2倍で計算されます。支払方法は交通系IC・切符・クレジットカードなどから選べます。'],
   ['sum','これが、あなたが<b>受け取る金額</b>です。'],
   ['pv','全部が交通費なので、タイトルは自動で<b>「交通費精算書」</b>になります。PDFで保存して提出します。']]},
  buy:{t:'備品などを立て替えて買った人',rows:function(){return [R(5,'消耗品費','プリンターのインク','家電量販店','4,980',{p:'クレジットカード'}),R(3,'会議費','打ち合わせの飲み物','コンビニ','648',{p:'QRコード決済'}),R(1,'新聞図書費','業務で使う参考書','書店','2,420',{p:'現金'})]},steps:[
   ['rows','買った日・<b>科目</b>・<b>金額</b>を入れます。科目が分からない時は、ページ下の「科目の早見表」を見てください。'],
   ['sum','合計が、あなたが<b>受け取る金額</b>です。'],
   ['pv','<b>科目ごとの合計</b>も、自動で書類に入ります。']]},
  trip:{t:'仮払いを受けて出張した人',adv:'40,000',rows:function(){return [R(3,KH_TRAIN,'出張 東京→新大阪','新幹線','13,500',{rt:true,p:'クレジットカード',rc:true,rcT:true}),R(3,KH_TRAIN,'宿泊(大阪)','ホテル','8,800',{p:'クレジットカード',rc:true,rcT:true}),R(2,'会議費','取引先との打ち合わせ 飲み物','カフェ','1,200',{p:'タッチ決済'})]},steps:[
   ['adv','出張の前に受け取った<b>仮払金</b>を入れます。'],
   ['sum','使った金額が仮払金より少ない時は、<b>会社に返す金額</b>が出ます。多い時は、足りない分を受け取ります。'],
   ['pv','書類にも、合計・仮払金・差し引きの金額が入ります。']]},
  admin:{t:'会社の総務・経理の人',rows:function(){return [R(4,KH_TRAIN,'客先訪問 新宿→渋谷','JR','178',{rt:true,p:'交通系IC'}),R(2,'消耗品費','USBケーブル','家電量販店','1,280',{p:'現金'})]},steps:[
   ['doc','<b>承認欄の数</b>やタイトルを、会社のやり方に合わせて変えられます。'],
   ['me','所属・社員番号は<b>この端末に保存</b>され、次からは自動で入ります。'],
   ['pv','PDFで保存してメールで提出したり、印刷して承認のはんこを押したりできます。']]}
 };
 var TG={rows:function(){return $('secRows')},sum:function(){return $('sum')},adv:function(){return $('advBox')},doc:function(){return $('docBox')},me:function(){return $('meSec')},pv:function(){return $('pv').querySelector('.card')}};
 var cur=null,i=0,saved=null,ring,bub,shade;
 function snap(){return {S:JSON.stringify(S),adv:$('advBox').open,doc:$('docBox').open,me:$('meSec').open,y:window.scrollY}}
 function back(s){S=JSON.parse(s.S);$('advBox').open=s.adv;$('docBox').open=s.doc;$('meSec').open=s.me;fill();drawRows();render()}
 function el(cls){var e=document.createElement('div');e.className=cls;document.body.appendChild(e);return e}
 function start(k){var c=SC[k];if(!c)return;saved=snap();cur=c;i=0;tourOn=true;
  S=blank();S.rows=c.rows();S.adv=c.adv||'';$('advBox').open=!!c.adv;$('docBox').open=false;fill();drawRows();render();
  shade=el('tshade');ring=el('tring');bub=el('tbub');bub.setAttribute('role','dialog');bub.setAttribute('aria-label','使い方：'+c.t);
  document.addEventListener('keydown',key);window.addEventListener('resize',place);show()}
 function key(e){if(e.key==='Escape')end(false)}
 function show(){var st=cur.steps[i],n=cur.steps.length,last=i===n-1;
  if(st[0]==='doc')$('docBox').open=true;if(st[0]==='me')$('meSec').open=true;if(st[0]==='adv')$('advBox').open=true;fit();
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
  if(use){save();histUI();toast('この例の内容を入れました。書き換えて使えます');$('secRows').scrollIntoView({block:'start'})}
  else{back(saved);window.scrollTo(0,saved.y)}}
 window.KHTour=function(){[].forEach.call(document.querySelectorAll('.who [data-sc]'),function(b){b.onclick=function(){start(b.dataset.sc)}})};
})();

build();drawRows();bind();render();histUI();KHTour();if(window.SKShare)SKShare();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
