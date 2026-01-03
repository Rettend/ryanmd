import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const USERNAME = 'ryansolid'
const OUTPUT_DIR = process.cwd()

function findChrome(): string {
  const paths = [
    `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ]

  for (const p of paths) {
    if (fs.existsSync(p))
      return p
  }

  throw new Error('Could not find Chrome or Edge.')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100)
}

function htmlToMarkdown(html: string): string {
  let md = html

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')

  // Bold and italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*')

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Code
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n')

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n')

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  // Figures
  md = md.replace(/<figure[^>]*>(.*?)<\/figure>/gis, '$1\n')
  md = md.replace(/<figcaption[^>]*>(.*?)<\/figcaption>/gi, '*$1*\n')

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+(>|$)/g, '')

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n')

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, '\'')
  md = md.replace(/&nbsp;/g, ' ')

  return md.trim()
}

async function main() {
  console.log('🚀 Starting Medium scraper...\n')

  const executablePath = findChrome()
  console.log(`🌐 Using browser: ${executablePath}\n`)

  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1400,900',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  )

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const profileUrl = `https://${USERNAME}.medium.com/`
  console.log(`📄 Navigating to ${profileUrl}...`)
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 4000))

  // Scroll to load all articles (infinite scroll)
  console.log('⏳ Scrolling to load all articles...')
  let previousHeight = 0
  let scrollAttempts = 0
  const maxScrollAttempts = 20

  while (scrollAttempts < maxScrollAttempts) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)

    if (currentHeight === previousHeight) {
      await new Promise(r => setTimeout(r, 2000))
      const finalHeight = await page.evaluate(() => document.body.scrollHeight)
      if (finalHeight === currentHeight) {
        console.log('   Reached end of page')
        break
      }
    }

    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(r => setTimeout(r, 1500))
    scrollAttempts++
    console.log(`   Scroll ${scrollAttempts}...`)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await new Promise(r => setTimeout(r, 1000))

  // Extract article links
  console.log('📋 Extracting article links...')
  const articles = await page.evaluate((username: string) => {
    const allLinks = document.querySelectorAll('a')
    const seen = new Set<string>()
    const results: { title: string, url: string }[] = []

    for (const link of Array.from(allLinks)) {
      const href = link.href

      // Match Medium article URLs: username.medium.com/article-slug-hash
      const articlePattern = new RegExp(`${username}\\.medium\\.com/[a-z0-9-]+-[a-f0-9]+`, 'i')
      if (!articlePattern.test(href))
        continue

      const cleanUrl = href.split('?')[0]
      if (!cleanUrl || seen.has(cleanUrl))
        continue
      seen.add(cleanUrl)

      // Get title from heading inside link
      const heading = link.querySelector('h2, h3, h1')
      const title = heading?.textContent?.trim() || ''

      if (title && cleanUrl) {
        results.push({ title, url: cleanUrl })
      }
    }

    return results
  }, USERNAME)

  console.log(`   Found ${articles.length} articles\n`)

  // Download each article
  console.log('📥 Downloading articles...\n')
  let successCount = 0
  let errorCount = 0

  for (const article of articles) {
    try {
      await page.goto(article.url, { waitUntil: 'networkidle2', timeout: 60000 })
      await new Promise(r => setTimeout(r, 2000))

      // Extract content from article sections
      const content = await page.evaluate(() => {
        const articleEl = document.querySelector('article')
        if (!articleEl)
          return ''

        const sections = articleEl.querySelectorAll('section')
        let html = ''
        sections.forEach((section) => {
          html += section.innerHTML
        })
        return html
      })

      // Get title from page (more reliable than list)
      const pageTitle = await page.evaluate(() => {
        const h1 = document.querySelector('article h1')
        return h1?.textContent?.trim() || ''
      })

      const title = pageTitle || article.title

      // Get date from article page
      let year = 'undated'
      let isoDate = ''

      const pageDateText = await page.evaluate(() => {
        const spans = document.querySelectorAll('article span')
        for (const span of Array.from(spans)) {
          const text = span.textContent || ''
          const match = text.match(
            /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
          )
          if (match)
            return match[0]
        }
        return ''
      })

      if (pageDateText) {
        try {
          const parsed = new Date(pageDateText)
          year = parsed.getFullYear().toString()
          isoDate = parsed.toISOString().split('T')[0] || ''
        }
        catch {}
      }

      const slug = slugify(title)
      const markdown = htmlToMarkdown(content)

      const yearDir = join(OUTPUT_DIR, 'medium', year)
      await mkdir(yearDir, { recursive: true })

      const fileContent = `---
title: ${title}
lastmod: ${isoDate}
source: ${article.url}
---

${markdown}`

      const filePath = join(yearDir, `${slug}.md`)
      await writeFile(filePath, fileContent, 'utf-8')

      console.log(`✅ medium/${year}/${slug}.md`)
      successCount++

      await new Promise(r => setTimeout(r, 500))
    }
    catch (error) {
      console.error(`❌ Failed: ${article.title}`, error)
      errorCount++
    }
  }

  await browser.close()
  console.log(`\n🎉 Done! Downloaded ${successCount} articles, ${errorCount} errors.`)
}

main().catch(console.error)
