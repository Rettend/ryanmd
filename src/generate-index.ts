import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import process from 'node:process'

const ROOT_DIR = process.cwd()
const SOURCES = ['hackmd', 'devto', 'medium']

interface Article {
  source: string
  year: string
  title: string
  filename: string
  lastmod: string
  path: string
}

async function parseArticle(
  filePath: string,
  source: string,
  year: string,
): Promise<Article | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const filename = basename(filePath, '.md')

    // Extract title from frontmatter
    let title = filename.replace(/-/g, ' ') // fallback
    let lastmod = ''

    if (content.startsWith('---')) {
      const endIdx = content.indexOf('---', 3)
      if (endIdx > 0) {
        const frontmatter = content.slice(3, endIdx)
        const titleMatch = frontmatter.match(/^title:\s*(\S.*)$/m)
        const lastmodMatch = frontmatter.match(/^lastmod:\s*(\S.*)$/m)

        if (titleMatch)
          title = titleMatch[1]?.trim() ?? title
        if (lastmodMatch)
          lastmod = lastmodMatch[1]?.trim() ?? lastmod
      }
    }

    return {
      source,
      year,
      title,
      filename,
      lastmod,
      path: `${source}/${year}/${filename}.md`,
    }
  }
  catch {
    return null
  }
}

async function scanSource(source: string): Promise<Article[]> {
  const articles: Article[] = []
  const sourceDir = join(ROOT_DIR, source)

  try {
    const years = await readdir(sourceDir)

    for (const year of years) {
      if (!/^\d{4}$/.test(year))
        continue

      const yearDir = join(sourceDir, year)
      try {
        const files = await readdir(yearDir)
        for (const file of files) {
          if (!file.endsWith('.md'))
            continue

          const article = await parseArticle(
            join(yearDir, file),
            source,
            year,
          )
          if (article)
            articles.push(article)
        }
      }
      catch {
        // Year directory doesn't exist
      }
    }
  }
  catch {
    // Source directory doesn't exist
  }

  return articles
}

function generateMarkdown(articlesBySource: Map<string, Article[]>): string {
  let md = `# RyanMD Index

**Total articles:** ${[...articlesBySource.values()].flat().length}

`

  for (const [source, articles] of articlesBySource) {
    if (articles.length === 0)
      continue

    // Group by year
    const byYear = new Map<string, Article[]>()
    for (const article of articles) {
      if (!byYear.has(article.year))
        byYear.set(article.year, [])
      byYear.get(article.year)!.push(article)
    }

    // Sort years descending
    const years = [...byYear.keys()].sort((a, b) => Number.parseInt(b) - Number.parseInt(a))

    md += `## ${source.charAt(0).toUpperCase() + source.slice(1)} (${articles.length})\n\n`

    for (const year of years) {
      const yearArticles = byYear.get(year)!
      // Sort by lastmod descending within year
      yearArticles.sort((a, b) => b.lastmod.localeCompare(a.lastmod))

      md += `### ${year} (${yearArticles.length})\n\n`

      for (const article of yearArticles) {
        md += `- [${article.title}](${article.path})`
        if (article.lastmod)
          md += ` - ${article.lastmod}`
        md += '\n'
      }

      md += '\n'
    }
  }

  return md
}

async function main() {
  console.log('📊 Generating articles index...\n')

  const articlesBySource = new Map<string, Article[]>()

  for (const source of SOURCES) {
    console.log(`📂 Scanning ${source}...`)
    const articles = await scanSource(source)
    articlesBySource.set(source, articles)
    console.log(`   Found ${articles.length} articles`)
  }

  const markdown = generateMarkdown(articlesBySource)

  const indexPath = join(ROOT_DIR, 'INDEX.md')
  await writeFile(indexPath, markdown, 'utf-8')

  console.log(`\n✅ Generated INDEX.md`)

  console.log('\n📊 Summary:')
  let total = 0
  for (const [source, articles] of articlesBySource) {
    if (articles.length > 0) {
      console.log(`   ${source}: ${articles.length} articles`)
      total += articles.length
    }
  }
  console.log(`   Total: ${total} articles`)
}

main().catch(console.error)
