const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('ja-JP');
let municipalities, phase = 'home', mode = 'easy', count = 15, questions = [], index = 0, score = 0, guess = null, history = [];
const svg = d3.select('#map'), width = 1000, height = 650;
const projection = d3.geoMercator().fitExtent([[55,30],[945,620]], {type:'MultiPoint', coordinates:[[122.5,24],[146,46]]});
const geoPath = d3.geoPath(projection);
const group = svg.append('g');
group.append('path').attr('class','graticule').attr('d', geoPath(d3.geoGraticule().extent([[120,20],[155,48]]).step([2,2])()));
const land = group.append('g');
const overlay = group.append('g').attr('pointer-events','none');
const zoom = d3.zoom().scaleExtent([1,40]).extent([[0,0],[width,height]])
  .translateExtent([[-width/2,-height/2],[width*1.5,height*1.5]])
  .on('zoom', event => {group.attr('transform', event.transform); resizePins(event.transform.k);});
svg.call(zoom).on('dblclick.zoom',null);
const mobileLayout = window.matchMedia('(max-width:720px)');
let mapWidth = width;
function resizeMap() {
  mapWidth = mobileLayout.matches ? 520 : width;
  const left = (width-mapWidth)/2;
  svg.attr('viewBox',`${left} 0 ${mapWidth} ${height}`);
  zoom.extent([[left,0],[left+mapWidth,height]]);
}
mobileLayout.addEventListener('change',resizeMap); resizeMap();
function show(id, visible) { $(id).hidden = !visible; }
function setPhase(value) {
  phase = value; show('intro', value === 'home'); show('how', value === 'home');
  show('game', ['question','answered'].includes(value)); show('results', value === 'results');
  show('shared', value === 'home' && Boolean(parseSharedResult(location.hash)));
  document.querySelector('.map-card').classList.toggle('playing', value === 'question');
}
function changeMode(value) {
  mode = value;
  document.querySelectorAll('[data-mode]').forEach(b => {const active = b.dataset.mode === mode; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));});
  if (municipalities) $('load-status').textContent = `${MODE_LABELS[mode]}：${number(getQuestionPool(municipalities,mode).length)}市町村から出題。1回の旅で同じ市町村は出ません。`;
}
function changeCount(value) {
  count = value;
  document.querySelectorAll('[data-count]').forEach(b => {const active = Number(b.dataset.count) === count; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));});
  if (municipalities) $('start').textContent = `${count}問の旅をはじめる →`;
}
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click',()=>changeMode(b.dataset.mode)));
document.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click',()=>changeCount(Number(b.dataset.count))));
function resetMap() { svg.interrupt().call(zoom.transform,d3.zoomIdentity); }
function resizePins(k) {
  overlay.selectAll('circle').attr('r',7/k).attr('stroke-width',2/k);
  overlay.selectAll('text').attr('transform',d=>`translate(${projection(d.point)}) scale(${1/k})`);
}
function pin(point, color, label) {
  const [x,y] = projection(point);
  overlay.append('circle').attr('cx',x).attr('cy',y).attr('fill',color).attr('stroke','#fafbf7');
  overlay.append('text').datum({point}).attr('class','pin-label').attr('x',11).attr('y',-11).text(label);
}
function renderPins(record) {
  overlay.selectAll('*').remove();
  if (record) {
    const target = [record.target.lng,record.target.lat];
    if (record.guess) {
      const a = projection(record.guess), b = projection(target);
      overlay.append('path').attr('class','route').attr('d',`M${a}L${b}`);
      pin(record.guess,'#d49b31','回答');
    }
    pin(target,'#246b54','役所');
  } else if (guess) pin(guess,'#d49b31','回答');
  resizePins(d3.zoomTransform(svg.node()).k);
}
function selectPoint(point) {
  if (phase !== 'question' || !point.every(Number.isFinite) || point[0]<120 || point[0]>155 || point[1]<20 || point[1]>48) return;
  guess = point; renderPins(); $('answer').disabled = false;
  $('feedback').textContent = `ピンを置きました（北緯 ${point[1].toFixed(3)}° / 東経 ${point[0].toFixed(3)}°）。場所を調整して回答してください。`;
}
svg.on('click', event => {
  if (event.defaultPrevented || phase !== 'question') return;
  const point = d3.zoomTransform(svg.node()).invert(d3.pointer(event,svg.node()));
  selectPoint(projection.invert(point));
});
svg.on('keydown', event => {
  if (event.key === '+' || event.key === '=') {event.preventDefault(); svg.call(zoom.scaleBy,1.6); return;}
  if (event.key === '-') {event.preventDefault(); svg.call(zoom.scaleBy,1/1.6); return;}
  if (phase !== 'question') return;
  const transform = d3.zoomTransform(svg.node());
  const screen = guess ? transform.apply(projection(guess)) : [width/2,height/2];
  const movement = {ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[event.key];
  if (movement) {
    event.preventDefault(); screen[0]+=movement[0]; screen[1]+=movement[1];
    selectPoint(projection.invert(transform.invert(screen)));
    if (screen[0]<(width-mapWidth)/2+40 || screen[0]>(width+mapWidth)/2-40 || screen[1]<40 || screen[1]>height-40) svg.call(zoom.translateBy,-movement[0]/transform.k,-movement[1]/transform.k);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); selectPoint(projection.invert(transform.invert([width/2,height/2])));
  }
});
function ask() {
  guess = null; resetMap(); renderPins(); setPhase('question');
  const target = questions[index];
  $('mode-badge').textContent = MODE_LABELS[mode]; $('question-count').textContent = `QUESTION ${String(index+1).padStart(2,'0')} / ${count}`;
  $('score').textContent = number(score); $('score-total').textContent = ` / ${number(count*1000)}点`;
  $('prefecture').textContent = target.pref; $('municipality-name').textContent = target.name; $('reading').textContent = target.kana;
  $('progress-bar').style.width = `${index/count*100}%`; $('feedback').textContent = '役所があると思う場所に、ピンを置いてください。';
  $('map-note').textContent = '地名のヒントはなし。拡大してピンを置こう';
  $('answer').disabled = true; show('answer',true); show('skip',true); show('next',false);
}
function start() {
  if (!municipalities) return;
  questions = makeQuestions(municipalities,mode,count); index = 0; score = 0; history = [];
  $('share-status').textContent = ''; show('share-fallback',false); ask(); window.scrollTo({top:0});
}
function focusRecord(record) {
  const points = [[record.target.lng,record.target.lat]]; if (record.guess) points.push(record.guess);
  const projected = points.map(projection), xs = projected.map(p=>p[0]), ys = projected.map(p=>p[1]);
  const x = (Math.min(...xs)+Math.max(...xs))/2, y = (Math.min(...ys)+Math.max(...ys))/2;
  const k = Math.max(1,Math.min(12,.68/Math.max((Math.max(...xs)-Math.min(...xs))/mapWidth,(Math.max(...ys)-Math.min(...ys))/height,.001)));
  svg.interrupt().call(zoom.transform,d3.zoomIdentity.translate(width/2,height/2).scale(k).translate(-x,-y));
}
function reveal(skip = false) {
  if (phase !== 'question' || (!skip && !guess)) return;
  const target = questions[index], answer = skip ? null : guess;
  const distance = answer ? distanceKm(answer,[target.lng,target.lat]) : null;
  const points = answer ? pointsForDistance(distance) : 0;
  const record = {target, guess:answer, distance, points}; history.push(record); score += points;
  setPhase('answered'); renderPins(record); focusRecord(record); $('score').textContent = number(score);
  $('feedback').textContent = answer ? `${number(points)}点！ 役所まで ${formatDistance(distance)}${distance<=5 ? '。5km以内で満点です。' : '。緑のピンが役所です。'}` : `未回答・0点。緑のピンが${target.name}の役所です。`;
  $('map-note').textContent = `${target.pref} ${target.name}：役所の登録地点`;
  $('progress-bar').style.width = `${(index+1)/count*100}%`;
  show('answer',false); show('skip',false); show('next',true); $('next').textContent = index===count-1 ? '結果を見る →' : '次の問題へ →';
  $('next').focus({preventScroll:true});
}
function results() {
  setPhase('results'); resetMap(); renderPins(null); overlay.selectAll('*').remove();
  $('result-heading').textContent = `${count}問、日本をめぐりました。`; $('final-score').textContent = number(score); $('final-total').textContent = ` / ${number(count*1000)}点`;
  const ratio = score/(count*1000), answered = history.filter(r=>r.guess);
  $('percentage').textContent = `${Math.round(ratio*100)}%`; $('near-count').textContent = `${history.filter(r=>r.guess && r.distance<=5).length} / ${count}問`;
  $('average-distance').textContent = answered.length ? formatDistance(answered.reduce((sum,r)=>sum+r.distance,0)/answered.length) : '回答なし';
  $('result-message').textContent = ratio>=.8 ? (mode==='hard' ? '見事な旅！ 上級の市町村まで、よく知っていますね。' : '見事な旅！ 次はひとつ上の難易度に挑戦してみよう。') : ratio>=.5 ? 'いい旅でした。惜しかった町を、もう一度地図で。' : 'まだ知らなかった町との出会い。地図で振り返って、次の旅へ。';
  $('review-count').textContent = `${MODE_LABELS[mode]} · ${count}問`; $('review').replaceChildren();
  history.forEach((record,i)=>{
    const row = document.createElement('div'); row.className = 'review-row';
    const no = document.createElement('span'); no.textContent = String(i+1).padStart(2,'0');
    const button = document.createElement('button'); button.textContent = record.target.name;
    const pref = document.createElement('small'); pref.textContent = record.target.pref; button.append(pref);
    button.addEventListener('click',()=>{renderPins(record); focusRecord(record); $('map-note').textContent = `${record.target.pref} ${record.target.name}：${record.guess ? '誤差 '+formatDistance(record.distance) : '未回答'}`; document.querySelector('.map-card').scrollIntoView({block:'center'});});
    const error = document.createElement('span'); error.textContent = record.guess ? formatDistance(record.distance) : '未回答';
    const points = document.createElement('strong'); points.textContent = `${number(record.points)}点`; row.append(no,button,error,points); $('review').append(row);
  });
  $('map-note').textContent = '振り返りの市町村名を押すと、位置を確認できます'; $('results').scrollIntoView({block:'start'});
}
function home() {guess = null; setPhase('home'); overlay.selectAll('*').remove(); resetMap(); $('map-note').textContent = '地図を拡大して、町の位置を探そう'; window.scrollTo({top:0});}
$('start').addEventListener('click',start); $('retry').addEventListener('click',start); $('home').addEventListener('click',home);
$('answer').addEventListener('click',()=>reveal()); $('skip').addEventListener('click',()=>reveal(true));
$('next').addEventListener('click',()=>{if (phase!=='answered') return; index++; if (index===count) results(); else ask();});
$('quit').addEventListener('click',()=>{if (confirm('今回のクイズを終了して、設定に戻りますか？ 進捗はリセットされます。')) home();});
$('zoom-in').addEventListener('click',()=>svg.call(zoom.scaleBy,1.7)); $('zoom-out').addEventListener('click',()=>svg.call(zoom.scaleBy,1/1.7)); $('reset-map').addEventListener('click',resetMap);
function renderSharedResult() {
  const shared = parseSharedResult(location.hash);
  if (shared) $('shared-text').textContent = `${MODE_LABELS[shared.mode]} · ${shared.count}問 · ${number(shared.score)} / ${number(shared.count*1000)}点（得点率 ${Math.round(shared.score/(shared.count*1000)*100)}%）`;
  show('shared',phase==='home' && Boolean(shared));
}
$('challenge').addEventListener('click',()=>{const shared = parseSharedResult(location.hash); if (!shared) return; changeMode(shared.mode); changeCount(shared.count); if (municipalities) start();});
window.addEventListener('hashchange',renderSharedResult); renderSharedResult();
async function copyResult(text) {
  try {await navigator.clipboard.writeText(text); $('share-status').textContent = '結果とリンクをコピーしました。'; show('share-fallback',false);}
  catch { $('share-fallback').value = text; show('share-fallback',true); $('share-fallback').focus(); $('share-fallback').select(); $('share-status').textContent = 'テキストを選択してコピーしてください。'; }
}
async function shareResult(useNative) {
  if (phase!=='results') return;
  const result = createResultShare(location.href,mode,count,score,history); const text = `${result.text}\n${result.url}`;
  if (useNative && navigator.share) {
    try {await navigator.share(result); $('share-status').textContent = '共有画面を閉じました。'; return;}
    catch (error) {if (error.name==='AbortError') { $('share-status').textContent = '共有をキャンセルしました。'; return; }}
  }
  await copyResult(text);
}
$('share').addEventListener('click',()=>shareResult(true)); $('copy').addEventListener('click',()=>shareResult(false));
async function load() {
  try {
    const [data,map] = await Promise.all(['assets/municipalities.json','assets/japan.json'].map(async url=>{const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json();}));
    const features = topojson.feature(map,map.objects.japan);
    land.selectAll('path').data(features.features).join('path').attr('class','land').attr('d',geoPath);
    municipalities = data; $('start').disabled = false; $('challenge').disabled = false; changeCount(count);
    changeMode(mode);
  } catch (error) {
    $('start').textContent = '読み込みを再試行'; $('start').disabled = false;
    $('load-status').textContent = '地図を読み込めませんでした。接続を確認して再試行してください。';
    $('start').onclick = ()=>{ $('start').onclick = null; $('start').disabled = true; $('start').textContent = '地図を準備しています…'; load(); };
  }
}
load();
