const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname, prefix = '/japan-map-quiz';
const server = http.createServer((req,res)=>{
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400); return res.end();}
  if (pathname === prefix) {res.writeHead(302,{Location:prefix+'/'});return res.end();}
  if (pathname.startsWith(prefix+'/')) pathname = pathname.slice(prefix.length);
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(root,'.'+pathname);
  if (!file.startsWith(root+path.sep) || pathname.split('/').some(p=>p.startsWith('.'))) {res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if (error) {res.writeHead(404);return res.end();} res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8'})[path.extname(file)] || 'application/octet-stream');res.end(data);});
});
server.listen(Number(process.env.PORT || 4174),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}${prefix}/`));
