import { describe, it, expect } from 'vitest'
import { hashAnchor } from './hash'

describe('hashAnchor', () => {
  it('returns a 16-char hex string', async () => {
    const result = await hashAnchor('这是一段测试文字')
    expect(result).toHaveLength(16)
    expect(result).toMatch(/^[0-9a-f]{16}$/)
  })

  it('same input returns same hash', async () => {
    const a = await hashAnchor('相同的文字')
    const b = await hashAnchor('相同的文字')
    expect(a).toBe(b)
  })

  it('different inputs return different hashes', async () => {
    const a = await hashAnchor('文字A')
    const b = await hashAnchor('文字B')
    expect(a).not.toBe(b)
  })

  it('trims to 80 chars before hashing', async () => {
    const short = 'a'.repeat(80)
    const long = 'a'.repeat(80) + 'extra'
    expect(await hashAnchor(short)).toBe(await hashAnchor(long))
  })
})
