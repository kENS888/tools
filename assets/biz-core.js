/* しごと計算ラボ 営業日・祝日の計算ロジック(営業日・支払期日、日割り計算で共有) */
var BIZ=(function(){
 var MS=86400000;
 function D(y,m,d){return new Date(Date.UTC(y,m-1,d))}
 function key(t){return t.toISOString().slice(0,10)}
 function parse(s){var m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s||'');if(!m)return null;var t=D(+m[1],+m[2],+m[3]);return key(t)===(m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2))?t:null}
 function add(t,n){return new Date(t.getTime()+n*MS)}
 function lastDay(y,m){return D(y,m+1,0).getUTCDate()}
 function nthMon(y,m,n){var w=D(y,m,1).getUTCDay();return 1+((8-w)%7)+(n-1)*7}
 function eq(y,spring){var x=(spring?20.8431:23.2488)+0.242194*(y-1980)-Math.floor((y-1980)/4);return Math.floor(x)}
 var cache={};
 // 2020〜2099年の祝日(祝日法に基づく計算。特例は2020・2021年の東京五輪の移動)
 function holidays(y){
  if(cache[y])return cache[y];
  var h={};function s(m,d,n){h[key(D(y,m,d))]=n}
  if(y<2020||y>2099){cache[y]=h;return h}
  s(1,1,'元日');s(1,nthMon(y,1,2),'成人の日');s(2,11,'建国記念の日');s(2,23,'天皇誕生日');
  s(3,eq(y,true),'春分の日');s(4,29,'昭和の日');s(5,3,'憲法記念日');s(5,4,'みどりの日');s(5,5,'こどもの日');
  if(y===2020){s(7,23,'海の日');s(7,24,'スポーツの日');s(8,10,'山の日')}
  else if(y===2021){s(7,22,'海の日');s(7,23,'スポーツの日');s(8,8,'山の日')}
  else{s(7,nthMon(y,7,3),'海の日');s(8,11,'山の日');s(10,nthMon(y,10,2),'スポーツの日')}
  s(9,nthMon(y,9,3),'敬老の日');s(9,eq(y,false),'秋分の日');s(11,3,'文化の日');s(11,23,'勤労感謝の日');
  // 国民の休日(祝日に挟まれた平日)
  var ks=Object.keys(h).sort();
  ks.forEach(function(k){var t=parse(k),n2=key(add(t,2));if(h[n2]&&!h[key(add(t,1))])h[key(add(t,1))]='国民の休日'});
  // 振替休日(日曜の祝日の後の、最初の祝日でない日)
  Object.keys(h).sort().forEach(function(k){var t=parse(k);if(t.getUTCDay()===0&&h[k]!=='振替休日'){var u=add(t,1);while(h[key(u)])u=add(u,1);h[key(u)]='振替休日'}});
  cache[y]=h;return h;
 }
 function holName(t){return holidays(t.getUTCFullYear())[key(t)]||''}
 // cfg:{sat,sun,hol,ny:'none'|'bank'|'gov',extra:{'YYYY-MM-DD':1}}
 function offReason(t,cfg){
  var w=t.getUTCDay(),m=t.getUTCMonth()+1,d=t.getUTCDate();
  if(cfg.extra&&cfg.extra[key(t)])return '指定の休日';
  if(cfg.hol!==false){var n=holName(t);if(n)return n}
  if(cfg.ny==='bank'&&((m===12&&d===31)||(m===1&&d<=3)))return '年末年始';
  if(cfg.ny==='gov'&&((m===12&&d>=29)||(m===1&&d<=3)))return '年末年始';
  if(w===0&&cfg.sun!==false)return '日曜';
  if(w===6&&cfg.sat!==false)return '土曜';
  return '';
 }
 function isOff(t,cfg){return !!offReason(t,cfg)}
 // n営業日後(n<0なら前)。startCount=trueなら開始日(営業日なら)を1日目と数える
 function addBiz(t,n,cfg,startCount){
  if(n===0)return t;var dir=n>0?1:-1,left=Math.abs(n),u=t,g=0;
  if(startCount&&!isOff(t,cfg)){left--;if(left===0)return t}
  while(left>0&&g++<20000){u=add(u,dir);if(!isOff(u,cfg))left--}
  return u;
 }
 // 期間(両端を含む)の営業日数など
 function countBiz(a,b,cfg){
  if(a>b){var x=a;a=b;b=x}
  var biz=0,cal=0,off=[],u=a,g=0;
  while(u<=b&&g++<40000){cal++;var r=offReason(u,cfg);if(r)off.push({d:u,r:r});else biz++;u=add(u,1)}
  return {biz:biz,cal:cal,off:off};
 }
 function adjust(t,mode,cfg){var u=t,g=0;if(mode==='none')return t;var dir=mode==='prev'?-1:1;while(isOff(u,cfg)&&g++<400)u=add(u,dir);return u}
 // 締め日(close:0=末日、1〜28)を基準日から求める
 function closeOf(t,close){var y=t.getUTCFullYear(),m=t.getUTCMonth()+1;
  if(close===0)return D(y,m,lastDay(y,m));
  if(t.getUTCDate()<=close)return D(y,m,close);
  return D(y,m+1,close)}
 // rule:{close,type:'m'|'d',mon,day(0=末日),days,adj:'prev'|'next'|'none'}
 function dueFromClose(c,rule,cfg){
  var raw;
  if(rule.type==='d')raw=add(c,rule.days||0);
  else{var y=c.getUTCFullYear(),m=c.getUTCMonth()+1+(rule.mon||0),f=D(y,m,1);y=f.getUTCFullYear();m=f.getUTCMonth()+1;
   raw=D(y,m,rule.day===0?lastDay(y,m):Math.min(rule.day,lastDay(y,m)))}
  var due=adjust(raw,rule.adj,cfg);
  return {close:c,raw:raw,due:due,moved:due.getTime()!==raw.getTime(),reason:offReason(raw,cfg),before:raw<c};
 }
 function due(t,rule,cfg){return dueFromClose(closeOf(t,rule.close),rule,cfg)}
 // 基準日を含む締めから、n回分の支払予定
 function schedule(t,rule,cfg,n){var out=[],c=closeOf(t,rule.close);
  for(var i=0;i<n;i++){out.push(dueFromClose(c,rule,cfg));var y=c.getUTCFullYear(),m=c.getUTCMonth()+2,f=D(y,m,1);y=f.getUTCFullYear();m=f.getUTCMonth()+1;
   c=D(y,m,rule.close===0?lastDay(y,m):rule.close)}
  return out}
 function days(a,b){return Math.round((b-a)/MS)}
 return {D:D,key:key,parse:parse,add:add,days:days,holidays:holidays,holName:holName,offReason:offReason,isOff:isOff,addBiz:addBiz,countBiz:countBiz,adjust:adjust,closeOf:closeOf,due:due,schedule:schedule};
})();
if(typeof module!=='undefined')module.exports=BIZ;
