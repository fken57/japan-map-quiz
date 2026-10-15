const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('ja-JP');
let municipalities, features, paths, phase='home', mode='easy', count=15, questions=[], index=0, score=0, selected=null, history=[];
const svg=d3.select('#map'), width=1000, height=650;
const projection=d3.geoMercator().fitExtent([[55,30],[945,620]],{type:'MultiPoint',coordinates:[[122.5,24],[146,46]]});
const geoPath=d3.geoPath(projection),group=svg.append('g');
group.append('path').attr('class','graticule').attr('d',geoPath(d3.geoGraticule().extent([[120,20],[155,48]]).step([2,2])()));
const background=group.append('g'),land=group.append('g');
const zoom=d3.zoom().scaleExtent([1,100]).extent([[0,0],[width,height]]).translateExtent([[-width/2,-height/2],[width*1.5,height*1.5]]).on('zoom',event=>group.attr('transform',event.transform));
svg.call(zoom).on('dblclick.zoom',null);
const mobileLayout=window.matchMedia('(max-width:720px)');
let mapWidth=width;
function resizeMap(){mapWidth=mobileLayout.matches?520:width;const left=(width-mapWidth)/2;svg.attr('viewBox',`${left} 0 ${mapWidth} ${height}`);zoom.extent([[left,0],[left+mapWidth,height]]);}
mobileLayout.addEventListener('change',resizeMap);resizeMap();
function show(id,visible){$(id).hidden=!visible;}
function setPhase(value){
  phase=value;show('intro',value==='home');show('how',value==='home');show('game',['question','answered'].includes(value));show('results',value==='results');
  show('shared',value==='home'&&Boolean(parseSharedResult(location.hash)));show('focus-prefecture',['question','answered'].includes(value));
  document.querySelector('.map-card').classList.toggle('playing',value==='question');paths?.attr('tabindex',(_,i)=>value==='question'&&i===0?0:-1);
}
function changeMode(value){
  mode=value;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(municipalities)$('load-status').textContent=`${MODE_LABELS[mode]}：${number(getQuestionPool(municipalities,mode).length)}市町村から出題。1回の旅で同じ市町村は出ません。`;
}
function changeCount(value){count=value;document.querySelectorAll('[data-count]').forEach(b=>{const active=Number(b.dataset.count)===count;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});if(municipalities)$('start').textContent=`${count}問の旅をはじめる →`;}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>changeMode(b.dataset.mode)));
document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>changeCount(Number(b.dataset.count))));
function resetMap(){svg.interrupt().call(zoom.transform,d3.zoomIdentity);}
function clearMap(){paths?.attr('class','municipality');}
function highlight(id,state){paths.filter(d=>d.id===id).classed(state,true);}
function selectMunicipality(event,feature){
  if(phase!=='question'||event.defaultPrevented)return;
  selected=feature.properties;clearMap();highlight(feature.id,'selected');$('answer').disabled=false;
  $('feedback').textContent='黄色の市町村を選択しました。この区域で回答しますか？';
}
function focusFeatures(items){
  const [[x0,y0],[x1,y1]]=geoPath.bounds({type:'FeatureCollection',features:items});
  const k=Math.max(1,Math.min(70,.75/Math.max((x1-x0)/mapWidth,(y1-y0)/height,.001)));
  svg.interrupt().call(zoom.transform,d3.zoomIdentity.translate(width/2,height/2).scale(k).translate(-(x0+x1)/2,-(y0+y1)/2));
}
function focusMunicipality(id){
  const feature=features.find(f=>f.id===id);
  const polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
  const largest=polygons.map(coordinates=>({type:'Polygon',coordinates})).sort((a,b)=>geoPath.area(b)-geoPath.area(a))[0];
  focusFeatures([{type:'Feature',geometry:largest}]);
}
function keyboardSelect(event,feature){
  if(phase!=='question')return;
  if(event.key==='Enter'||event.key===' '){selectMunicipality(event,feature);event.preventDefault();return;}
  const direction=['ArrowRight','ArrowDown'].includes(event.key)?1:['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
  if(direction){event.preventDefault();const next=features[(features.indexOf(feature)+direction+features.length)%features.length];paths.attr('tabindex',d=>d===next?0:-1);focusMunicipality(next.id);paths.filter(d=>d===next).node().focus({preventScroll:true});}
}
svg.on('keydown',event=>{if(event.key==='+'||event.key==='='){event.preventDefault();svg.call(zoom.scaleBy,1.6);}else if(event.key==='-'){event.preventDefault();svg.call(zoom.scaleBy,1/1.6);}});
function ask(){
  selected=null;clearMap();resetMap();setPhase('question');const target=questions[index];
  $('mode-badge').textContent=MODE_LABELS[mode];$('question-count').textContent=`QUESTION ${String(index+1).padStart(2,'0')} / ${count}`;
  $('score').textContent=score;$('score-total').textContent=` / ${count}問正解`;
  $('prefecture').textContent=target.pref;$('municipality-name').textContent=target.name;$('reading').textContent=target.kana;
  $('progress-bar').style.width=`${index/count*100}%`;$('feedback').textContent='地図上の市町村の区域を選んでください。';
  $('map-note').textContent='小さな市町村は拡大。「県」で出題県を表示';paths.attr('aria-label',(_,i)=>`市町村の区域 ${i+1}`);
  $('answer').disabled=true;show('answer',true);show('skip',true);show('next',false);
}
function start(){if(!municipalities)return;questions=makeQuestions(municipalities,mode,count);index=0;score=0;history=[];$('share-status').textContent='';show('share-fallback',false);ask();window.scrollTo({top:0});}
function showRecord(record){clearMap();if(record.selected&&!record.correct)highlight(record.selected.id,'wrong');highlight(record.target.id,'correct');focusMunicipality(record.target.id);}
function reveal(skip=false){
  if(phase!=='question'||(!skip&&!selected))return;
  const target=questions[index],answer=skip?null:selected,correct=isCorrect(target,answer),record={target,selected:answer,correct};history.push(record);if(correct)score++;
  setPhase('answered');showRecord(record);$('score').textContent=score;
  $('feedback').textContent=correct?`✓ 正解！ ${target.name}を見つけました。`:answer?`✕ 選んだのは${answer.pref} ${answer.name}。正解は緑色の${target.name}です。`:`未回答。正解は緑色の${target.name}です。`;
  $('map-note').textContent=`正解：${target.pref} ${target.name}`;paths.attr('aria-label',d=>`${d.properties.pref} ${d.properties.name}`);
  $('progress-bar').style.width=`${(index+1)/count*100}%`;show('answer',false);show('skip',false);show('next',true);$('next').textContent=index===count-1?'結果を見る →':'次の問題へ →';$('next').focus({preventScroll:true});
}
function results(){
  setPhase('results');resetMap();clearMap();$('result-heading').textContent=`${count}問、日本をめぐりました。`;$('final-score').textContent=score;$('final-total').textContent=` / ${count}問正解`;
  const ratio=score/count;$('percentage').textContent=`${Math.round(ratio*100)}%`;$('wrong-count').textContent=`${history.filter(r=>r.selected&&!r.correct).length}問`;$('skipped-count').textContent=`${history.filter(r=>!r.selected).length}問`;
  $('result-message').textContent=ratio>=.8?(mode==='hard'?'見事な旅！ 上級の市町村まで、よく知っていますね。':'見事な旅！ 次はひとつ上の難易度に挑戦してみよう。'):ratio>=.5?'いい旅でした。惜しかった町を、もう一度地図で。':'まだ知らなかった町との出会い。地図で振り返って、次の旅へ。';
  $('review-count').textContent=`${MODE_LABELS[mode]} · ${count}問`;$('review').replaceChildren();
  history.forEach((record,i)=>{
    const row=document.createElement('div');row.className='review-row';const no=document.createElement('span');no.textContent=String(i+1).padStart(2,'0');
    const button=document.createElement('button');button.textContent=record.target.name;const pref=document.createElement('small');pref.textContent=record.target.pref;button.append(pref);
    button.addEventListener('click',()=>{showRecord(record);$('map-note').textContent=`正解：${record.target.pref} ${record.target.name}`;document.querySelector('.map-card').scrollIntoView({block:'center'});});
    const answer=document.createElement('span');answer.textContent=record.selected?`回答：${record.selected.pref} ${record.selected.name}`:'未回答';
    const status=document.createElement('strong');status.textContent=record.correct?'✓ 正解':record.selected?'✕ 不正解':'—';row.append(no,button,answer,status);$('review').append(row);
  });
  $('map-note').textContent='振り返りの市町村名を押すと、区域を確認できます';$('results').scrollIntoView({block:'start'});
}
function home(){selected=null;setPhase('home');clearMap();resetMap();$('map-note').textContent='地図を拡大して、市町村の区域を探そう';window.scrollTo({top:0});}
$('start').addEventListener('click',start);$('retry').addEventListener('click',start);$('home').addEventListener('click',home);$('answer').addEventListener('click',()=>reveal());$('skip').addEventListener('click',()=>reveal(true));
$('next').addEventListener('click',()=>{if(phase!=='answered')return;index++;if(index===count)results();else ask();});
$('quit').addEventListener('click',()=>{if(confirm('今回のクイズを終了して、設定に戻りますか？ 進捗はリセットされます。'))home();});
$('zoom-in').addEventListener('click',()=>svg.call(zoom.scaleBy,1.7));$('zoom-out').addEventListener('click',()=>svg.call(zoom.scaleBy,1/1.7));$('reset-map').addEventListener('click',resetMap);
$('focus-prefecture').addEventListener('click',()=>{if(['question','answered'].includes(phase))focusFeatures(features.filter(f=>f.properties.pid===questions[index].pid));});
function renderSharedResult(){const shared=parseSharedResult(location.hash);if(shared)$('shared-text').textContent=`${MODE_LABELS[shared.mode]} · ${shared.score} / ${shared.count}問正解（正答率 ${Math.round(shared.score/shared.count*100)}%）`;show('shared',phase==='home'&&Boolean(shared));}
$('challenge').addEventListener('click',()=>{const shared=parseSharedResult(location.hash);if(!shared)return;changeMode(shared.mode);changeCount(shared.count);if(municipalities)start();});
window.addEventListener('hashchange',renderSharedResult);renderSharedResult();
async function copyResult(text){try{await navigator.clipboard.writeText(text);$('share-status').textContent='結果とリンクをコピーしました。';show('share-fallback',false);}catch{$('share-fallback').value=text;show('share-fallback',true);$('share-fallback').focus();$('share-fallback').select();$('share-status').textContent='テキストを選択してコピーしてください。';}}
async function shareResult(useNative){
  if(phase!=='results')return;const result=createResultShare(location.href,mode,count,score,history),text=`${result.text}\n${result.url}`;
  if(useNative&&navigator.share){try{await navigator.share(result);$('share-status').textContent='共有画面を閉じました。';return;}catch(error){if(error.name==='AbortError'){$('share-status').textContent='共有をキャンセルしました。';return;}}}await copyResult(text);
}
$('share').addEventListener('click',()=>shareResult(true));$('copy').addEventListener('click',()=>shareResult(false));
async function load(){
  try{
    const [data,map,context]=await Promise.all(['assets/municipalities.json','assets/municipality-boundaries.json','assets/japan.json'].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}));
    background.selectAll('path').data(topojson.feature(context,context.objects.japan).features).join('path').attr('class','land').attr('d',geoPath).attr('pointer-events','none');
    const byId=new Map(data.map(c=>[c.id,c]));features=topojson.feature(map,map.objects.municipalities).features;
    for(const feature of features){if(!byId.has(feature.id))throw new Error('Unknown municipality');feature.properties=byId.get(feature.id);}
    if(features.length!==data.length||new Set(features.map(f=>f.id)).size!==data.length)throw new Error('Incomplete municipality map');
    paths=land.selectAll('path').data(features).join('path').attr('class','municipality').attr('d',geoPath).attr('role','button').attr('tabindex',-1).attr('aria-label',(_,i)=>`市町村の区域 ${i+1}`).on('click',selectMunicipality).on('keydown',keyboardSelect);
    municipalities=data;$('start').disabled=false;$('challenge').disabled=false;changeCount(count);changeMode(mode);
  }catch(error){$('start').textContent='読み込みを再試行';$('start').disabled=false;$('load-status').textContent='地図を読み込めませんでした。接続を確認して再試行してください。';$('start').onclick=()=>{$('start').onclick=null;$('start').disabled=true;$('start').textContent='地図を準備しています…';load();};}
}
load();
