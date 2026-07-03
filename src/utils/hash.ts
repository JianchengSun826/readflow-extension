export async function hashAnchor(text: string): Promise<string> {
  const normalized = text.trim().slice(0, 80)
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(buffer))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
