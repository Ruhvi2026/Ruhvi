/**
 * Generates an ultra-compact 6-digit numeric barcode (e.g. 260725).
 * Code 128 subset C automatically pairs digits, creating a very short/narrow barcode
 * that fits perfectly on miniature jewellery tags and labels.
 */
export function generateCompactNumericBarcode(sku: string): string {
  const digits = sku.replace(/\D/g, '');
  let numPart = '';
  if (digits.length >= 4) {
    numPart = digits.slice(-4);
  } else if (digits.length > 0) {
    numPart = digits.padStart(4, '0');
  } else {
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
      hash = (hash * 31 + sku.charCodeAt(i)) % 10000;
    }
    numPart = Math.abs(hash).toString().padStart(4, '0');
  }
  return `26${numPart}`;
}
