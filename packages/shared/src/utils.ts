import * as utils from "@noble/curves/abstract/utils";
import * as secp from "@noble/curves/secp256k1";
import { sha256 as sha2 } from "@noble/hashes/sha256";
import { bech32 } from "@scure/base";

export function unwrap<T>(v: T | undefined | null): T {
  if (v === undefined || v === null) {
    throw new Error("missing value");
  }
  return v;
}

/**
 * Convert hex to bech32
 */
export function hexToBech32(hrp: string, hex?: string) {
  if (typeof hex !== "string" || hex.length === 0 || hex.length % 2 !== 0) {
    return "";
  }

  try {
    const buf = utils.hexToBytes(hex);
    return bech32.encode(hrp, bech32.toWords(buf));
  } catch (e) {
    console.warn("Invalid hex", hex, e);
    return "";
  }
}

export function sanitizeRelayUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    // ignore
  }
}

export function unixNow() {
  return Math.floor(unixNowMs() / 1000);
}

export function unixNowMs() {
  return new Date().getTime();
}

export function jitter(n: number) {
  return n * 2 * Math.random() - n;
}

export function deepClone<T>(obj: T) {
  if ("structuredClone" in window) {
    return structuredClone(obj);
  } else {
    return JSON.parse(JSON.stringify(obj));
  }
}

export function deepEqual(x: any, y: any): boolean {
  const ok = Object.keys,
    tx = typeof x,
    ty = typeof y;

  return x && y && tx === "object" && tx === ty
    ? ok(x).length === ok(y).length && ok(x).every(key => deepEqual(x[key], y[key]))
    : x === y;
}

export function countMembers(a: any) {
  let ret = 0;
  for (const [k, v] of Object.entries(a)) {
    if (Array.isArray(v)) {
      ret += v.length;
    }
  }
  return ret;
}

export function equalProp(
  a: string | number | Array<string | number> | undefined,
  b: string | number | Array<string | number> | undefined,
) {
  if ((a !== undefined && b === undefined) || (a === undefined && b !== undefined)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    if (!a.every(v => b.includes(v))) {
      return false;
    }
  }
  return a === b;
}

/**
 * Compute the "distance" between two objects by comparing their difference in properties
 * Missing/Added keys result in +10 distance
 * This is not recursive
 */
export function distance(a: any, b: any): number {
  const keys1 = Object.keys(a);
  const keys2 = Object.keys(b);
  const maxKeys = keys1.length > keys2.length ? keys1 : keys2;

  let distance = 0;
  for (const key of maxKeys) {
    if (key in a && key in b) {
      if (Array.isArray(a[key]) && Array.isArray(b[key])) {
        const aa = a[key] as Array<string | number>;
        const bb = b[key] as Array<string | number>;
        if (aa.length === bb.length) {
          if (aa.some(v => !bb.includes(v))) {
            distance++;
          }
        } else {
          distance++;
        }
      } else if (a[key] !== b[key]) {
        distance++;
      }
    } else {
      distance += 10;
    }
  }

  return distance;
}

export function dedupe<T>(v: Array<T>) {
  return [...new Set(v)];
}

export function appendDedupe<T>(a?: Array<T>, b?: Array<T>) {
  return dedupe([...(a ?? []), ...(b ?? [])]);
}

export const sha256 = (str: string | Uint8Array): string => {
  return utils.bytesToHex(sha2(str));
};

export function getPublicKey(privKey: string) {
  return utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
}

export function bech32ToHex(str: string) {
  try {
    const nKey = bech32.decode(str, 1_000);
    const buff = bech32.fromWords(nKey.words);
    return utils.bytesToHex(Uint8Array.from(buff));
  } catch (e) {
    return str;
  }
}

/**
 * Decode bech32 to string UTF-8
 * @param str bech32 encoded string
 * @returns
 */
export function bech32ToText(str: string) {
  try {
    const decoded = bech32.decode(str, 1000);
    const buf = bech32.fromWords(decoded.words);
    return new TextDecoder().decode(Uint8Array.from(buf));
  } catch {
    return "";
  }
}

export async function fetchNip05Pubkey(name: string, domain: string, timeout = 2_000): Promise<string | undefined> {
  interface NostrJson {
    names: Record<string, string>;
  }
  if (!name || !domain) {
    return undefined;
  }
  try {
    const res = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(timeout),
    });
    const data: NostrJson = await res.json();
    const match = Object.keys(data.names).find(n => {
      return n.toLowerCase() === name.toLowerCase();
    });
    return match ? data.names[match] : undefined;
  } catch {
    // ignored
  }
  return undefined;
}
