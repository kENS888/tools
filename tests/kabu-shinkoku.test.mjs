import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadCore} from './load-core.mjs';
const html=readFileSync(new URL('../kabu-shinkoku/index.html',import.meta.url),'utf8');
const C=loadCore(new URL('../kabu-shinkoku/index.html',import.meta.url));
// 仕様から独立に定義した正解経路。実装の行き先から期待値を作らない。
const expected={Q1:['A','Q2','H1'],H1:['A','Q2'],Q2:['Q3a','Q3b','Q3b','H2'],H2:['Q3a','Q3b','Q3b'],Q3a:['B','E'],Q3b:['Q4','D','E'],Q4:['C','Q5'],Q5:['C','D']};
const expectedResults={A:'none',B:'none',C:'none',D:'need',E:'better'};
const paths=[];
function expectedWalk(id='Q1',path=[]){if(expectedResults[id]){paths.push({id,path});return}expected[id].forEach((next,i)=>expectedWalk(next,[...path,i]))}
expectedWalk();
function walk(id='Q1',path=[],ancestors=[]){
 assert.ok(!ancestors.includes(id),'循環なし');
 if(C.results[id])return;
 const node=C.flow[id];assert.ok(node&&node.options.length,'行き止まりなし: '+id);
 node.options.forEach((o,i)=>{assert.ok(C.flow[o[1]]||C.results[o[1]],'定義済みの行き先');walk(o[1],[...path,i],[...ancestors,id])});
}
walk();
for(const {id,path} of paths)test(`全経路 ${path.join('→')} → ${id}`,()=>{
 assert.equal(C.destination(path),id);const r=C.resolve(path,{});
 assert.equal(r.kind,expectedResults[id]);assert.equal(r.reason,C.results[id].reason);
 assert.ok(r.refs.length>0);assert.ok(r.refs.every(k=>C.sourceMap[k]),'根拠をすべて解決できる');
 assert.equal(r.notes.some(n=>n.includes('住民税')),id==='C');
});
for(const id of Object.keys(C.results))for(let mask=0;mask<16;mask++)for(const low of [true,false,undefined])test(`追加条件 ${id} mask=${mask} 配当年収=${low}`,()=>{
 const path=paths.find(p=>p.id===id).path;
 const e={highSalary:!!(mask&1),planned:!!(mask&2),carried:!!(mask&4),dividend:!!(mask&8),dividendLow:low};
 const copy=JSON.stringify({path,e}),r=C.resolve(path,e);
 const need=id==='D'||e.highSalary||(id==='C'&&e.planned);
 const better=id==='E'||e.carried||(e.dividend&&low===true);
 assert.equal(r.kind,need?'need':better?'better':'none');
 assert.equal(JSON.stringify({path,e}),copy,'引数を変えない');
 assert.ok(r.refs.every(k=>C.sourceMap[k]));
 if(e.planned&&['A','B'].includes(id))assert.ok(r.notes.some(n=>n.includes('申告に含めなくてよい')));
 if(e.carried)assert.ok(r.notes.some(n=>n.includes('毎年の申告が必要')));
 if(e.dividend&&['D','E'].includes(id))assert.ok(!r.refs.includes('10-c'),'D/Eに配当判定をしない');
 if(id==='C'&&!need)assert.ok(r.notes.some(n=>n.includes('住民税')));
});
test('配当の年収目安は1120万円、695万円境界を10万円単位で切り下げる',()=>{
 const b=C.salaryBoundary();assert.equal(b,11200000);assert.equal(C.taxableEstimate(b),6950000);
 assert.ok(C.taxableEstimate(b-1)<6950000);assert.ok(C.taxableEstimate(b+1)>6950000);
 assert.equal(C.dividendSalaryLimit,11200000);assert.equal(Math.floor(b/100000)*100000,C.dividendSalaryLimit);
});
test('質問・ヘルプすべて到達でき、最大5段階・終了可能',()=>{
 const visited=new Set();for(const {path} of paths){for(let n=0;n<path.length;n++)visited.add(C.destination(path.slice(0,n)))}
 assert.deepEqual([...visited].sort(),Object.keys(C.flow).sort());
 for(const node of Object.values(C.flow)){assert.ok(node.step>=1&&node.step<=5);assert.ok(node.options.length>=2)}
});
test('不正な回答・途中の回答を結果として扱わない',()=>{
 for(const path of [[],[1],[2],[1,0]])assert.throws(()=>C.resolve(path,{}),/完了/);
 for(const path of [[9],[-1],['0'],[0,0],null])assert.throws(()=>C.resolve(path,{}));
});
test('オフに戻すとすべて元の結果、必要を得で消さない',()=>{
 for(const {path} of paths){const r=C.resolve(path,{});assert.equal(C.resolve(path,{highSalary:false,planned:false,carried:false,dividend:false,dividendLow:true}).reason,r.reason)}
 const r=C.resolve(paths.find(p=>p.id==='C').path,{planned:true,carried:true,dividend:true,dividendLow:true});assert.equal(r.kind,'need');
});
test('本文・出典・構造化データを維持し旧フォーム・案内・帯を外す',()=>{
 assert.doesNotMatch(html,/id="mini"|tour\.js|SKTour|例を入れて使い方を見る|はじめての方へ：使い方を見る|id="ks-form"|inputmode=|年収が空欄|年収を入れ/);
 for(const name of ['ks-examples','ks-method','ks-terms','ks-rules'])assert.ok(html.includes('id="'+name+'"'));
 const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.deepEqual(ld['@graph'].map(x=>x['@type']),['WebApplication','BreadcrumbList','FAQPage']);
 assert.ok(ld['@graph'][0].featureList.some(x=>x.includes('回答')));assert.ok(html.includes('2026-11-10'));
});

test('指定された質問の行き先・結果の対応を守る',()=>{
 for(const [id,nexts] of Object.entries(expected))assert.deepEqual(Array.from(C.flow[id].options,o=>o[1]),nexts,id);
 for(const [id,kind] of Object.entries(expectedResults))assert.equal(C.results[id].kind,kind);
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
