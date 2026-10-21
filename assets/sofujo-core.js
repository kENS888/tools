/* しごと計算ラボ 送付状 ロジック(宛名の敬称・時候の挨拶・文面・FAX枚数) */
// 月ごとの時候の挨拶(ビジネス文書の漢語調)。[日付の区切り, 区切り前, 区切り以降]。区切りは二十四節気(立春・入梅・立秋)など
var JIKOU={1:[8,'新春の候','厳寒の候'],2:[4,'晩冬の候','余寒の候'],3:[0,'早春の候'],4:[0,'陽春の候'],5:[0,'新緑の候'],6:[11,'初夏の候','梅雨の候'],
 7:[0,'盛夏の候'],8:[7,'盛夏の候','残暑の候'],9:[0,'初秋の候'],10:[0,'秋冷の候'],11:[0,'晩秋の候'],12:[0,'師走の候']};
function jikou(v){var p=String(v||'').split('-'),m=+p[1],d=+p[2],j=JIKOU[m];if(!j)return '';return j[0]&&d<j[0]?j[1]:(j[2]||j[1])}
function sfTrim(s){return String(s==null?'':s).replace(/^[\s　]+|[\s　]+$/g,'')}
// 宛名。会社名に担当者名を添える場合は「御中」を付けず、担当者に「様」を付ける(御中と様は併用しない)
// 宛名の欄に「御中」「様」まで入力された場合は、それを敬称として扱う(二重にしない)
function atena(to,hon,person){
 to=sfTrim(to);person=sfTrim(person).replace(/[\s　]*(様|殿|さん)$/,'');
 var m=to.match(/^(.*?)[\s　]*(御中|様|殿|各位)$/);if(m&&m[1]){to=m[1];hon=m[2]==='殿'?'様':m[2]}
 if(person)return {co:to,coH:'',ps:person,indiv:!to};
 hon=hon==null?'御中':hon;return {co:to,coH:hon,ps:'',indiv:hon==='様'}}
// 本文。kind: jikou(拝啓＋時候) / jika(拝啓＋時下) / kinkei(謹啓＋時候) / none(頭語なし)
// indiv：個人宛(「貴社」「ご清栄」ではなく「ご清祥」)、fax：FAXで送る、body：本文(用件)を書き換える場合
function letter(kind,date,indiv,fax,body){
 var send=fax?'送信いたします':'お送りいたします',z={formal:kind!=='none',close:''};
 if(kind==='none'){z.p1='いつも大変お世話になっております。';z.p2='下記のとおり書類を'+send+'。ご査収のほど、よろしくお願いいたします。'}
 else{var hd=kind==='kinkei'?'謹啓':'拝啓',ki=kind==='jika'?'時下':jikou(date)+'、',who=indiv?'':'貴社',
  sei=indiv?'ご清祥':kind==='kinkei'?'ご隆盛':'ご清栄';
  z.p1=hd+'　'+ki+who+'ますます'+sei+'のこととお慶び申し上げます。平素は格別のご高配を賜り、厚く御礼申し上げます。';
  z.p2='さて、下記の書類を'+send+'ので、ご査収くださいますようお願い申し上げます。';z.close=kind==='kinkei'?'謹白':'敬具'}
 body=sfTrim(body);if(body)z.p2=body;return z}
// FAXの送信枚数(この送付状を含む)。手入力があればそれを使い、なければ「枚」で入れた書類から計算する。数えられない時は0(手書き欄)
function faxPages(rows,pages){var p=parseInt(String(pages||'').replace(/[０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0)}).replace(/[^0-9]/g,''),10);
 if(p>0)return p;var r=(rows||[]).filter(function(x){return sfTrim(x.n)});if(!r.length)return 0;var n=1;
 for(var i=0;i<r.length;i++){var q=parseInt(r[i].q,10);if(r[i].u!=='枚'||!(q>0))return 0;n+=q}return n}
if(typeof module!=='undefined')module.exports={JIKOU:JIKOU,jikou:jikou,atena:atena,letter:letter,faxPages:faxPages};
