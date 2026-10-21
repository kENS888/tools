/* しごと計算ラボ 書類作成ツール 計算ロジック(見積書・請求書・領収書 共通) */
var RATE={'10':0.1,'8':0.08,'0':0};
// 端数処理。負の値(値引き)は絶対値で処理して符号を戻す
function rnd(v,m){var s=v<0?-1:1,a=Math.round(Math.abs(v)*1e6)/1e6;
 var r=m==='ceil'?Math.ceil(a):m==='round'?Math.round(a):Math.floor(a);return s*r||0}
function lineAmt(q,p,m){return rnd((+q||0)*(+p||0),m)}
// 源泉徴収税(報酬・料金)
function wh(b){if(b<=0)return 0;return b<=1000000?Math.floor(b*0.1021):Math.floor((b-1000000)*0.2042)+102100}
// rows:[{q,p,r}] o:{incl:税込単価か, rnd:端数, wOn:源泉}
function calc(rows,o){
 var g={'10':0,'8':0,'0':0},lines=[];
 rows.forEach(function(x){var a=lineAmt(x.q,x.p,o.rnd);lines.push(a);g[RATE[x.r]!=null?x.r:'10']+=a});
 var base={},tax={},sub=0,ct=0;
 ['10','8','0'].forEach(function(k){var t=0;
  if(k!=='0')t=o.incl?rnd(g[k]*RATE[k]/(1+RATE[k]),o.rnd):rnd(g[k]*RATE[k],o.rnd);
  tax[k]=t;base[k]=o.incl?g[k]-t:g[k];sub+=base[k];ct+=t});
 var total=sub+ct,w=o.wOn?wh(sub):0;
 return {lines:lines,gross:g,base:base,tax:tax,sub:sub,ct:ct,total:total,w:w,pay:total-w};
}
// 印紙税(第17号の1文書 売上代金の受取書)
var DUTY=[[1e6,200],[2e6,400],[3e6,600],[5e6,1000],[1e7,2000],[2e7,4000],[3e7,6000],[5e7,10000],[1e8,20000],[2e8,40000],[3e8,60000],[5e8,100000],[1e9,150000],[Infinity,200000]];
function duty(a){if(a<50000)return 0;for(var i=0;i<DUTY.length;i++)if(a<=DUTY[i][0])return DUTY[i][1]}
// 消費税額を領収書に記載しているので、判定は税抜の金額で行う
function stamp(c,o){var amt=Math.max(0,c.pay-c.ct);
 if(o.elec)return {duty:0,amt:amt,why:'elec'};
 if(o.pay==='card')return {duty:0,amt:amt,why:'card'};
 var d=duty(amt);return {duty:d,amt:amt,why:d?'need':'under'}}
if(typeof module!=='undefined')module.exports={rnd:rnd,lineAmt:lineAmt,wh:wh,calc:calc,duty:duty,stamp:stamp};
