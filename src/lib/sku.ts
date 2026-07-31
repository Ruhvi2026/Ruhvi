/**
 * SKU Generation Helper for Ruhvi Jewellery
 * Format: [CATEGORY_PREFIX]-[6_DIGIT_SEQUENCE] (e.g., RNG-000123)
 */

export const CATEGORY_PREFIXES: Record<string, string> = {
  rings: 'RNG',
  necklaces: 'NCK',
  earrings: 'ERG',
  bracelets: 'BCL',
  bangles: 'BNG',
  pendants: 'PDT',
  chains: 'CHN',
  anklets: 'ANK',
  'nose-pins': 'NSP',
  mangalsutra: 'MGL',
  bridal: 'BDL',
  mens: 'MEN',
  kids: 'KDS',
}

export function generateSKU(categorySlugOrPrefix: string, sequenceNumber: number): string {
  const normalizedKey = categorySlugOrPrefix.toLowerCase().trim()
  const prefix = CATEGORY_PREFIXES[normalizedKey] || normalizedKey.substring(0, 3).toUpperCase() || 'JWL'
  const paddedNumber = sequenceNumber.toString().padStart(6, '0')
  return `${prefix}-${paddedNumber}`
}
