// Builds products/<code>/onepager.pdf for every product in data/products.json
// by printing product.html. Usage (from the repo root):
//   npm install playwright && npx playwright install chromium   (first time only)
//   node tools/build-pdfs.js            # all products
//   node tools/build-pdfs.js 22BV601    # one product
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  const only = process.argv[2];
  const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'))
    .filter(p => !only || p.code === only);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const p of products) {
    await page.goto(`http://localhost:${port}/product.html?code=${encodeURIComponent(p.code)}`);
    await page.waitForSelector('.hdr');
    await page.waitForLoadState('networkidle');
    await page.emulateMedia({ media: 'print' });
    const over = await page.evaluate(() => {
      const sheet = document.querySelector('.sheet').getBoundingClientRect();
      const foot = document.querySelector('.foot').getBoundingClientRect().top;
      const last = Math.max(...[...document.querySelectorAll('.wrap > div, .lower')].map(e => e.getBoundingClientRect().bottom));
      return Math.round(last - foot);
    });
    if (over > 0) console.warn(`⚠ ${p.code}: content runs ${over}px into the footer — shorten some text`);
    const out = path.join(root, p.onepager || `products/${p.slug || p.code}/onepager.pdf`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.pdf({ path: out, format: 'A4', printBackground: true, pageRanges: '1' });
    console.log('✔', p.code, '→', path.relative(root, out));
  }
  await browser.close(); server.close();
});
