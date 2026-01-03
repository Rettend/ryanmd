import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const PROFILE_URL = 'https://hackmd.io/@0u1u3zEAQAO0iYWVAStEvw'
const OUTPUT_DIR = process.cwd()

interface NoteInfo {
  slug: string
  title: string
  lastmod: string
  url: string
}

/**
 * Find Chrome executable on Windows
 */
function findChrome(): string {
  const paths = [
    `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ]

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  throw new Error('Could not find Chrome or Edge.')
}

/**
 * Convert a title to a URL-friendly slug
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

/**
 * Parse a date string like "Jul 11, 2023" into "2023-07-11"
 */
function parseDate(dateStr: string): { year: string, isoDate: string } {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    const now = new Date()
    return {
      year: now.getFullYear().toString(),
      isoDate: now.toISOString().split('T')[0] || '',
    }
  }
  return {
    year: date.getFullYear().toString(),
    isoDate: date.toISOString().split('T')[0] || '',
  }
}

/**
 * Extract notes from the current page
 */
async function extractNotesFromPage(page: any): Promise<NoteInfo[]> {
  return page.evaluate((profileUrl: string) => {
    const notes: NoteInfo[] = []
    const seenSlugs = new Set<string>()

    // Find all links that point to notes (not edit links)
    const noteLinks = document.querySelectorAll(`a[href^="${profileUrl}/"]`)

    noteLinks.forEach((link: Element) => {
      const anchor = link as HTMLAnchorElement
      const href = anchor.getAttribute('href') || ''

      // Skip edit links and comment links
      if (href.includes('/edit') || href.includes('?comment'))
        return

      // Extract slug from URL
      const slug = href.split('/').pop() || ''
      if (!slug || seenSlugs.has(slug))
        return
      seenSlugs.add(slug)

      // Get the title from the link text
      const title = anchor.textContent?.trim() || slug

      // Find the parent card/row to get the date
      let container = anchor.parentElement
      let dateText = ''
      for (let i = 0; i < 5 && container; i++) {
        const text = container.textContent || ''
        const dateMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i)
        if (dateMatch) {
          dateText = dateMatch[0]
          break
        }
        container = container.parentElement
      }

      notes.push({
        slug,
        title,
        lastmod: dateText,
        url: anchor.href,
      })
    })

    return notes
  }, PROFILE_URL)
}

/**
 * Download the markdown content for a note
 */
async function downloadMarkdown(slug: string): Promise<string> {
  const url = `${PROFILE_URL}/${slug}.md`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

/**
 * Create frontmatter and combine with markdown content
 */
function createFileContent(title: string, lastmod: string, sourceUrl: string, markdown: string): string {
  const hasFrontmatter = markdown.trimStart().startsWith('---')

  if (hasFrontmatter) {
    const endOfFrontmatter = markdown.indexOf('---', 3)
    if (endOfFrontmatter > 0) {
      const existingFrontmatter = markdown.slice(3, endOfFrontmatter).trim()
      const rest = markdown.slice(endOfFrontmatter + 3)

      const hasTitle = /^title:/m.test(existingFrontmatter)
      const hasLastmod = /^lastmod:/m.test(existingFrontmatter)

      let newFrontmatter = existingFrontmatter
      if (!hasTitle) {
        newFrontmatter = `title: ${title}\n${newFrontmatter}`
      }
      if (!hasLastmod && lastmod) {
        newFrontmatter = `${newFrontmatter}\nlastmod: ${lastmod}`
      }
      // Always add source at the end
      newFrontmatter = `${newFrontmatter}\nsource: ${sourceUrl}`

      return `---\n${newFrontmatter}\n---${rest}`
    }
  }

  return `---
title: ${title}
lastmod: ${lastmod}
source: ${sourceUrl}
---

${markdown}`
}

async function main() {
  console.log('🚀 Starting HackMD scraper...\n')

  const executablePath = findChrome()
  console.log(`🌐 Using browser: ${executablePath}\n`)

  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()

  console.log(`📄 Navigating to ${PROFILE_URL}...`)
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle2', timeout: 60000 })

  // Wait for React/SPA to render
  console.log('⏳ Waiting for content to render...')
  await new Promise(r => setTimeout(r, 3000))

  // Dismiss any login popup by pressing Escape
  await page.keyboard.press('Escape')
  await new Promise(r => setTimeout(r, 1000))

  const allNotes: NoteInfo[] = []
  const seenSlugs = new Set<string>()

  // Detect pagination by looking for consecutive numbered buttons/links
  const pageCount = await page.evaluate(() => {
    const candidates: string[] = []
    document.querySelectorAll('button, a').forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (/^\d+$/.test(text)) {
        const num = Number.parseInt(text)
        if (num >= 1 && num <= 10) {
          candidates.push(text)
        }
      }
    })

    // Find consecutive numbers (1, 2, 3...) - this is the pagination
    let maxPage = 1
    for (let i = 1; i <= 10; i++) {
      if (candidates.includes(String(i)))
        maxPage = i
      else break
    }
    return maxPage
  })

  console.log(`📚 Found ${pageCount} pages of notes\n`)

  // Extract notes from each page
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    console.log(`📖 Extracting page ${pageNum}/${pageCount}...`)

    if (pageNum > 1) {
      // Scroll to bottom to ensure pagination is visible
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(r => setTimeout(r, 500))

      // Click the pagination link
      await page.evaluate((num: number) => {
        for (const el of Array.from(document.querySelectorAll('a'))) {
          if (el.textContent?.trim() === String(num)) {
            const rect = el.getBoundingClientRect()
            // Pagination links are typically at the bottom
            if (rect.top > 300) {
              el.scrollIntoView({ behavior: 'instant', block: 'center' })
              el.click()
              return
            }
          }
        }
      }, pageNum)

      // Wait for content to change
      await new Promise(r => setTimeout(r, 2500))

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0))
      await new Promise(r => setTimeout(r, 500))
    }

    const notes = await extractNotesFromPage(page)

    // Deduplicate
    let newNotes = 0
    for (const note of notes) {
      if (!seenSlugs.has(note.slug)) {
        seenSlugs.add(note.slug)
        allNotes.push(note)
        newNotes++
      }
    }
    console.log(`   Found ${notes.length} notes (${newNotes} new)`)
  }

  await browser.close()

  console.log(`\n✅ Found ${allNotes.length} total notes\n`)
  console.log('📥 Downloading markdown files...\n')

  // Download and save each note
  let successCount = 0
  let errorCount = 0

  for (const note of allNotes) {
    try {
      const { year, isoDate } = parseDate(note.lastmod)
      const slug = slugify(note.title)
      const yearDir = join(OUTPUT_DIR, 'hackmd', year)

      await mkdir(yearDir, { recursive: true })

      const sourceUrl = `${PROFILE_URL}/${note.slug}`
      const markdown = await downloadMarkdown(note.slug)
      const content = createFileContent(note.title, isoDate, sourceUrl, markdown)

      const filePath = join(yearDir, `${slug}.md`)
      await writeFile(filePath, content, 'utf-8')

      console.log(`✅ ${year}/${slug}.md`)
      successCount++

      await new Promise(r => setTimeout(r, 200))
    }
    catch (error) {
      console.error(`❌ Failed: ${note.title} (${note.slug})`, error)
      errorCount++
    }
  }

  console.log(`\n🎉 Done! Downloaded ${successCount} notes, ${errorCount} errors.`)
}

main().catch(console.error)
