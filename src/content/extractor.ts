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

// Split element content into segments on consecutive <br> tags
function extractTextSegments(el: HTMLElement): string[] {
  const segments: string[] = []
  let current = ''
  let prevWasBr = false

  function walk(node: ChildNode) {
    if (node.nodeName === 'BR') {
      if (prevWasBr) {
        const t = current.trim()
        if (t) segments.push(t)
        current = ''
        prevWasBr = false
      } else {
        prevWasBr = true
      }
    } else {
      prevWasBr = false
      if (node.nodeType === Node.TEXT_NODE) {
        current += node.textContent ?? ''
      } else {
        for (const child of node.childNodes) walk(child)
      }
    }
  }

  for (const child of el.childNodes) walk(child)
  const last = current.trim()
  if (last) segments.push(last)
  return segments
}

export function extractParagraphs(): ParagraphElement[] {
  const root = findContentRoot()

  // Primary: semantic paragraph elements
  const primary = Array.from(
    root.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6')
  )
    .filter(el => !isExcluded(el))
    .filter(el => (el.textContent?.trim().length ?? 0) >= 10)

  if (primary.length >= 2) {
    return primary.map((el, index) => ({
      element: el as HTMLElement,
      index,
      text: el.textContent?.trim() ?? '',
      anchorHash: hashAnchorLocal(el.textContent?.trim().slice(0, 80) ?? ''),
    }))
  }

  // Fallback: leaf divs (no child divs) with substantial direct text
  const fallback: { element: HTMLElement; text: string }[] = []
  const divs = Array.from(root.querySelectorAll('div'))
    .filter(el => !isExcluded(el))
    .filter(el => !el.querySelector('div')) // leaf divs only

  for (const div of divs) {
    const segs = extractTextSegments(div as HTMLElement)
    for (const text of segs) {
      if (text.trim().length >= 10) {
        fallback.push({ element: div as HTMLElement, text: text.trim() })
      }
    }
  }

  return fallback.map(({ element, text }, index) => ({
    element,
    index,
    text,
    anchorHash: hashAnchorLocal(text.slice(0, 80)),
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
