/* しごと計算ラボ 書類作成ツール 計算ロジック(見積書・納品書・請求書・領収書 共通) */
var RATE={'10':0.1,'8':0.08,'0':0};
// 端数処理。負の値(値引き)は絶対値で処理して符号を戻す
function rnd(v,m){var s=v<0?-1:1,a=Math.round(Math.abs(v)*1e6)/1e6;
 var r=m==='ceil'?Math.ceil(a):m==='round'?Math.round(a):Math.floor(a);return s*r||0}
function lineAmt(q,p,m){return rnd((+q||0)*(+p||0),m)}
// 源泉徴収税(報酬・料金)
function wh(b){if(b<=0)return 0;return b<=1000000?Math.floor(b*0.1021):Math.floor((b-1000000)*0.2042)+102100}
// 税率のキー。'10','8','0'(対象外)、その他は入力した%(例 '5')
function rkey(x){if(x.r==='x'){var v=Math.round((parseFloat(x.xr)||0)*100)/100;return v>0?String(v):'0'}return RATE[x.r]!=null?x.r:'10'}
// rows:[{q,p,r,xr,nw}] nw=源泉の対象外
// o:{incl:税込単価か, rnd:端数, noTax:消費税を加算しない, wOn:源泉, fee:振込手数料}
function calc(rows,o){
 var g={},wg={},lines=[];
 rows.forEach(function(x){var a=lineAmt(x.q,x.p,o.rnd),k=rkey(x);lines.push(a);g[k]=(g[k]||0)+a;if(!x.nw)wg[k]=(wg[k]||0)+a});
 var keys=Object.keys(g).sort(function(a,b){return parseFloat(b)-parseFloat(a)});
 var base={},tax={},sub=0,ct=0,wb=0;
 keys.forEach(function(k){var r=parseFloat(k)/100,t=0;
  if(r>0&&!o.noTax)t=o.incl?rnd(g[k]*r/(1+r),o.rnd):rnd(g[k]*r,o.rnd);
  tax[k]=t;base[k]=o.incl?g[k]-t:g[k];sub+=base[k];ct+=t;
  if(wg[k])wb+=wg[k]===g[k]?base[k]:Math.floor(base[k]*wg[k]/g[k])});
 var total=sub+ct,w=o.wOn?wh(wb):0,fee=o.fee||0;
 return {lines:lines,keys:keys,gross:g,base:base,tax:tax,sub:sub,ct:ct,total:total,wb:wb,w:w,fee:fee,pay:total-w-fee};
}
// 印紙税(第17号の1文書 売上代金の受取書)
var DUTY=[[1e6,200],[2e6,400],[3e6,600],[5e6,1000],[1e7,2000],[2e7,4000],[3e7,6000],[5e7,10000],[1e8,20000],[2e8,40000],[3e8,60000],[5e8,100000],[1e9,150000],[Infinity,200000]];
function duty(a){if(a<50000)return 0;for(var i=0;i<DUTY.length;i++)if(a<=DUTY[i][0])return DUTY[i][1]}
// 消費税額を領収書に記載しているので、判定は税抜の金額で行う
function stamp(c,o){var amt=Math.max(0,c.pay-c.ct);
 if(o.elec)return {duty:0,amt:amt,why:'elec'};
 if(o.pay==='card')return {duty:0,amt:amt,why:'card'};
 var d=duty(amt);return {duty:d,amt:amt,why:d?'need':'under'}}
// 和暦(令和・平成)
function wareki(v){if(!v)return '';var p=v.split('-'),y=+p[0],m=+p[1],d=+p[2],n=y*10000+m*100+d,e,yy;
 if(n>=20190501){e='令和';yy=y-2018}else if(n>=19890108){e='平成';yy=y-1988}else{e='昭和';yy=y-1925}
 return e+(yy===1?'元':yy)+'年'+m+'月'+d+'日'}
if(typeof module!=='undefined')module.exports={rnd:rnd,lineAmt:lineAmt,wh:wh,rkey:rkey,calc:calc,duty:duty,stamp:stamp,wareki:wareki};
