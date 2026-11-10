import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import {loadCore} from './load-core.mjs';
const html=readFileSync(new URL('../kabu-shinkoku/index.html',import.meta.url),'utf8');
const C=loadCore(new URL('../kabu-shinkoku/index.html',import.meta.url));
// 指示の区分から独立した期待値を作る。context/resolve は使わない。
const stocks=[{answers:[0],value:'nisa',ids:['Q1']},{answers:[2,0],value:'nisa',ids:['Q1','H1']}];
for(const [prefix,ids] of [[[1],['Q1']],[[2,1],['Q1','H1']]])for(const [account,accountIds,withheld,both] of [[[0],['Q2'],true,false],[[1],['Q2'],false,false],[[2],['Q2'],false,true],[[3,0],['Q2','H2'],true,false],[[3,1],['Q2','H2'],false,false],[[3,2],['Q2','H2'],false,true]]){
 for(let a=0;a<(withheld?2:4);a++)stocks.push({answers:[...prefix,...account,a],ids:[...ids,...accountIds,withheld?'Q3a':'Q3b'],value:withheld?'withheld':['zero','low','high','loss'][a],loss:withheld?a===1:a===3,gain:withheld?a===0:a===1||a===2,both});
}
const names=['stock','foreign','crypto','fx','side'],ids=['Q1','FOREIGN','CRYPTO','FX','SIDE'];
const categories=[null,['zero','loss','low','high'],['zero','loss','low','high'],['zero','loss','low','high'],['zero','low','high']];
const prefixes=new Map();let combinations=0,routes=0;
// 根拠表 R1-c・R4-d の組み合わせを期待値側で列挙する。
function deductible(s){const v=s.values;return names.filter(k=>['low','high'].includes(v[k])&&((k==='side'&&v.crypto==='loss')||(k==='stock'&&v.foreign==='loss')||(k==='foreign'&&v.stock==='loss')))}
function needsTotal(s){const vs=Object.values(s.values);return deductible(s).some(k=>s.values[k]==='high')||(vs.filter(v=>v==='low').length>=2&&!vs.includes('high'))}
function scenarios(mask){
 let out=[{path:[mask],values:{},ids:[],stock:{}}];
 for(let i=0;i<5;i++)if(mask&(1<<i)){
  const choices=i===0?stocks:categories[i].map((v,a)=>({answers:[a],value:v,ids:[ids[i]]}));
  out=out.flatMap(s=>choices.map(c=>({path:[...s.path,...c.answers],values:{...s.values,[names[i]]:c.value},ids:[...s.ids,...c.ids],stock:i===0?c:s.stock})));
 }
 return out.flatMap(s=>needsTotal(s)?[false,true].map(high=>({...s,path:[...s.path,high?1:0],ids:[...s.ids,'Q5'],totalHigh:high,totalAnswered:true})):[s]);
}
for(let mask=0;mask<32;mask++)test('収入チェック='+mask+' 全回答×合計×追加条件16通り×配当3通り',()=>{
 for(const s of scenarios(mask)){
  routes++;const vs=Object.values(s.values),positive=vs.some(v=>v==='low'||v==='high');
  const remainingHigh=names.filter(k=>s.values[k]==='high'&&!(s.totalAnswered&&!s.totalHigh&&deductible(s).includes(k)));
  const baseNeed=remainingHigh.length>0||!!s.totalHigh;
  const baseBetter=!!s.stock.loss||s.values.fx==='loss'||(s.values.foreign==='loss'&&s.values.stock==='withheld'&&!!s.stock.gain);
  for(let n=1;n<=s.path.length;n++){
   const prefix=s.path.slice(0,n),key=prefix.join(','),id=s.ids[n-1]||'RESULT',remaining=s.path.length-n;
   const p=prefixes.get(key);if(p){assert.equal(p.id,id);p.remaining=Math.max(p.remaining,remaining)}else prefixes.set(key,{path:prefix,id,remaining});
  }
  for(let extra=0;extra<16;extra++)for(const low of [true,false,undefined]){
   combinations++;const e={highSalary:!!(extra&1),planned:!!(extra&2),carried:!!(extra&4),dividend:!!(extra&8),dividendLow:low};
   const before=JSON.stringify({path:s.path,e}),r=C.resolve(s.path,e),need=baseNeed||e.highSalary||(e.planned&&positive),better=baseBetter||e.carried||(e.dividend&&low===true);
   assert.equal(r.kind,need?'need':better?'better':'none',JSON.stringify({s,e,r}));
   assert.equal(r.resident,r.kind==='none'&&positive&&!e.planned,'所得税の申告をしない黒字だけ住民税');
   assert.equal(r.notes.some(n=>n.includes('住民税')),r.resident||(r.kind==='better'&&positive&&!e.planned),'得で黒字がある時は、申告しない場合の住民税の注記');
   assert.equal(r.oneStop,r.kind!=='none'||e.planned);
   assert.equal(r.filing,r.kind!=='none'||e.planned);
   if(remainingHigh.length&&!e.highSalary)for(const k of remainingHigh)assert.ok(r.reason.includes(({stock:'株(源泉なし)',foreign:'海外の証券会社の株',crypto:'暗号資産',fx:'FX',side:'副業'})[k]));
   if(e.planned)assert.equal(r.title||C.labels[r.kind],(positive||e.highSalary)?C.labels.need:r.kind==='none'?'給料のほかのもうけは、申告に含めなくてよい見込み':C.labels[r.kind]);
   if(s.stock.loss||(s.values.foreign==='loss'&&s.stock.gain)){
    assert.ok(!r.notes.some(n=>n.includes('含めなくてよい')));
    assert.ok(!(r.title||C.labels[r.kind]).includes('含めなくてよい'));
    assert.equal(r.notes.includes('損と差し引くなら、源泉ありの口座の分も申告に含めます'),s.values.stock==='withheld'||!!s.stock.both);
   }
   if(r.resident){assert.equal(r.title,'所得税の申告は不要の見込み');assert.ok(r.notes.some(n=>n.includes('20万円以下')&&n.includes('住民税にはない')))}
   if(e.highSalary)assert.ok(r.notes.some(n=>n.includes('税金が戻る人は申告の義務はありません')));
   if(e.dividend)assert.ok(r.notes.includes('J-REIT・外国株などは配当控除の対象外です'));
   if(s.totalAnswered&&deductible(s).length)assert.ok(r.refs.includes(s.values.crypto==='loss'&&deductible(s).includes('side')?'R1-c':'R4-d'));
   if(s.values.crypto==='loss'){
    assert.ok(r.notes.includes('暗号資産の損は、給料や株のもうけと差し引けません'));
    assert.equal(r.notes.some(n=>n.includes('副業(雑所得)')),!s.totalAnswered&&['low','high'].includes(s.values.side));
   }
   if(s.values.fx==='loss'){assert.ok(r.notes.some(n=>n.includes('3年繰り越す')));assert.ok(r.notes.some(n=>n.includes('海外FXなどは繰り越しできない場合があります')))}
   if(s.stock.loss)assert.ok(r.notes.includes('繰り越せるのは上場株式・公募の投資信託などの損です'));
   if(e.dividend&&need)for(const ref of ['10-c','10-h','10-i'])assert.ok(r.refs.includes(ref));
   assert.ok(r.refs.length&&r.refs.every(k=>C.sourceMap[k]?.url),'出典定義あり');
   assert.equal(JSON.stringify({path:s.path,e}),before,'純粋関数');
  }
 }
});
test('全行き先・あと◯問までは独立して列挙した最長の残りと一致',()=>{
 const reached=new Set();
 for(const p of prefixes.values()){
  assert.equal(C.destination(p.path),p.id,'行き先 '+p.path);assert.equal(C.remaining(p.path),p.remaining,'残り最長 '+p.path);reached.add(p.id);
  if(p.id==='Q5'){
   const node=C.question(p.path),s={values:C.context(p.path).values},loss=deductible(s).length>0,high=deductible(s).some(k=>s.values[k]==='high');
   assert.ok(node.summary.startsWith('あなたの答え:'));
   assert.equal(node.question,high?'損した分を差し引いても、20万円より多い?':loss?'損を差し引いて、合わせると20万円より多い?':'合わせると20万円より多い?');
   assert.equal(node.hint,loss?'差し引けるのは、暗号資産の損と副業、株どうしだけです':'20万円は、全部を合わせた枠です');
  }
 }
 assert.equal(C.destination([]),'SELECT');assert.equal(C.remaining([]),0);
 assert.deepEqual([...reached].sort(),[...Object.keys(C.flow),'RESULT'].sort());
 console.log('判定検査: '+routes+'経路 / '+combinations+'組み合わせ / '+prefixes.size+'途中状態');
});
test('どれもない・暗号資産損・FX損・国内株と海外損の境界',()=>{
 assert.equal(C.resolve([0]).kind,'none');assert.equal(C.resolve([0]).reason,'給料のほかの所得がないため');
 assert.equal(C.resolve([4,1]).kind,'none');assert.equal(C.resolve([8,1]).kind,'better');
 assert.equal(C.resolve([3,1,0,0,1]).kind,'better');assert.equal(C.resolve([3,0,1]).kind,'none','NISAと海外損は得にしない');
 assert.equal(C.destination([20,1,2]),'Q5');assert.equal(C.resolve([20,1,2,0]).kind,'none');assert.equal(C.resolve([20,1,2,1]).kind,'need');assert.equal(C.destination([12,2,2]),'Q5');
 assert.equal(C.destination([3,1,1,2,1]),'Q5','源泉なし株の高い利益と海外損');
 assert.equal(C.resolve([3,1,1,2,1,0]).kind,'none','海外損と源泉なしだけなら得にしない');
 assert.equal(C.resolve([3,1,1,2,1,1]).kind,'need');
 assert.equal(C.resolve([28,1,3,2,0]).kind,'need','差し引けないFXの高い利益は残す');
});
test('不正・途中の回答を拒否、配当の既存計算を保持',()=>{
 for(const path of [[],[1],[4],[3,1]])assert.throws(()=>C.resolve(path),/完了/);
 for(const path of [[32],[-1],['0'],[0,0],[4,9],null])assert.throws(()=>C.resolve(path));
 assert.equal(C.salaryBoundary(),11200000);assert.equal(C.taxableEstimate(11200000),6950000);assert.equal(C.dividendSalaryLimit,11200000);
 for(const m of html.matchAll(/<tr data-rate="([^"]+)"><td>[^<]+<\/td><td>約([0-9.]+)%/g))assert.equal((C.dividendRate(Number(m[1]))*100).toFixed(1),m[2]);
});
test('FAQ一致・ページ内リンク・JS構文・掲載名と出典',()=>{
 const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=ld['@graph'].find(x=>x['@type']==='FAQPage').mainEntity;
 const text=[...html.matchAll(/<details><summary><span>(.*?)<\/span><\/summary><p>(.*?)<\/p>/g)].map(m=>[m[1],m[2]]);
 assert.equal(faq.length,9);assert.deepEqual(text,faq.map(q=>[q.name,q.acceptedAnswer.text]));
 for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('application/ld+json'))new vm.Script(m[2]);
 for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(html.includes('id="'+m[1]+'"'));
 for(const t of ['当てはまるものを押すと、答えが変わります','NISA以外で受け取った国内株の配当がある','2027年2月16日〜3月15日','https://www.keisan.nta.go.jp/','prefers-reduced-motion:no-preference','@media(hover:hover)','確認日 2026-11-10','いくつでも選べます','aria-pressed','ふるさと納税のワンストップ特例','始まる年は国税庁の案内で確かめてください'])assert.ok(html.includes(t),t);
 for(const t of ['R1-b','R1-c','R1-d','R1-g','R1-h','R2-c','R3-a','R4-a','R4-d','R5-c','R6-a'])assert.ok(C.sourceMap[t]?.url&&html.includes(t));
 assert.match(html,/#ks-card #ks-answer\{[^}]*font-size:[^;]*!important/);assert.doesNotMatch(html,/202[78]年分から|okinawa|最大5問|副業のもうけもある\?/);
 assert.ok(html.includes("H1:{question:'口座は、NISAだけだった?'"));assert.ok(html.includes("H2:{question:'口座の『源泉徴収』は、どうなっていた?'"));
 assert.ok(html.includes('副業(自分の物をフリマで売っただけは除く)'));assert.ok(html.includes('前の年からの株やFXの損を繰り越している'));
 assert.ok(C.flow.CRYPTO.moreHint.includes('年間取引報告書'));assert.match(html,/@media\(hover:hover\)\{#ks-tool button:hover\{border-color:var\(--acc\)\}\}/);
 const title='会社員の確定申告は必要?株・暗号資産・FX・副業をまとめて判定(令和8年分)';assert.ok(html.includes('<h1>'+title+'</h1>'));assert.equal(ld['@graph'][0].name,title);
 for(const p of ['../index.html','../404.html','../llms.txt']){const s=readFileSync(new URL(p,import.meta.url),'utf8');assert.ok(s.includes('会社員の確定申告判定'));assert.doesNotMatch(s,/株・配当の(?:確定申告|申告)判定/)}
 for(const dir of readdirSync(new URL('../',import.meta.url),{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.name.startsWith('.')&&!['assets','tests','output','kabu-shinkoku'].includes(x.name))){
  let s;try{s=readFileSync(new URL('../'+dir.name+'/index.html',import.meta.url),'utf8')}catch{continue}
  if(s.includes('/kabu-shinkoku/')){assert.doesNotMatch(s,/株・配当の(?:確定申告|申告)判定/);assert.ok(s.includes('株・暗号資産・FX・副業をまとめて判定'))}
 }
});

test('UI回帰:初期描画・全32チェック・次へ・戻る・判定・追加条件・やり直すをDOM上で実行',()=>{
 // ブラウザ検査を置き換えない。描画時の例外と操作配線の取りこぼしを検出する。
 let doc;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.disabled=false;this.parentElement=null;this.ownText=''}
  set textContent(t){this.children=[];this.ownText=String(t)}get textContent(){return this.ownText+this.children.map(x=>typeof x==='string'?x:x.textContent).join('')}
  set innerHTML(t){this.children=[];this.ownText=''}
  append(...children){for(const child of children){if(typeof child!=='string'){child.remove();child.parentElement=this}this.children.push(child)}}
  remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(x=>x!==this);this.parentElement=null}}
  replaceChildren(){for(const x of this.children)if(typeof x!=='string')x.parentElement=null;this.children=[];this.ownText=''}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}
  descendants(){return [this,...this.children.filter(x=>typeof x!=='string').flatMap(x=>x.descendants())]}
  querySelector(s){return this.descendants().find(x=>x.tagName===s.toUpperCase())||null}
  focus(){doc.activeElement=this}getBoundingClientRect(){return {top:10,bottom:100}}scrollIntoView(){}
  click(){if(!this.disabled)this.onclick?.()}
 }
 const root=new Element('body');
 doc={activeElement:null,createElement:t=>new Element(t),getElementById:id=>root.descendants().find(e=>e.id===id)||null};
 for(const id of ['ks-tool','ks-progress','ks-card','ks-back','ks-restart','ks-scope-button','ks-scope']){const e=new Element(id.includes('button')||['ks-back','ks-restart'].includes(id)?'button':'div');e.id=id;root.append(e)}
 const core={};vm.createContext(core);vm.runInContext(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1],core);
 const ctx=vm.createContext({CORE:core.CORE,document:doc,innerHeight:844});
 const ui=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')&&!m[1].includes('application/ld+json')&&!m[1].includes('id="core"')).at(-1)[2];
 vm.runInContext(ui,ctx);
 const get=id=>doc.getElementById(id),card=()=>get('ks-card'),buttons=()=>card().descendants().filter(e=>e.tagName==='BUTTON');
 const income=k=>buttons().find(e=>e.dataset.income===k),extra=k=>buttons().find(e=>e.dataset.extra===k);
 const answers=()=>buttons().filter(e=>e.className==='ks-answer'&&!e.dataset.income);
 for(let mask=1;mask<32;mask++){
  assert.equal(get('ks-question').textContent,'給料のほかに、お金が入ってくるものは?');assert.equal(get('ks-progress').hidden,true);assert.equal(get('ks-next-button').disabled,true);
  for(let i=0;i<5;i++)if(mask&(1<<i))income(names[i]).click();assert.equal(get('ks-next-button').disabled,false);
  get('ks-next-button').click();assert.equal(get('ks-question').textContent,C.question([mask]).question);get('ks-back').click();
  for(let i=0;i<5;i++)assert.equal(income(names[i]).getAttribute('aria-pressed'),String(!!(mask&(1<<i))));
  get('ks-next-button').click();const path=[mask];
  while(C.destination(path)!=='RESULT'){
   const node=C.question(path);assert.equal(get('ks-question').textContent,node.question);assert.equal(get('ks-progress').textContent,'あと'+C.remaining(path)+'問まで');
   answers()[0].click();path.push(0);
  }
  assert.equal(get('ks-answer').textContent,(C.resolve(path).title||C.labels[C.resolve(path).kind]));extra('planned').click();assert.ok(get('ks-next').textContent.includes('寄附も申告書に書いてください'));assert.ok(get('ks-next').textContent.includes('2027年2月16日〜3月15日'));assert.ok(get('ks-next').descendants().some(x=>x.href==='https://www.keisan.nta.go.jp/'));
  get('ks-restart').click();
 }
 answers().find(e=>e.textContent==='どれもない(給料だけ)').click();assert.equal(get('ks-reason').textContent,'給料のほかの所得がないため');get('ks-restart').click();
 for(const path of [[20,1,2,0],[20,1,2,1],[3,1,1,2,1,0],[3,1,1,2,1,1],[4,3],[4,1],[5,1,1,1,2,1],[8,1],[3,1,0,0,1],[31,0,0,1,2,1,0]]){
  for(let i=0;i<5;i++)if(path[0]&(1<<i))income(names[i]).click();get('ks-next-button').click();
  for(let n=1;n<path.length;n++){assert.equal(get('ks-question').textContent,C.question(path.slice(0,n)).question);answers()[path[n]].click()}
  assert.equal(get('ks-answer').textContent,(C.resolve(path).title||C.labels[C.resolve(path).kind]));extra('dividend').click();
  if(C.resolve(path).kind!=='need'&&!C.context(path).stockLoss){assert.equal(get('ks-question').textContent,'年収はだいたい1,120万円以下?');answers()[0].click()}
  assert.equal(get('ks-answer').textContent,(C.resolve(path,{dividend:true,dividendLow:true}).title||C.labels[C.resolve(path,{dividend:true,dividendLow:true}).kind]));get('ks-restart').click();
 }
});
