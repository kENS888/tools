import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadCore } from './load-core.mjs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const html = read('kabu-shinkoku/index.html');
const C = loadCore(new URL('kabu-shinkoku/index.html', root));
const N = loadCore(new URL('nenmatsu/index.html', root));
const base = { accounts: ['plain'], profit: 0 };
const run = o => C.judge({ ...base, ...o });
const resident = r => r.notes.some(n => n.includes('住民税の申告は必要'));

for (const [profit, kind, ward] of [[0,'none',false],[1,'none',true],[150000,'none',true],[200000,'none',true],[200001,'need',false]]) {
  test(`源泉なし利益${profit}円 → ${kind}・住民税=${ward}`, () => {
    const r = run({ profit }); assert.equal(r.kind, kind); assert.equal(resident(r), ward);
  });
}
test('株と副業の所得を合算し、源泉あり・NISAの利益は合計しない', () => {
  assert.equal(run({ profit:150000, other:50000 }).kind,'none');
  assert.equal(run({ profit:150000, other:50001 }).kind,'need');
  assert.equal(run({ accounts:['plain','withheld','nisa'],profit:200000,withheldGain:1000000,nisaGain:1000000 }).kind,'none');
  assert.equal(run({ accounts:['withheld'],other:200001 }).kind,'need');
});
for (const accounts of [['withheld'],['nisa'],['withheld','nisa']]) {
  test(`${accounts}だけなら不要の見込み`, () => {
    const r=run({accounts,withheldGain:1000000}); assert.equal(r.kind,'none'); assert.equal(resident(r),false);
    if(accounts.includes('nisa'))assert.ok(r.notes.some(n=>n.includes('通算・繰越できません')));
    assert.ok(r.refs.includes(accounts.length===1&&accounts[0]==='nisa'?'12-a':'3-a'));
  });
}
for (const [cross,forward,kind] of [[true,false,'better'],[false,false,'none'],[false,true,'better'],[true,true,'better']]) {
  test(`源泉あり損失・別口座利益=${cross}・繰越希望=${forward}`, () => {
    assert.equal(run({accounts:['withheld'],loss:100000,cross,forward}).kind,kind);
  });
}
test('損失0やNISAだけの損失は通算・繰越候補にしない', () => {
  assert.equal(run({accounts:['withheld'],loss:0,cross:true,forward:true}).kind,'none');
  assert.equal(run({accounts:['nisa'],loss:100000,cross:true,forward:true}).kind,'none');
});
test('前年からの繰越損失・連続申告の案内', () => {
  const r=run({carried:true}); assert.equal(r.kind,'better'); assert.ok(r.notes.some(n=>n.includes('連続して申告')));
});
for(const profit of [0,1,200000]) {
  test(`申告予定あり・源泉なし利益${profit}`,()=>assert.equal(run({profit,planned:true}).kind,profit>0?'need':'none'));
}
test('申告予定があっても源泉ありの申告不要は選択できる', () => {
  const r=run({accounts:['withheld'],planned:true});assert.equal(r.kind,'none');assert.ok(r.notes.some(n=>n.includes('予定している')));
});
test('年収2,000万円の境界・Aが他の条件より優先', () => {
  assert.equal(run({salary:20000000}).kind,'none');
  const r=run({salary:20000001,profit:300000,carried:true});assert.equal(r.kind,'need');assert.ok(r.refs.includes('13-a'));
});
test('B→C→Dの優先順位', () => {
  assert.ok(run({profit:200001,planned:true,carried:true}).refs.includes('4-d'));
  assert.ok(run({profit:1,planned:true,carried:true}).refs.includes('6-a'));
  assert.ok(run({accounts:['withheld'],loss:100000,cross:true,carried:true}).refs.includes('9'));
});
test('配当加算前に695万円付近なら10万円の配当で境界を超える', () => {
  for(const [salary,k] of [[11199999,6949999],[11200000,6950000],[11200001,6950001]]) {
    assert.equal(C.taxableEstimate(salary),k);
    assert.equal(run({salary,dividend:100000}).kind,'none');
  }
});
test('年収空欄では配当の判定を行わず、条件付き案内だけ出す', () => {
  for(const salary of ['',undefined,null]) {
    const r=run({salary,dividend:100000});assert.equal(r.kind,'none');assert.ok(r.notes.some(n=>n.startsWith('国内株の配当を含めた課税所得が695万円以下なら')));
  }
  assert.equal(run({salary:0,dividend:100000}).kind,'better');
  assert.equal(run({salary:4500000,dividend:0}).kind,'none');
});
test('入力空・未選択・選択後の利益空欄では確定しない',()=>{
  for(const o of [{},{accounts:[]},{accounts:['plain']},{accounts:['plain'],profit:''}])assert.equal(C.judge(o).kind,'empty');
  assert.equal(run({accounts:['nisa']}).kind,'none');
});
test('全角数字・カンマ・空白の許容と不正な金額の拒否',()=>{
  assert.equal(C.money('２００，００１'),200001);
  assert.equal(C.money(' 200,000 '),200000);
  assert.equal(run({profit:'２００，００１'}).kind,'need');
  for(const profit of ['-1','1.5','20万','abc','9007199254740992'])assert.equal(run({profit}).kind,'empty');
  assert.equal(run({accounts:['withheld'],profit:'abc',loss:'abc'}).kind,'empty');
  assert.equal(run({accounts:['nisa'],profit:'abc',loss:'abc'}).kind,'none');
});
test('給与所得は年末調整ページと同じ式・基礎控除も年末調整の出力と一致',()=>{
  const points=[0,740999,741000,2190999,2191000,2192999,2193000,2195999,2196000,2199999,2200000,3599999,3600000,6599999,6600000,6655555,6655556,8499999,8500000,8500001,11200000,20000000];
  for(const income of points){
    assert.equal(C.kyuyoShotoku(income),N.kyuyoShotoku(income));
    const n=N.nenmatsu({income,paid:0,shaAuto:true,spouse:'',spInc:0,dep:0,tok:0,old:0,dokyo:0,seiho:0,ideco:0,jutaku:0});
    assert.equal(C.kisoIT(C.kyuyoShotoku(income)),n.kiso);
  }
});
test('配当の負担率は独立計算の期待値に一致',()=>{
  for(const [r,percent] of [[.1,7.2],[.2,17.41],[.23,20.473]])assert.ok(Math.abs(C.dividendRate(r)*100-percent)<1e-9);
});
test('静的HTMLの計算例をcoreと照合',()=>{
  const examples={small:{accounts:['plain'],profit:150000},large:{accounts:['plain'],profit:250000},withheld:{accounts:['withheld'],withheldGain:1000000}};
  for(const m of html.matchAll(/<tr data-example="([^"]+)">([\s\S]*?)<\/tr>/g)){
    const cells=[...m[2].matchAll(/<td>(.*?)<\/td>/g)].map(m=>m[1]);
    const o=examples[m[1]],r=C.judge(o);
    assert.equal(cells[1],(o.profit??o.withheldGain).toLocaleString('ja-JP')+'円');assert.equal(cells[2],C.labels[r.kind]);
  }
  assert.equal(resident(C.judge(examples.small)),true);
  assert.match(html,/15万円の例は、所得税の申告は不要の見込みでも、住民税の申告は必要/);
  for(const m of html.matchAll(/<tr data-rate="([^"]+)">([\s\S]*?)<\/tr>/g))assert.ok(m[2].includes('約'+(C.dividendRate(+m[1])*100).toFixed(1)+'%'));
});
test('FAQの数字をcoreと照合し、構造化データと本文を一致させる',()=>{
  const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const faq=ld.find(x=>x['@type']==='FAQPage').mainEntity;
  const qs=[...html.matchAll(/<details><summary><span>(.*?)<\/span><\/summary><p>(.*?)<\/p>/g)].map(m=>[m[1],m[2]]);
  assert.deepEqual(qs,faq.map(q=>[q.name,q.acceptedAnswer.text]));assert.ok(qs.length>=6);
  assert.equal(run({profit:150000,other:50000}).kind,'none');assert.equal(resident(run({profit:150000,other:50000})),true);
  const a=qs[4][1];for(const r of [.2,.23])assert.ok(a.includes((C.dividendRate(r)*100).toFixed(1)+'%'));
  for(const [,a] of qs)assert.doesNotMatch(a,/あなたは申告が必要です/);
});
test('独自styleは影・角丸を追加せず、共通CSSの後の上書きもしない',()=>{
  const css=html.match(/<style id="calc2">([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(css,/border-radius:\s*[1-9]|box-shadow:\s*(?!none)/);
  assert.ok(html.indexOf('</style>')<html.indexOf('/assets/v2.css'));
  assert.match(html,/<details class="sx" id="ks-method" open>/);assert.match(html,/<details class="sx" id="ks-terms" open>/);
  assert.equal((html.match(/class="ad"/g)||[]).length,2);
  assert.doesNotMatch(html,/<!-- (?:RELATED|FAQ|SOURCES|STRUCTURED_DATA) -->/);
});
test('ページ内JavaScriptの構文・ページ内リンク・重複IDを検査',()=>{
  for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('application/ld+json'))new vm.Script(m[2]);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),m[1]);
});
test('判定結果の形式・根拠番号・必須の断定回避',()=>{
  for(const o of [{},{accounts:['nisa']},{accounts:['plain'],profit:1},{accounts:['plain'],profit:200001},{accounts:['withheld'],carried:true},{accounts:['withheld'],salary:20000001}]){
    const r=C.judge(o);assert.ok(['empty','none','need','better'].includes(r.kind));assert.ok(Array.isArray(r.notes));assert.ok(Array.isArray(r.refs));
    if(r.kind!=='empty'){assert.ok(r.refs.length>0);assert.match(C.labels[r.kind],/見込み|かもしれません/)}
  }
  assert.match(html,/一般的な目安です。個別の判断は税務署・税理士へ/);
});
test('OGPの描画用HTMLは既存の図柄を基に1200×630・同一アイコン・ゴールド',()=>{
  const fixture=read('tests/fixtures/kabu-shinkoku-og.html');assert.match(fixture,/width:1200px;height:630px/);
  assert.match(fixture,/#a16207/);assert.match(fixture,/無料/);assert.match(fixture,/登録なし/);assert.match(fixture,/ブラウザだけ/);
  const iconPath=html.match(/<span class="tic"[^>]*><svg[^>]*>(.*?)<\/svg>/)[1];assert.ok(fixture.includes(iconPath));
  assert.equal(html.match(/<title>(.*?)<\/title>/)[1],html.match(/property="og:title" content="([^"]+)"/)[1]);
  assert.equal(html.match(/name="description" content="([^"]+)"/)[1],html.match(/property="og:description" content="([^"]+)"/)[1]);
});
function pages(dir=''){
  return readdirSync(new URL(dir||'.',root),{withFileTypes:true}).flatMap(e=>{
    if(/^(\.|node_modules|assets|tests|output|functions)/.test(e.name))return [];
    const p=dir+e.name;return e.isDirectory()?pages(p+'/'):e.name.endsWith('.html')?[p]:[];
  });
}
test('関連ツールのある全ページ・トップ一覧・ItemList・相互リンク・sitemap・llmsを接続',()=>{
  const all=pages(),related=all.filter(p=>/関連ツール/.test(read(p)));
  assert.ok(related.length>=15);
  for(const p of related){if(p==='kabu-shinkoku/index.html')continue;const s=read(p).match(/<div class="rel">([\s\S]*?)<\/div>/)?.[1];assert.ok(s?.includes('href="/kabu-shinkoku/"'),p);}
  const top=read('index.html');const ld=JSON.parse(top.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(ld['@graph'].find(x=>x['@type']==='ItemList').itemListElement.some(x=>x.url.endsWith('/kabu-shinkoku/')));
  assert.equal((top.match(/href="\/kabu-shinkoku\/"/g)||[]).length,2);
  assert.match(read('nenmatsu/index.html'),/株や配当がある方は、<a href="\/kabu-shinkoku\/">/);
  assert.match(html,/年末調整で戻る額の見込みは、<a href="\/nenmatsu\/">/);
  assert.match(read('sitemap.xml'),/kabu-shinkoku\/<\/loc><lastmod>2026-11-10/);
  assert.match(read('llms.txt'),/\[株・配当の確定申告判定\]/);
  assert.match(read('llms.txt'),/会社員の株・配当は確定申告が必要/);
});

test('申告予定では株の利益0円でもほかの所得を含める',()=>{for(const accounts of [['plain'],['withheld'],['nisa']])for(const other of [0,1,200000]){const r=run({accounts,profit:0,other,planned:true});assert.equal(r.kind,other>0?'need':'none');if(other>0)assert.equal(r.reason,'医療費控除などで申告する時は、20万円以下の所得も申告に含めるため');}});
test('配当加算後695万円の直前・一致・直後',()=>{const salary=11000000;const limit=6950000-C.taxableEstimate(salary);for(const [delta,kind] of [[-1,'better'],[0,'better'],[1,'none']])assert.equal(run({salary,dividend:limit+delta}).kind,kind);});
test('出典は読める名前で表示し、内部の根拠記号を表示しない',()=>{const outside=html.replace(/<script id="core">[\s\S]*?<\/script>/,'');assert.doesNotMatch(outside,/r\.refs|根拠 [0-9]|指定された判定用|organization\/okinawa|>13<|>001</);for(const o of [{profit:1},{profit:1,planned:true},{profit:200001},{accounts:['withheld'],salary:20000001},{salary:4500000,dividend:100000},{accounts:['nisa']}])for(const source of run(o).sources){assert.ok(source.url?.startsWith('https://'));assert.ok(source.title);}assert.match(read('404.html'),/href="\/nenmatsu\/"[^]*?href="\/kabu-shinkoku\/"/);assert.match(read('.gitignore'),/^output\/$/m);});

for(const accounts of [['plain'],['withheld'],['plain','withheld']])for(const [cross,forward,kind] of [[false,false,'none'],[true,false,'better'],[false,true,'better'],[true,true,'better']]){
  test(`${accounts}の損失：通算=${cross}・繰越=${forward}・注記と根拠`,()=>{
    const r=run({accounts,loss:100000,cross,forward});
    assert.equal(r.kind,kind);
    assert.equal(r.notes.filter(n=>n.startsWith('損失は、申告すれば')).length,1);
    assert.ok(r.notes.includes('損失は、申告すればほかの口座の利益と差し引いたり、3年繰り越したりできます。申告しなければ、その損失は使えなくなります'));
    for(const no of ['1474','1465'])assert.ok(r.sources.some(s=>s.url.endsWith('/'+no+'.htm')));
  });
}
test('損失の注記は必要判定でも残し、NISA単独・損失0では出さない',()=>{
  for(const o of [{profit:200001},{salary:20000001},{profit:1,planned:true}]){
    const r=run({...o,loss:100000});assert.equal(r.kind,'need');assert.ok(r.notes.some(n=>n.startsWith('損失は、申告すれば')));
  }
  for(const o of [{loss:0},{accounts:['nisa'],loss:100000,cross:true,forward:true}])assert.ok(!run(o).notes.some(n=>n.startsWith('損失は、申告すれば')));
});
test('全金額欄の100億円ちょうど・超過・全角・不正値の境界',()=>{
  assert.equal(C.money('１０，０００，０００，０００'),10000000000);
  assert.ok(Number.isNaN(C.money('10,000,000,001')));
  for(const key of ['profit','other','salary','loss','dividend']){
    assert.notEqual(run({[key]:10000000000}).kind,'empty',key);
    for(const bad of [10000000001,'-1','1.5','abc']){
      const r=run({[key]:bad});assert.equal(r.kind,'empty',key);assert.equal(r.reason,'入力を直すと判定が出ます');assert.equal(r.notes.length,0);
    }
  }
});
test('20万円で判定した時だけ、実際の利益・他所得・合計の内訳を返す',()=>{
  for(const [profit,other,kind] of [[180000,30000,'need'],[150000,50000,'none'],[0,0,'none'],[200000,1,'need']]){
    const r=run({profit,other});assert.equal(r.kind,kind);
    assert.equal(r.breakdown,`源泉なし・一般の利益 ${profit.toLocaleString('ja-JP')}円＋ほかの所得 ${other.toLocaleString('ja-JP')}円＝${(profit+other).toLocaleString('ja-JP')}円`);
  }
  for(const o of [{salary:20000001},{profit:1,planned:true},{accounts:['withheld']},{accounts:['nisa']},{carried:true},{salary:4500000,dividend:100000}])assert.equal(run(o).breakdown,undefined);
});
test('ページ本文で同じ語句が直後に重複していない',()=>{
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ');
  assert.doesNotMatch(text,/([ぁ-んァ-ヶ一-龠ー]{4,})\1/);
});
test('結果帯の見た目は年末調整と同じ定義・チェックボックス・国内株の対象と出典',()=>{
  const definition=s=>s.match(/\.mres\{[^\n]+/)[0];assert.equal(definition(html),definition(read('nenmatsu/index.html')));
  assert.match(html,/<input type="checkbox" id="forward">/);
  assert.match(html,/国内株の配当<small>投資信託の分配金・外国株・J-REIT は入れない/);
  assert.match(html,/国内の会社の株の配当の場合。投資信託の分配金は配当控除の率が違います/);
  assert.match(html,/1199\.htm"[^>]*>No.1199 基礎控除｜国税庁<\/a>/);
  assert.doesNotMatch(html,/>Part\. 7 よくある質問<|"title":"国税庁 No\.\d+"/);
});
