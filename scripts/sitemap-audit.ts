/**
 * Sitemap-Audit: zieht /sitemap.xml von der angegebenen Base-URL, parst die
 * URLs, prüft jede via HEAD-Request und meldet 4xx/5xx.
 *
 * Aufruf:
 *   npx tsx scripts/sitemap-audit.ts --base=https://leadmonster-kappa.vercel.app
 *   npx tsx scripts/sitemap-audit.ts                   # default http://localhost:3000
 */

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

async function main() {
  const base = (parseArg('base') ?? 'http://localhost:3000').replace(/\/$/, '')
  console.log(`🔎 Sitemap-Audit gegen ${base}\n`)

  const sitemapRes = await fetch(`${base}/sitemap.xml`)
  if (!sitemapRes.ok) {
    console.error(`Sitemap nicht erreichbar: ${sitemapRes.status}`)
    process.exit(1)
  }

  const xml = await sitemapRes.text()
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1])
  console.log(`${urls.length} URLs gefunden, prüfe…\n`)

  const broken: Array<{ url: string; status: number }> = []
  let i = 0
  for (const url of urls) {
    i++
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      if (res.status >= 400) {
        broken.push({ url, status: res.status })
        console.log(`  [${i}/${urls.length}] ❌ ${res.status}  ${url}`)
      } else {
        process.stdout.write(`  [${i}/${urls.length}] ✓ ${res.status}\r`)
      }
    } catch (err) {
      broken.push({ url, status: 0 })
      console.log(`  [${i}/${urls.length}] ❌ NET  ${url} — ${err}`)
    }
  }

  console.log(`\n\nFertig. ${broken.length}/${urls.length} URLs fehlerhaft.`)
  if (broken.length > 0) {
    console.log('\nFehlerhafte URLs:')
    for (const b of broken) console.log(`  ${b.status}  ${b.url}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
