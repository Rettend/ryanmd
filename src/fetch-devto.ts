import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

const USERNAME = 'ryansolid'
const OUTPUT_DIR = process.cwd()

interface DevToArticle {
  id: number
  title: string
  description: string
  slug: string
  url: string
  published_at: string
  body_markdown?: string
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

async function fetchAllArticles(): Promise<DevToArticle[]> {
  const articles: DevToArticle[] = []
  let page = 1
  const perPage = 100

  console.log(`📡 Fetching articles from dev.to/@${USERNAME}...`)

  while (true) {
    const url = `https://dev.to/api/articles?username=${USERNAME}&per_page=${perPage}&page=${page}`
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Failed to fetch page ${page}: ${res.status}`)
    }

    const data = (await res.json()) as DevToArticle[]
    if (data.length === 0)
      break

    articles.push(...data)
    console.log(`   Page ${page}: ${data.length} articles`)

    if (data.length < perPage)
      break
    page++

    await new Promise(r => setTimeout(r, 200))
  }

  return articles
}

async function fetchArticleContent(id: number): Promise<string> {
  const url = `https://dev.to/api/articles/${id}`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch article ${id}: ${res.status}`)
  }

  const data = (await res.json()) as DevToArticle
  return data.body_markdown || ''
}

function createFileContent(
  title: string,
  lastmod: string,
  markdown: string,
  sourceUrl: string,
): string {
  // Clean up the markdown - remove existing frontmatter if present
  let cleanedMarkdown = markdown
  if (markdown.startsWith('---')) {
    const endOfFrontmatter = markdown.indexOf('---', 3)
    if (endOfFrontmatter !== -1) {
      cleanedMarkdown = markdown.slice(endOfFrontmatter + 3).trim()
    }
  }

  const frontmatter = `---
title: ${title}
lastmod: ${lastmod}
source: ${sourceUrl}
---

`
  return frontmatter + cleanedMarkdown
}

async function main() {
  console.log('🚀 Starting dev.to scraper...\n')

  const articles = await fetchAllArticles()
  console.log(`\n✅ Found ${articles.length} articles\n`)

  console.log('📥 Downloading article content...\n')

  let successCount = 0
  let errorCount = 0

  for (const article of articles) {
    try {
      const pubDate = new Date(article.published_at)
      const year = pubDate.getFullYear().toString()
      const isoDate = pubDate.toISOString().split('T')[0] || ''

      const slug = slugify(article.title)
      const yearDir = join(OUTPUT_DIR, 'devto', year)

      await mkdir(yearDir, { recursive: true })

      const markdown = await fetchArticleContent(article.id)
      const content = createFileContent(
        article.title,
        isoDate,
        markdown,
        article.url,
      )

      const filePath = join(yearDir, `${slug}.md`)
      await writeFile(filePath, content, 'utf-8')

      console.log(`✅ devto/${year}/${slug}.md`)
      successCount++

      // Rate limit
      await new Promise(r => setTimeout(r, 100))
    }
    catch (error) {
      console.error(`❌ Failed: ${article.title}`, error)
      errorCount++
    }
  }

  console.log(
    `\n🎉 Done! Downloaded ${successCount} articles, ${errorCount} errors.`,
  )
}

main().catch(console.error)
