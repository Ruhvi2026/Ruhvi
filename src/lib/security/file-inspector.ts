// ==============================================================================
// Ruhvi File Security & Quarantine Inspector
// Zero-Cost, In-House Deep Magic-Byte & Malware Polyglot Sanitizer
// Architecture Reference: RUHVI_SECURITY_INTELLIGENCE_WORKER_IMPLEMENTATION_SPEC.md
// ==============================================================================

export interface FileInspectionResult {
  safe: boolean;
  originalFilename: string;
  originalMime: string;
  detectedMime: string;
  fileSizeBytes: number;
  sha256: string;
  threat?: string;
  reason?: string;
}

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.phtml',
  '.js',
  '.vbs',
  '.ps1',
  '.jar',
  '.scr',
  '.dll',
  '.cgi',
  '.asp',
  '.aspx',
];

const DANGEROUS_SCRIPT_PATTERNS = [
  /<\s*script/i,
  /javascript\s*:/i,
  /on\w+\s*=/i, // e.g. onload=, onerror=, onclick=
  /<\s*\?\s*php/i,
  /eval\s*\(/i,
  /base64_decode/i,
  /document\.cookie/i,
  /window\.location/i,
  /data\s*:\s*text\/html/i,
];

export async function computeBufferSha256(buffer: Uint8Array): Promise<string> {
  const copy = new Uint8Array(buffer);
  const hash = await crypto.subtle.digest(
    'SHA-256',
    copy.buffer as ArrayBuffer
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function detectMagicMime(buffer: Uint8Array): string | null {
  // Check WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // Check known headers
  for (const [mime, signature] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= signature.length) {
      let match = true;
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          match = false;
          break;
        }
      }
      if (match) return mime;
    }
  }

  // Check SVG (text based: starts with <svg or <?xml ... <svg)
  try {
    const headerText = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer.slice(0, 512))
      .trim();
    if (
      headerText.startsWith('<svg') ||
      (headerText.startsWith('<?xml') && headerText.includes('<svg'))
    ) {
      return 'image/svg+xml';
    }
  } catch {}

  return null;
}

export async function inspectFilePayload(
  filename: string,
  declaredMime: string,
  buffer: Uint8Array
): Promise<FileInspectionResult> {
  const sha256 = await computeBufferSha256(buffer);
  const lowerName = filename.toLowerCase();

  // 1. Check dangerous / double extensions
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lowerName.endsWith(ext) || lowerName.includes(`${ext}.`)) {
      return {
        safe: false,
        originalFilename: filename,
        originalMime: declaredMime,
        detectedMime: 'application/x-executable',
        fileSizeBytes: buffer.byteLength,
        sha256,
        threat: 'malicious_executable_extension',
        reason: `File contains forbidden executable extension: ${ext}`,
      };
    }
  }

  // 2. Magic byte verification
  const detectedMime = detectMagicMime(buffer);
  if (!detectedMime) {
    return {
      safe: false,
      originalFilename: filename,
      originalMime: declaredMime,
      detectedMime: 'application/octet-stream',
      fileSizeBytes: buffer.byteLength,
      sha256,
      threat: 'unrecognized_magic_bytes',
      reason:
        'File binary header does not match any allowed image or document format',
    };
  }

  // 3. MIME mismatch check (e.g. declaring image/jpeg but actually PDF or SVG)
  const isImageMime =
    declaredMime.startsWith('image/') || declaredMime === 'application/pdf';
  if (
    isImageMime &&
    declaredMime !== detectedMime &&
    !(declaredMime === 'image/jpg' && detectedMime === 'image/jpeg')
  ) {
    return {
      safe: false,
      originalFilename: filename,
      originalMime: declaredMime,
      detectedMime,
      fileSizeBytes: buffer.byteLength,
      sha256,
      threat: 'mime_type_spoofing',
      reason: `Declared MIME '${declaredMime}' does not match detected binary signature '${detectedMime}'`,
    };
  }

  // 4. SVG & XML Script Injection Scan
  if (detectedMime === 'image/svg+xml') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    for (const pattern of DANGEROUS_SCRIPT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          safe: false,
          originalFilename: filename,
          originalMime: declaredMime,
          detectedMime,
          fileSizeBytes: buffer.byteLength,
          sha256,
          threat: 'embedded_script_payload',
          reason: `SVG image contains dangerous active script pattern: ${pattern.toString()}`,
        };
      }
    }
  }

  // 5. Binary Polyglot check (search for embedded PHP / script tags inside binary files)
  if (detectedMime.startsWith('image/')) {
    const preview = new TextDecoder('ascii', { fatal: false }).decode(
      buffer.slice(0, Math.min(buffer.length, 4096))
    );
    if (/<\?php/i.test(preview) || /<script/i.test(preview)) {
      return {
        safe: false,
        originalFilename: filename,
        originalMime: declaredMime,
        detectedMime,
        fileSizeBytes: buffer.byteLength,
        sha256,
        threat: 'polyglot_payload',
        reason: 'Image contains embedded PHP script tags or HTML script blocks',
      };
    }
  }

  return {
    safe: true,
    originalFilename: filename,
    originalMime: declaredMime,
    detectedMime,
    fileSizeBytes: buffer.byteLength,
    sha256,
  };
}
