const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'admin' || file === 'api' || file === 'components' || file === 'lib') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file === 'page.tsx') {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Pattern 1: <div className="min-h-screen ..."> <SiteHeader /> <main className="XXX"> ... </main> <SiteFooter /> </div>
            // Wait, if SiteHeader is inside <main>, pull it out!
            
            // Check if SiteHeader is inside <main>
            const mainStartIdx = content.indexOf('<main');
            const mainEndIdx = content.lastIndexOf('</main>');
            const headerIdx = content.indexOf('<SiteHeader />');
            const footerIdx = content.indexOf('<SiteFooter />');
            
            if (mainStartIdx !== -1 && headerIdx !== -1 && headerIdx > mainStartIdx && headerIdx < mainEndIdx) {
                console.log('Fixing inside-main SiteHeader in:', fullPath);
                
                // Extract <main ...> tag
                const mainTagMatch = content.match(/<main[^>]*>/);
                if (mainTagMatch) {
                    const mainTag = mainTagMatch[0];
                    
                    // Remove SiteHeader and SiteFooter from inside main
                    let newContent = content.replace(/\s*<SiteHeader \/>/, '');
                    newContent = newContent.replace(/\s*<SiteFooter \/>/, '');
                    
                    // Replace <main ...> with <> <SiteHeader /> <main ...>
                    newContent = newContent.replace(mainTag, `\n    <>\n      <SiteHeader />\n      ${mainTag}`);
                    
                    // Replace </main> with </main> <SiteFooter /> </>
                    newContent = newContent.replace(/<\/main>/, `</main>\n      <SiteFooter />\n    </>`);
                    
                    content = newContent;
                    modified = true;
                }
            }
            
            // Pattern 2: We applied fix_layouts.js before, which wrapped <> with div.min-h-screen, but it didn't change <main> width properly if the file was using max-w on <main> and NOT on <>
            // Actually, if we use <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text"> instead of <>
            // let's do that!
            if (modified) {
                // If we just wrapped with <>, let's wrap with div.min-h-screen
                content = content.replace(/<\>/, '<div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">');
                content = content.replace(/<\/>/, '</div>');
                fs.writeFileSync(fullPath, content);
                console.log('Saved', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'app'));
