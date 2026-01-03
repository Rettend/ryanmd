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
    // Edge as fallback
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ]

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        return p
      }
    }
    catch { }
  }

  throw new Error('Could not find Chrome or Edge. Please install Chrome or specify the path manually.')
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
  const year = date.getFullYear().toString()
  const isoDate = date.toISOString().split('T')[0] || ''
  return { year, isoDate }
}

/**
 * Extract notes from the current page
 */
async function extractNotesFromPage(page: any): Promise<NoteInfo[]> {
  return page.evaluate((profileUrl: string) => {
    const notes: { slug: string, title: string, lastmod: string, url: string }[] = []
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
      // Walk up to find a containing element with date info
      let container = anchor.parentElement
      let dateText = ''
      for (let i = 0; i < 5 && container; i++) {
        const text = container.textContent || ''
        // Look for date patterns like "Jul 24, 2025" or "Dec 3, 2024"
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
function createFileContent(title: string, lastmod: string, markdown: string): string {
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

      return `---\n${newFrontmatter}\n---${rest}`
    }
  }

  const frontmatter = `---
title: ${title}
lastmod: ${lastmod}
---

`
  return frontmatter + markdown
}

async function main() {
  console.log('🚀 Starting HackMD scraper...\n')

  // Find Chrome/Edge
  const executablePath = findChrome()
  console.log(`🌐 Using browser: ${executablePath}\n`)

  // Launch browser using system Chrome/Edge
  const browser = await puppeteer.launch({
    executablePath,
    headless: false, // Show browser so you can see progress
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()

  console.log(`📄 Navigating to ${PROFILE_URL}...`)
  await page.goto(PROFILE_URL, { waitUntil: 'networkidle2', timeout: 60000 })

  // Wait for React/SPA to render
  console.log('⏳ Waiting for content to render...')
  await new Promise(r => setTimeout(r, 3000))

  // Dismiss any login popup/overlay by clicking outside or pressing Escape
  console.log('🔓 Dismissing any popups...')
  try {
    await page.keyboard.press('Escape')
    await new Promise(r => setTimeout(r, 500))
    // Also try to click outside any modal
    await page.evaluate(() => {
      // Click on any overlay/backdrop to dismiss
      const overlay = document.querySelector('[class*="overlay"], [class*="backdrop"], [class*="modal-bg"]')
      if (overlay)
        (overlay as HTMLElement).click()
      // Also remove any fixed/modal elements
      document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"]').forEach((el) => {
        if (el.classList.contains('modal') || el.classList.contains('popup')) {
          (el as HTMLElement).style.display = 'none'
        }
      })
    })
  }
  catch {
    // Ignore if no popup
  }
  await new Promise(r => setTimeout(r, 1000))

  // Debug: What's actually on the page?
  const debug = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*')
    const classes = new Set<string>()
    allElements.forEach((el) => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach((c) => {
          if (c.includes('card') || c.includes('note') || c.includes('overview') || c.includes('list')) {
            classes.add(c)
          }
        })
      }
    })

    // Also look for any links to notes
    const noteLinks = document.querySelectorAll('a[href*="/@0u1u3zEAQAO0iYWVAStEvw/"]')
    const linkInfo = Array.from(noteLinks).slice(0, 5).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent?.substring(0, 50),
      parent: a.parentElement?.className,
    }))

    return {
      classes: [...classes].join(', '),
      linkCount: noteLinks.length,
      linkInfo,
      bodyText: document.body.textContent?.substring(0, 300),
    }
  })

  console.log(`📋 Debug - Relevant classes: ${debug.classes}`)
  console.log(`📋 Debug - Note links found: ${debug.linkCount}`)
  console.log(`📋 Debug - Sample links:`, JSON.stringify(debug.linkInfo, null, 2))
  console.log(`📋 Debug - Body preview: ${debug.bodyText.substring(0, 150)}...`)

  const allNotes: NoteInfo[] = []
  const seenSlugs = new Set<string>() // For deduplication

  // Find the pagination container - look for a group of numbered buttons/links close together
  const pageCount = await page.evaluate(() => {
    // Try to find a container with multiple numbered elements (pagination pattern)
    // Look at the bottom of the page for pagination
    const candidates: HTMLElement[] = []
    document.querySelectorAll('button, a').forEach((el) => {
      const text = el.textContent?.trim() || ''
      // Page numbers should just be digits, and pagination usually has 1-10
      if (/^\d+$/.test(text)) {
        const num = Number.parseInt(text)
        if (num >= 1 && num <= 10) {
          candidates.push(el as HTMLElement)
        }
      }
    })

    // Find consecutive numbers (1, 2, 3...) - this is the pagination
    let maxPage = 1
    for (let i = 1; i <= 10; i++) {
      const hasPage = candidates.some(el => el.textContent?.trim() === String(i))
      if (hasPage)
        maxPage = i
      else break // Stop at first gap
    }

    return maxPage
  })

  console.log(`📚 Found ${pageCount} pages of notes\n`)

  // Extract notes from each page
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    console.log(`📖 Extracting page ${pageNum}/${pageCount}...`)

    if (pageNum > 1) {
      // First scroll to the bottom of the page to ensure pagination is visible
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await new Promise(r => setTimeout(r, 500))

      // Find and click the pagination button using Puppeteer's click (more reliable)
      const clicked = await page.evaluate((num: number) => {
        // Find all buttons/links with the page number
        const allClickable = document.querySelectorAll('button, a')
        let targetElement: HTMLElement | null = null

        for (const el of Array.from(allClickable)) {
          const text = el.textContent?.trim() || ''
          if (text === String(num)) {
            const rect = el.getBoundingClientRect()
            // Pagination buttons should be at the bottom and visible
            // Also check if the element is in a pagination-like container
            const parent = el.parentElement
            const isInPagination = parent && (
              parent.children.length > 3 // Multiple buttons together
              || parent.className.includes('pagination')
              || parent.className.includes('page')
            )

            if (rect.top > 300 || isInPagination) {
              // Scroll into view and click
              el.scrollIntoView({ behavior: 'instant', block: 'center' })
              targetElement = el as HTMLElement
              break
            }
          }
        }

        if (targetElement) {
          targetElement.click()
          return true
        }
        return false
      }, pageNum)

      if (!clicked) {
        console.log(`   ⚠️ Could not find button for page ${pageNum}, trying keyboard navigation...`)
        // Try using keyboard navigation as fallback (Tab + Enter)
        continue
      }

      // Wait for content to change
      await new Promise(r => setTimeout(r, 2500))

      // Scroll back to top to see new content
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await new Promise(r => setTimeout(r, 500))
    }

    const notes = await extractNotesFromPage(page)

    // Deduplicate - only add notes we haven't seen
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
      const filePath = join(yearDir, `${slug}.md`)

      await mkdir(yearDir, { recursive: true })

      const markdown = await downloadMarkdown(note.slug)
      const content = createFileContent(note.title, isoDate, markdown)

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
