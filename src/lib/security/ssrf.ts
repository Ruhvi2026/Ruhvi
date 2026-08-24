import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF protection for outbound HTTP(S) requests.
 *
 * Validates that a client-supplied URL is a safe external endpoint by:
 *   - Requiring http/https protocols
 *   - Rejecting embedded credentials
 *   - Blocking reserved/internal hostnames (localhost, .local, .internal, ...)
 *   - Resolving the hostname and rejecting any address in private, loopback,
 *     link-local, multicast, CGNAT, documentation, or cloud-metadata ranges
 *   - Recognizing obfuscated numeric IPv4 forms (hex/octal/short notation)
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const U32 = BigInt(0xffffffff);
const SHIFT_16 = BigInt(16);
const SHIFT_32 = BigInt(32);
const SHIFT_64 = BigInt(64);
const SHIFT_80 = BigInt(80);
const SHIFT_96 = BigInt(96);
const SHIFT_100 = BigInt(100);
const SHIFT_112 = BigInt(112);
const SHIFT_118 = BigInt(118);
const SHIFT_120 = BigInt(120);
const SHIFT_121 = BigInt(121);

function isPrivateIpv4(a: number, b: number, c: number, d: number): boolean {
  if (a === 0) return true; // "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (incl. Alibaba metadata)
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // documentation
  if (a === 192 && b === 88 && c === 99) return true; // 6to4 relay anycast
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // documentation
  if (a === 203 && b === 0 && c === 113) return true; // documentation
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIpv4FromUint32(v: number): boolean {
  return isPrivateIpv4(
    (v >>> 24) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 8) & 0xff,
    v & 0xff
  );
}

function ipv6ToBigInt(ip: string): bigint {
  let addr = ip;
  let ipv4Hi16: number | null = null;
  let ipv4Lo16: number | null = null;

  if (addr.includes('.')) {
    const lastColon = addr.lastIndexOf(':');
    if (lastColon === -1) throw new Error('Invalid IPv6 address');
    const tail = addr.slice(lastColon + 1);
    const parts = tail.split('.').map((n) => Number(n));
    if (
      parts.length !== 4 ||
      parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
      throw new Error('Invalid IPv4 tail in IPv6 address');
    }
    ipv4Hi16 = (parts[0] << 8) | parts[1];
    ipv4Lo16 = (parts[2] << 8) | parts[3];
    addr = addr.slice(0, lastColon + 1);
  }

  let groups: number[];
  const doubleColonIdx = addr.indexOf('::');
  if (doubleColonIdx !== -1) {
    const leftRaw = addr.slice(0, doubleColonIdx);
    const rightRaw = addr.slice(doubleColonIdx + 2);
    const left = leftRaw === '' ? [] : leftRaw.split(':').filter(Boolean);
    const right = rightRaw === '' ? [] : rightRaw.split(':').filter(Boolean);
    const missing =
      8 - left.length - right.length - (ipv4Hi16 !== null ? 2 : 0);
    if (missing < 1) throw new Error('Invalid IPv6 address');
    groups = [
      ...left.map((g) => parseInt(g, 16)),
      ...Array(missing).fill(0),
      ...right.map((g) => parseInt(g, 16)),
    ];
  } else {
    groups = addr.split(':').map((g) => parseInt(g, 16));
  }

  if (groups.length !== 8 - (ipv4Hi16 !== null ? 2 : 0)) {
    throw new Error('Invalid IPv6 address');
  }

  let result = BigInt(0);
  for (const g of groups) {
    result = (result << SHIFT_16) | BigInt(g);
  }
  if (ipv4Hi16 !== null && ipv4Lo16 !== null) {
    result = (result << SHIFT_16) | BigInt(ipv4Hi16);
    result = (result << SHIFT_16) | BigInt(ipv4Lo16);
  }
  return result;
}

function isPrivateIpv6(big: bigint): boolean {
  if (big === BigInt(0)) return true; // unspecified ::
  if (big === BigInt(1)) return true; // loopback ::1

  const top32 = big >> SHIFT_96;
  const top16 = big >> SHIFT_112;
  const top7 = big >> SHIFT_121;
  const top10 = big >> SHIFT_118;
  const top8 = big >> SHIFT_120;
  const top64 = big >> SHIFT_64;
  const top28 = big >> SHIFT_100;
  const top48 = big >> SHIFT_80;

  const embeddedIpv4 = (v: bigint): boolean =>
    isPrivateIpv4FromUint32(Number(v & U32));

  if (top32 === BigInt(0xffff)) return embeddedIpv4(big); // ::ffff:0:0/96
  if (top32 === BigInt(0)) return embeddedIpv4(big); // IPv4-compatible ::/96
  if (top48 === BigInt(0x64ff9b0001)) {
    return embeddedIpv4(big >> SHIFT_32); // 64:ff9b:1::/48 local-use NAT64
  }
  if (top32 === BigInt(0x64ff9b)) return embeddedIpv4(big); // 64:ff9b::/96 NAT64
  if (top32 === BigInt(0x20010000)) {
    // 2001::/32 Teredo — client IPv4 is in bits 0-31, XOR-obfuscated with 0xffffffff
    return embeddedIpv4((big & U32) ^ U32);
  }
  if (top16 === BigInt(0x2002)) return embeddedIpv4(big >> SHIFT_16); // 2002::/16 6to4
  if (top7 === BigInt(0x7e)) return true; // fc00::/7 unique local
  if (top10 === BigInt(0x3fa)) return true; // fe80::/10 link-local
  if (top8 === BigInt(0xff)) return true; // ff00::/8 multicast
  if (top64 === BigInt(0x100)) return true; // 100::/64 discard-only
  if (top28 === BigInt(0x2001001)) return true; // 2001:10::/28 ORCHIDv1
  if (top28 === BigInt(0x2001002)) return true; // 2001:20::/28 ORCHIDv2
  if (top32 === BigInt(0x20010db8)) return true; // 2001:db8::/32 documentation
  return false;
}

/**
 * Returns true when the IP literal is in a blocked (non-public) range.
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b, c, d] = ip.split('.').map(Number);
    return isPrivateIpv4(a, b, c, d);
  }
  if (version === 6) {
    try {
      return isPrivateIpv6(ipv6ToBigInt(ip));
    } catch {
      return true; // fail closed when we cannot parse
    }
  }
  return true; // not a valid IP literal
}

const RESERVED_HOSTNAME_RE =
  /\.(localhost|local|internal|localdomain|home|lan|corp)$/i;

function isReservedHostname(hostname: string): string | null {
  const host = hostname.replace(/\.+$/, '').toLowerCase();
  if (!host) return 'empty hostname';
  if (host === 'localhost') return 'localhost';
  if (host === 'metadata.google.internal') return 'cloud metadata hostname';
  if (RESERVED_HOSTNAME_RE.test(host)) return 'reserved internal hostname';
  return null;
}

function parseOctet(part: string): number {
  if (/^0[xX][0-9a-fA-F]+$/.test(part)) return parseInt(part.slice(2), 16);
  if (/^0[0-7]+$/.test(part)) return parseInt(part, 8);
  return parseInt(part, 10);
}

/**
 * Converts obfuscated numeric hostnames (e.g. 2130706433, 0x7f000001,
 * 0177.0.0.1, 127.1) into a canonical dotted-quad IPv4, or null when the
 * hostname is not a numeric IP form.
 */
export function parsePotentialIpv4(hostname: string): string | null {
  const host = hostname.replace(/\.+$/, '');
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length > 4) return null;
  if (!parts.every((p) => /^(0[xX][0-9a-fA-F]+|0[0-7]+|\d+)$/.test(p))) {
    return null;
  }
  const nums = parts.map(parseOctet);
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 1) {
    if (nums[0] > 0xffffffff) return null;
    return `${(nums[0] >>> 24) & 0xff}.${(nums[0] >>> 16) & 0xff}.${
      (nums[0] >>> 8) & 0xff
    }.${nums[0] & 0xff}`;
  }
  if (parts.length === 2) {
    if (nums[0] > 0xff || nums[1] > 0xffffff) return null;
    return `${nums[0]}.${(nums[1] >>> 16) & 0xff}.${(nums[1] >>> 8) & 0xff}.${
      nums[1] & 0xff
    }`;
  }
  if (parts.length === 3) {
    if (nums[0] > 0xff || nums[1] > 0xff || nums[2] > 0xffff) return null;
    return `${nums[0]}.${nums[1]}.${(nums[2] >>> 8) & 0xff}.${nums[2] & 0xff}`;
  }
  if (nums.some((n) => n > 0xff)) return null;
  return nums.join('.');
}

/**
 * Validates a URL for safe outbound requests. Resolves DNS and rejects any
 * address that is private, loopback, link-local, multicast, CGNAT, reserved,
 * or documentation space. Throws UnsafeUrlError when the target is blocked.
 *
 * NOTE: Like most DNS-based SSRF guards, this has a residual DNS-rebinding
 * window between the validation lookup here and the address(es) the HTTP
 * client resolves again at connect time. safeFetch re-validates each redirect
 * hop, which closes cross-hop rebinding, but a malicious hostname can still
 * answer the validation query with a public IP and the connect query with an
 * internal one. Fully closing that requires pinning the connection to the
 * validated address (not done here).
 */
export async function assertSafeOutboundUrl(
  input: string,
  opts: { allowPrivate?: boolean } = {}
): Promise<URL> {
  const allowPrivate = opts.allowPrivate ?? false;

  let url: URL;
  try {
    url = new URL(String(input).trim());
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http:// and https:// URLs are allowed');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with embedded credentials are not allowed');
  }

  let host = url.hostname;
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  host = host.replace(/\.+$/, '');

  if (!host) throw new UnsafeUrlError('URL is missing a host');

  const blockedReason = isReservedHostname(host);
  if (blockedReason) {
    throw new UnsafeUrlError(`URL host is blocked (${blockedReason})`);
  }

  const ipsToCheck = new Set<string>();
  const ipVersion = isIP(host);
  if (ipVersion !== 0) {
    ipsToCheck.add(host);
  } else {
    const numericIp = parsePotentialIpv4(host);
    if (numericIp) {
      ipsToCheck.add(numericIp);
    } else {
      let resolved = false;
      try {
        const records = await lookup(host, { all: true, verbatim: true });
        for (const r of records) {
          ipsToCheck.add(r.address);
          resolved = true;
        }
      } catch {
        resolved = false;
      }
      if (!resolved || ipsToCheck.size === 0) {
        throw new UnsafeUrlError(`Unable to resolve host '${host}'`);
      }
    }
  }

  if (!allowPrivate) {
    for (const ip of ipsToCheck) {
      if (isPrivateIp(ip)) {
        throw new UnsafeUrlError(`URL resolves to a blocked address (${ip})`);
      }
    }
  }

  return url;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * fetch() that validates the initial URL and every redirect hop against the
 * SSRF rules before issuing the request. Redirects to internal addresses are
 * blocked instead of followed.
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {},
  opts: { maxRedirects?: number; allowPrivate?: boolean } = {}
): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? 5;
  let current = url;

  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    await assertSafeOutboundUrl(current, opts);

    const res = await fetch(current, { ...init, redirect: 'manual' });

    if (REDIRECT_STATUSES.has(res.status)) {
      const location = res.headers.get('location');
      if (!location) return res;
      current = new URL(location, current).toString();
      if (redirects === maxRedirects) return res;
      await res.arrayBuffer().catch(() => undefined);
      continue;
    }

    return res;
  }

  throw new UnsafeUrlError('Too many redirects');
}
