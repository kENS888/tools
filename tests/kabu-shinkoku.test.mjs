import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadCore} from './load-core.mjs';
const html=readFileSync(new URL('../kabu-shinkoku/index.html',import.meta.url),'utf8');
const C=loadCore(new URL('../kabu-shinkoku/index.html',import.meta.url));
// 監査の仕様から定義。実装の行き先・context関数から期待値を作らない。
const expected={Q1:['SA','Q2','H1'],H1:['SA','Q2'],Q2:['Q3a','Q3b','Q3b','H2'],H2:['Q3a','Q3b','Q3b'],Q3a:['SB','SE'],Q3b:['SZ','Q4','D','SE'],Q4:['C','Q5'],Q5:['C','D'],SA:['A','A','D'],SB:['B','B','D'],SE:['E','E','D'],SZ:['B','B','D']};
const kinds={A:'none',B:'none',C:'none',D:'need',E:'better'},paths=[];
function walk(id='Q1',path=[],c={side:0,stock:false,both:false,zero:false},ancestors=[]){
 assert.ok(!ancestors.includes(id),'循環なし');
 if(kinds[id]){paths.push({id,path,c});return}
 assert.ok(C.flow[id],id+' 定義あり');
 assert.deepEqual(Array.from(C.flow[id].options,o=>o[1]),expected[id],id+' 行き先');
 expected[id].forEach((next,a)=>{const n={...c};
  if((id==='Q2'||id==='H2')&&a===2)n.both=true;
  if(id==='Q3b'){n.stock=a===1||a===2;n.zero=a===0}
  if(['SA','SB','SE','SZ'].includes(id))n.side=a;
  if(id==='Q4')n.side=a===1?1:0;
  walk(next,[...path,a],n,[...ancestors,id]);
 });
}walk();
for(const {id,path,c} of paths)for(let mask=0;mask<16;mask++)for(const low of [true,false,undefined])test(`経路 ${path.join('→')} ${id} 追加=${mask} 配当年収=${low}`,()=>{
 const e={highSalary:!!(mask&1),planned:!!(mask&2),carried:!!(mask&4),dividend:!!(mask&8),dividendLow:low};
 const copy=JSON.stringify({path,e}),r=C.resolve(path,e);
 const need=id==='D'||e.highSalary||(e.planned&&(id==='C'||c.side===1));
 const better=id==='E'||e.carried||(e.dividend&&low===true);
 assert.equal(C.destination(path),id);assert.equal(r.kind,need?'need':better?'better':'none');
 assert.equal(JSON.stringify({path,e}),copy,'引数を変えない');
 if(c.side===2){assert.equal(r.kind,'need','副業20万円超は必ず必要');if(!e.highSalary)assert.equal(r.reason,'給与以外のもうけが20万円を超えるため')}
 assert.equal(r.resident,!need&&(c.stock||c.side===1));
 assert.equal(r.notes.some(n=>n.includes('住民税')),r.resident,'住民税は所得がある未申告の場合だけ');
 if(r.resident)assert.ok(r.notes.includes(id==='E'||r.kind==='better'?'申告しない場合は、住民税の申告が必要です':'住民税の申告は必要です'));
 if(c.zero&&c.side!==2&&!e.highSalary&&!e.planned&&!e.carried&&!e.dividend)assert.equal(r.reason,'源泉なし口座のもうけが0円のため');
 if(e.planned&&['A','B'].includes(id)){assert.ok(r.notes.some(n=>n.includes('申告に含めなくてよい')));if(!need&&!better)assert.equal(r.title,'株のもうけは申告に含めなくてよい見込み')}
 if(id==='E')assert.ok(r.notes.includes('繰り越せるのは上場株式・公募の投資信託などの損です'));
 if(id==='C'&&c.both)assert.ok(r.notes.some(n=>n.includes('源泉ありの口座で損した場合')));
 if(e.dividend&&id==='E')assert.ok(r.notes.some(n=>n.includes('別の口座の配当があれば')));
 if(e.dividend&&need){assert.ok(r.notes.some(n=>n.includes('総合課税にすると税金が減る場合')));for(const ref of ['10-c','10-h','10-i'])assert.ok(r.refs.includes(ref))}
 assert.ok(r.refs.length>0&&r.refs.every(k=>C.sourceMap[k]));
});
test('全質問へ到達・残り問数は最長経路、0円を先頭に追加',()=>{
 const visited=new Set();for(const {path} of paths)for(let n=0;n<path.length;n++)visited.add(C.destination(path.slice(0,n)));
 assert.deepEqual([...visited].sort(),Object.keys(C.flow).sort());
 function count(id){return expected[id]?1+Math.max(...expected[id].map(count)):0}
 for(const id of Object.keys(expected))assert.equal(C.remaining(id),count(id));
 assert.equal(C.flow.Q3b.options[0][0],'売っていない・もうけ0円');
 for(const id of ['SA','SB','SE','SZ']){assert.equal(C.flow[id].question,'副業など、給与のほかのもうけは?');assert.deepEqual(Array.from(C.flow[id].options,o=>o[0]),['ない','20万円以下','20万円より多い'])}
 assert.equal(C.flow.Q5.question,'源泉なし口座のもうけ+副業のもうけ、合わせて20万円より多い?');
 assert.equal(C.flow.Q5.hint,'あなたの答え:源泉なし口座 20万円以下/副業 あり');
});
test('不正・途中の回答を拒否',()=>{
 for(const path of [[],[0],[1],[2],[1,0]])assert.throws(()=>C.resolve(path,{}),/完了/);
 for(const path of [[9],[-1],['0'],[0,0,0],null])assert.throws(()=>C.resolve(path,{}));
});
test('配当の年収目安は1120万円',()=>{assert.equal(C.salaryBoundary(),11200000);assert.equal(C.taxableEstimate(11200000),6950000);assert.equal(C.dividendSalaryLimit,11200000)});
test('旧出典・旧進捗を除去し表示名と出典を一致させる',()=>{
 assert.doesNotMatch(html,/okinawa|令和元年|最大5問|ほかに当てはまる\?/);
 assert.match(C.sourceMap['6-b'].url,/2025\/pdf\/001.pdf$/);assert.match(C.sourceMap['6-b'].title,/令和7年分/);
 for(const t of ['NISA以外で受け取った国内株の配当がある','当てはまるものを押すと、答えが変わります','独身・社会保険料15%の目安','2027年2月16日〜3月15日','https://www.keisan.nta.go.jp/','prefers-reduced-motion:no-preference','@media(hover:hover)','確認日 2026-11-10'])assert.ok(html.includes(t),t);
 assert.match(html,/#ks-card #ks-answer\{[^}]*28px[^}]*32px[^}]*font-weight:800/);
 assert.match(html,/#ks-card #ks-answer\{[^}]*font-size:[^;]*!important/,'共通CSSのh2サイズ指定より優先');
});
test('配当負担率の本文の表は計算と一致する',()=>{
 for(const m of html.matchAll(/<tr data-rate="([^"]+)"><td>[^<]+<\/td><td>約([0-9.]+)%/g))assert.equal((C.dividendRate(Number(m[1]))*100).toFixed(1),m[2]);
});
test('FAQ構造化データ・本文の回答は一致し、すべてのインラインJSを構文検査',()=>{
 const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=ld['@graph'].find(x=>x['@type']==='FAQPage').mainEntity;
 const text=[...html.matchAll(/<details><summary><span>(.*?)<\/span><\/summary><p>(.*?)<\/p>/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(text,faq.map(q=>[q.name,q.acceptedAnswer.text]));
 for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!match[1].includes('application/ld+json'))new vm.Script(match[2]);
});
