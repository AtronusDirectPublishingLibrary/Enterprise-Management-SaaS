import crypto from "crypto";

/**
 * Minimal RFC 6238 TOTP helper (SHA-1, 30-second step, 6 digits).
 * Kept dependency-free so authenticator apps work without new packages.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateMfaSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function codeAt(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buffer.writeUInt32BE(counter % 0x1_0000_0000, 4);
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totpCode(secret: string, at: number = Date.now(), stepSeconds = 30, digits = 6): string {
  return codeAt(secret, Math.floor(at / 1000 / stepSeconds), digits);
}

/** Accepts the current code plus one step either side for clock drift. */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const code = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let drift = -window; drift <= window; drift++) {
    const candidate = codeAt(secret, counter + drift);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(code))) return true;
  }
  return false;
}

export function otpauthUrl(input: { secret: string; account: string; issuer?: string }): string {
  const issuer = input.issuer || "Ethio-Biopharma";
  const label = `${issuer}:${input.account}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
