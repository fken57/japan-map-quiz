const MODE_LABELS = {easy: '初級', normal: '中級', hard: '上級'};
// 知名度・位置の推測しやすさを考慮した本クイズ独自の分類。人口順位ではない。
function placeKeys(text) {
  return new Set(text.trim().split('\n').flatMap(line => {
    const [prefecture, ...names] = line.trim().split(/\s+/);
    return names.map(name => `${prefecture}:${name}`);
  }));
}
const DIFFICULTY_PLACES = {
  easy: placeKeys(`
1 札幌市 函館市 小樽市 旭川市
2 青森市
3 盛岡市
4 仙台市
5 秋田市
6 山形市
7 福島市
8 水戸市
9 宇都宮市
10 前橋市
11 さいたま市
12 千葉市 浦安市
13 八王子市
14 横浜市 川崎市 鎌倉市 箱根町
15 新潟市
16 富山市
17 金沢市
18 福井市
19 甲府市
20 長野市 松本市 軽井沢町
21 岐阜市 高山市 白川村
22 静岡市 浜松市 熱海市
23 名古屋市
24 津市 伊勢市
25 大津市
26 京都市 宇治市
27 大阪市 堺市
28 神戸市 姫路市
29 奈良市
30 和歌山市
31 鳥取市
32 松江市 出雲市
33 岡山市 倉敷市
34 広島市 尾道市
35 山口市 下関市
36 徳島市
37 高松市
38 松山市
39 高知市
40 福岡市 北九州市 太宰府市
41 佐賀市
42 長崎市 佐世保市
43 熊本市
44 大分市 別府市
45 宮崎市
46 鹿児島市
47 那覇市 石垣市 宮古島市`),
  normal: placeKeys(`
1 釧路市 帯広市 北見市 網走市 苫小牧市 稚内市 千歳市 富良野市 登別市 ニセコ町 倶知安町
2 弘前市 八戸市 十和田市
3 一関市 花巻市 平泉町
4 石巻市 気仙沼市 松島町
5 大館市 横手市 仙北市
6 米沢市 鶴岡市 酒田市 天童市
7 会津若松市 郡山市 いわき市 喜多方市
8 つくば市 日立市 土浦市 鹿嶋市 大洗町
9 足利市 日光市 那須塩原市 那須町
10 高崎市 桐生市 草津町 みなかみ町
11 川越市 熊谷市 川口市 所沢市 秩父市 越谷市
12 銚子市 船橋市 木更津市 松戸市 成田市 柏市 館山市
13 立川市 武蔵野市 三鷹市 府中市 調布市 町田市 奥多摩町
14 横須賀市 藤沢市 茅ヶ崎市 小田原市 相模原市 厚木市 湯河原町
15 長岡市 上越市 佐渡市 湯沢町
16 高岡市 黒部市 立山町
17 輪島市 加賀市 七尾市
18 敦賀市 小浜市 坂井市
19 富士吉田市 北杜市 富士河口湖町 山中湖村
20 上田市 諏訪市 飯田市 白馬村 野沢温泉村
21 大垣市 多治見市 中津川市 下呂市 郡上市
22 沼津市 三島市 富士市 伊東市 伊豆市 御殿場市
23 豊橋市 岡崎市 一宮市 豊田市 犬山市 常滑市
24 四日市市 松阪市 鈴鹿市 鳥羽市 志摩市
25 彦根市 長浜市 近江八幡市
26 福知山市 舞鶴市 宮津市 亀岡市 伊根町
27 岸和田市 吹田市 高槻市 枚方市 東大阪市
28 尼崎市 明石市 西宮市 宝塚市 豊岡市 淡路市
29 橿原市 生駒市 吉野町
30 田辺市 新宮市 白浜町 高野町 那智勝浦町
31 米子市 倉吉市 境港市
32 浜田市 大田市 津和野町
33 津山市 玉野市 備前市
34 呉市 福山市 廿日市市
35 宇部市 岩国市 萩市
36 鳴門市 阿南市 三好市
37 丸亀市 小豆島町 琴平町
38 今治市 宇和島市 新居浜市
39 四万十市 室戸市 土佐清水市
40 久留米市 飯塚市 柳川市 糸島市
41 唐津市 鳥栖市 伊万里市 有田町
42 島原市 平戸市 対馬市 五島市 雲仙市
43 八代市 天草市 阿蘇市 南小国町 南阿蘇村
44 中津市 日田市 由布市
45 都城市 延岡市 日南市 高千穂町
46 指宿市 霧島市 奄美市 屋久島町
47 名護市 沖縄市 恩納村 竹富町 与那国町`)
};
function difficultyFor(place) {
  const key = `${place.pid}:${place.name}`;
  return DIFFICULTY_PLACES.easy.has(key) ? 'easy' : DIFFICULTY_PLACES.normal.has(key) ? 'normal' : 'hard';
}
function getQuestionPool(data, mode) {
  if (!Object.hasOwn(MODE_LABELS, mode)) throw new RangeError('Invalid quiz settings');
  return data.filter(c => difficultyFor(c) === mode);
}
function makeQuestions(data, mode, count, rng = Math.random) {
  if (![15, 30].includes(count)) throw new RangeError('Invalid quiz settings');
  const pool = getQuestionPool(data, mode);
  if (pool.length < count) throw new RangeError('Not enough municipalities');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1]-a[1])*rad/2)**2 + Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
function pointsForDistance(distance) {
  if (!Number.isFinite(distance) || distance < 0) throw new RangeError('Invalid distance');
  return Math.round(1000 * Math.exp(-Math.max(0, distance - 5) / 100));
}
function formatDistance(distance) { return `${distance < 10 ? distance.toFixed(1) : Math.round(distance).toLocaleString('ja-JP')} km`; }
function parseSharedResult(hash) {
  const match = /^#result=(easy|normal|hard)\.(15|30)\.(\d{1,5})$/.exec(hash);
  if (!match || Number(match[3]) > Number(match[2])*1000) return null;
  return {mode:match[1], count:Number(match[2]), score:Number(match[3])};
}
function createResultShare(href, mode, count, score, history = []) {
  const hash = `#result=${mode}.${count}.${score}`;
  if (!Number.isInteger(score) || !parseSharedResult(hash)) throw new RangeError('Invalid score');
  const url = new URL(href); url.search = ''; url.hash = hash;
  const details = history.map((r, i) => `${i+1}. ${r.target.pref} ${r.target.name}：${r.guess ? `誤差 ${formatDistance(r.distance)}` : '未回答'} / ${r.points}点`).join('\n');
  return {title:'日本市町村クイズ — ATLAS JAPAN', text:`日本市町村クイズに挑戦！\n${MODE_LABELS[mode]} · ${count}問 · ${score.toLocaleString('ja-JP')} / ${(count*1000).toLocaleString('ja-JP')}点（得点率 ${Math.round(score/(count*1000)*100)}%）${details ? '\n\n'+details : ''}\n\nあなたも日本をめぐろう！ #日本市町村クイズ`, url:url.href};
}
if (typeof module !== 'undefined') module.exports = {MODE_LABELS, DIFFICULTY_PLACES, difficultyFor, getQuestionPool, makeQuestions, distanceKm, pointsForDistance, formatDistance, parseSharedResult, createResultShare};
