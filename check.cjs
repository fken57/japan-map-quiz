const assert = require('node:assert/strict');
const fs = require('node:fs');
const {DIFFICULTY_PLACES,difficultyFor,getQuestionPool,makeQuestions,isCorrect,parseSharedResult,createResultShare} = require('./quiz.js');
const data = require('./assets/municipalities.json');
const d3 = require('./assets/d3.min.js'), topo = require('./assets/topojson.min.js');
const map = require('./assets/municipality-boundaries.json');
assert.equal(data.length,1718); assert.equal(new Set(data.map(c=>c.id)).size,data.length);
assert.equal(new Set(data.map(c=>c.pid)).size,47);
assert.equal(data.filter(c=>c.kind==='cities').length,792);
assert.equal(data.filter(c=>c.kind==='towns').length,926);
const projection = d3.geoMercator().fitExtent([[55,30],[945,620]],{type:'MultiPoint',coordinates:[[122.5,24],[146,46]]});
for (const c of data) {
  assert.match(c.id,/^\d{6}$/); assert.match(c.name,/[市町村]$/); assert.ok(c.kana && c.pref);
  assert.ok(c.lat>=24 && c.lat<=46 && c.lng>=122.5 && c.lng<=146);
  const p = projection([c.lng,c.lat]); assert.ok(p[0]>=0 && p[0]<=1000 && p[1]>=0 && p[1]<=650);
}
const features=topo.feature(map,map.objects.municipalities).features;
assert.equal(features.length,data.length);
assert.deepEqual(new Set(features.map(f=>f.id)),new Set(data.map(c=>c.id)));
for(const f of features){
  assert.ok(d3.geoArea(f)>0&&d3.geoArea(f)<.1,`Invalid polygon: ${f.id}`);
  assert.ok(d3.geoPath(projection)(f)?.length>0);
  assert.ok(d3.geoPath(projection).bounds(f).flat().every(Number.isFinite));
}
for(const id of ['011002','141003','221309','133621','134023','443221','473553','473561'])assert.ok(features.some(f=>f.id===id));
assert.ok(d3.geoContains(features.find(f=>f.id==='011002'),[141.3544,43.0621]));
assert.ok(!features.some(f=>f.id.slice(0,5)==='01101')); // 札幌市中央区は市に統合
const placeKeys = new Set(data.map(c=>`${c.pid}:${c.name}`));
for (const [level,keys] of Object.entries(DIFFICULTY_PLACES)) for (const key of keys) {
  assert.ok(placeKeys.has(key),`Unknown ${level} municipality: ${key}`);
  if (level==='normal') assert.ok(!DIFFICULTY_PLACES.easy.has(key),`Duplicate difficulty: ${key}`);
}
const pools = ['easy','normal','hard'].map(mode=>getQuestionPool(data,mode));
assert.equal(pools.reduce((sum,pool)=>sum+pool.length,0),data.length);
assert.equal(new Set(pools.flat().map(c=>c.id)).size,data.length);
for (const pool of pools) {
  assert.ok(pool.length>=30);
  assert.ok(pool.some(c=>c.kind==='cities') && pool.some(c=>c.kind==='towns'));
}
assert.equal(difficultyFor(data.find(c=>c.name==='軽井沢町')),'easy');
assert.equal(difficultyFor(data.find(c=>c.name==='草津町')),'normal');
assert.equal(difficultyFor(data.find(c=>c.name==='歌志内市')),'hard');
for (const mode of ['easy','normal','hard']) for (const count of [15,30]) {
  for (let n=0;n<100;n++) {
    const q = makeQuestions(data,mode,count); assert.equal(q.length,count); assert.equal(new Set(q.map(c=>c.id)).size,count);
    assert.ok(q.every(c=>difficultyFor(c)===mode));
  }
  for (const score of [0,1,count]) {
    const share = createResultShare('https://example.github.io/japan-map-quiz/?old=1#old',mode,count,score);
    assert.deepEqual(parseSharedResult(new URL(share.url).hash),{mode,count,score});
    assert.equal(new URL(share.url).pathname,'/japan-map-quiz/'); assert.equal(new URL(share.url).search,'');
  }
  const records=Array.from({length:count},(_,i)=>({target:data[i],selected:i%3===0?data[i]:i%3===1?data[(i+1)%data.length]:null,correct:i%3===0}));
  const text = createResultShare('https://example.com/',mode,count,0,records).text;
  assert.equal(text.split('\n').filter(line=>/^\d+\./.test(line)).length,count);
  assert.ok(text.includes('未回答')&&text.includes('正解')&&text.includes('不正解（回答：'));
  assert.ok(!text.includes('km')&&!text.includes('得点率'));
}
assert.equal(isCorrect(data[0],{...data[0]}),true);
assert.equal(isCorrect(data[0],data[1]),false);
assert.equal(isCorrect(data[0],null),false);
const sameName=data.filter(c=>c.name==='府中市');assert.equal(sameName.length,2);assert.equal(isCorrect(sameName[0],sameName[1]),false);
for (const hash of ['', '#result=area.easy.15.16','#result=area.hard.30.-1','#result=area.normal.20.0','#result=area.unknown.15.0','#result=area.hard.30.1<script>','#result=area.hard.30.1.5','#result=easy.15.5','#result=normal.30.12345','#result=cities.15.1000']) assert.equal(parseSharedResult(hash),null);
assert.throws(()=>createResultShare('https://example.com/','easy',15,-1));
assert.throws(()=>makeQuestions(data,'unknown',15)); assert.throws(()=>makeQuestions(data,'hard',16));
const html = fs.readFileSync('index.html','utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(?:https?:|\.\/)/.test(match[1])) continue;
  assert.ok(fs.existsSync(match[1].split('?')[0]),`Missing asset: ${match[1]}`);
}
console.log(`PASS: 1,718 selectable municipality boundaries (including islands and merged cities), difficulty pools ${pools.map(p=>p.length).join('/')}, 3 difficulties × 15/30 × 100 runs, exact answers, area-version share links/history, and local assets.`);
