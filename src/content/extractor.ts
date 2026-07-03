import { buildSentenceIndex } from '../utils/tokenizer'
import type { SentenceIndex } from '../shared/messages'

export interface ParagraphElement {
  index: number
  text: string
  element: HTMLElement
  anchorHash: Promise<string>
}

const CONTENT_SELECTORS = [
  'main', 'article', '[role="main"]',
  '.post-content', '.article-content', '.content',
  '#content', '.entry-content', '.post-body', '.article-body',
]

const EXCLUDED_SELECTOR = 'nav, header, footer, aside, [role="navigation"], [role="banner"], [role="complementary"], .sidebar, .nav, .menu'

function findContentRoot(): Element {
  for (const sel of CONTENT_SELECTORS) {
    const el = document.querySelector(sel)
    if (el && (el.textContent?.trim().length ?? 0) > 200) return el
  }
  return document.body
}

function isExcluded(el: Element): boolean {
  return el.closest(EXCLUDED_SELECTOR) !== null
}

async function hashAnchorLocal(text: string): Promise<string> {
  const normalized = text.trim().slice(0, 80)
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(buffer))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export function extractParagraphs(): ParagraphElement[] {
  const root = findContentRoot()
  const elements = Array.from(
    root.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6')
  )
  return elements
    .filter(el => !isExcluded(el))
    .filter(el => (el.textContent?.trim().length ?? 0) >= 10)
    .map((el, index) => ({
      element: el as HTMLElement,
      index,
      text: el.textContent?.trim() ?? '',
      anchorHash: hashAnchorLocal(el.textContent?.trim().slice(0, 80) ?? ''),
    }))
}

export function getFirstVisibleIndex(paragraphs: ParagraphElement[]): number {
  for (const p of paragraphs) {
    const rect = p.element.getBoundingClientRect()
    if (rect.top >= -50) return p.index  // -50px tolerance
  }
  return 0
}

export function buildPageIndex(): SentenceIndex[] {
  return buildSentenceIndex(extractParagraphs().map(p => ({ index: p.index, text: p.text })))
}
