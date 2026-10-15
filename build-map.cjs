// 入力は共同通信japan-choroplethのN03 2025由来TopoJSON。出典はassets/SOURCES.md参照。
const fs = require('node:fs'), assert = require('node:assert/strict');
const topo = require('./assets/topojson.min.js'), d3 = require('./assets/d3.min.js');
const source = JSON.parse(fs.readFileSync(process.argv[2] || 'qa/municipalities-2025-source.json','utf8'));
const places = require('./assets/municipalities.json');
const byCode = new Map(places.map(place=>[place.id.slice(0,5),place]));
const byName = new Map(places.map(place=>[`${place.pid}:${place.name}`,place]));
const groups = new Map();
for (const geometry of source.objects.municipalities.geometries) {
  const p = geometry.properties;
  const place = byCode.get(String(geometry.id)) || byName.get(`${Number(String(geometry.id).slice(0,2))}:${p.municipality}`);
  if (!place) continue;
  if (!groups.has(place.id)) groups.set(place.id,[]);
  groups.get(place.id).push(geometry);
}
const geometries = places.map(place => {
  const parts = groups.get(place.id);
  assert.ok(parts,`Missing municipality: ${place.pref} ${place.name}`);
  const geometry = parts.length === 1 ? structuredClone(parts[0]) : topo.mergeArcs(source,parts);
  const polygons = geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs;
  for (let i=0;i<polygons.length;i++) {
    const polygon = {type:'Polygon',arcs:polygons[i]};
    if (d3.geoArea(topo.feature(source,polygon)) > Math.PI*2) polygons[i] = polygons[i].map(ring=>ring.slice().reverse().map(arc=>~arc));
  }
  const result = {type:'MultiPolygon',arcs:polygons,id:place.id};
  const feature = topo.feature(source,result);
  assert.ok(d3.geoArea(feature)>0 && d3.geoArea(feature)<.1,`Invalid area: ${place.name}`);
  return result;
});
source.objects = {municipalities:{type:'GeometryCollection',geometries}};
fs.writeFileSync('qa/merged-boundaries.json',JSON.stringify(source));
console.log(`Built ${geometries.length} municipalities, including merged designated cities.`);
