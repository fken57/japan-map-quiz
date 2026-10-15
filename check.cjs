const assert = require('node:assert/strict');
const fs = require('node:fs');
const {DIFFICULTY_PLACES,difficultyFor,getQuestionPool,makeQuestions,distanceKm,pointsForDistance,parseSharedResult,createResultShare} = require('./quiz.js');
const data = require('./assets/municipalities.json');
const d3 = require('./assets/d3.min.js'), topo = require('./assets/topojson.min.js');
const map = require('./assets/japan.json');
assert.equal(data.length,1718); assert.equal(new Set(data.map(c=>c.id)).size,data.length);
assert.equal(new Set(data.map(c=>c.pid)).size,47);
assert.equal(data.filter(c=>c.kind==='cities').length,792);
assert.equal(data.filter(c=>c.kind==='towns').length,926);
const projection = d3.geoMercator().fitExtent([[55,30],[945,620]],{type:'MultiPoint',coordinates:[[122.5,24],[146,46]]});
for (const c of data) {
  assert.match(c.id,/^\d{6}$/); assert.match(c.name,/[市町村]$/); assert.ok(c.kana && c.pref);
  assert.ok(c.lat>=24 && c.lat<=46 && c.lng>=122.5 && c.lng<=146);
  const p = projection([c.lng,c.lat]); assert.ok(p[0]>=0 && p[0]<=1000 && p[1]>=0 && p[1]<=650);
  const back = projection.invert(p); assert.ok(distanceKm(back,[c.lng,c.lat])<1e-8);
}
assert.equal(topo.feature(map,map.objects.japan).features.length,47);
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
  for (const score of [0,1,1000,count*1000]) {
    const share = createResultShare('https://example.github.io/japan-map-quiz/?old=1#old',mode,count,score);
    assert.deepEqual(parseSharedResult(new URL(share.url).hash),{mode,count,score});
    assert.equal(new URL(share.url).pathname,'/japan-map-quiz/'); assert.equal(new URL(share.url).search,'');
  }
  const records = Array.from({length:count},(_,i)=>({target:data[i],guess:i%2?[139,35]:null,distance:i%2?25:null,points:i%2?819:0}));
  const text = createResultShare('https://example.com/',mode,count,0,records).text;
  assert.equal(text.split('\n').filter(line=>/^\d+\./.test(line)).length,count);
  assert.ok(text.includes('未回答') && text.includes('誤差 25 km'));
}
assert.equal(distanceKm([139,35],[139,35]),0);
assert.ok(Math.abs(distanceKm([0,0],[1,0])-111.195)<.001);
assert.ok(Math.abs(distanceKm([0,0],[180,0])-20015.114)<.001);
assert.ok(Math.abs(distanceKm([139.7,35.7],[135.5,34.7])-distanceKm([135.5,34.7],[139.7,35.7]))<1e-9);
assert.equal(pointsForDistance(0),1000); assert.equal(pointsForDistance(5),1000);
assert.equal(pointsForDistance(10),951); assert.equal(pointsForDistance(50),638); assert.equal(pointsForDistance(100),387);
assert.equal(pointsForDistance(20000),0);
for (let d=1;d<=3000;d++) assert.ok(pointsForDistance(d)<=pointsForDistance(d-1));
for (const d of [-1,NaN,Infinity]) assert.throws(()=>pointsForDistance(d));
for (const hash of ['', '#result=easy.15.15001','#result=hard.30.-1','#result=normal.20.0','#result=unknown.15.0','#result=hard.30.1<script>','#result=hard.30.1.5','#result=cities.15.1000','#result=towns.30.1000','#result=all.15.1000']) assert.equal(parseSharedResult(hash),null);
assert.throws(()=>createResultShare('https://example.com/','easy',15,-1));
assert.throws(()=>makeQuestions(data,'unknown',15)); assert.throws(()=>makeQuestions(data,'hard',16));
const html = fs.readFileSync('index.html','utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(?:https?:|\.\/)/.test(match[1])) continue;
  assert.ok(fs.existsSync(match[1]),`Missing asset: ${match[1]}`);
}
console.log(`PASS: 1,718 municipalities, difficulty pools ${pools.map(p=>p.length).join('/')}, complete disjoint coverage, 3 difficulties × 15/30 questions × 100 runs, distance/scoring, share links/history, and local assets.`);
