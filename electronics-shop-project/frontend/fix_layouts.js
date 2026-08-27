const fs = require('fs');
const path = require('path');
const dirs = ['cart', 'category/[slug]', 'checkout', 'news', 'news/[slug]', 'orders/[id]', 'orders/lookup', 'orders/result', 'products/[id]', 'promotions', 'promotions/[slug]', 'wishlist'];
for (const dir of dirs) {
  const p = path.join('app', dir, 'page.tsx');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf-8');
    content = content.replace(/<\>\s*<SiteHeader \/>/, '<div className=\"min-h-screen flex flex-col bg-circuit-bg text-circuit-text\">\n      <SiteHeader />');
    content = content.replace(/<\/main>\s*<SiteFooter \/>\s*<\/>/, '</main>\n      <SiteFooter />\n    </div>');
    fs.writeFileSync(p, content);
  }
}
