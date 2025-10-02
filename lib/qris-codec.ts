// CRC16-CCITT (poly 0x1021) for EMVCo CRC (ID 63)
export function crc16ccitt(data: string) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export const DEFAULT_STATIC_QRIS =
  "00020101021126570011ID.DANA.WWW011893600915336094826302093609482630303UMI51440014ID.CO.QRIS.WWW0215ID10222329023150303UMI5204737253033605802ID5922Ahmad Zakaria Fathoni 6013Kota Semarang61055021863045D82"

export function buildDynamicQrisWithAmount(staticPayload: string, amount: number) {
  const amountStr = amount.toFixed(2)

  // Strip trailing CRC (6304XXXX)
  const noCrc = staticPayload.replace(/6304[0-9A-Fa-f]{4}$/i, "")

  const has54 = /54\d{2}\d+(\.\d+)?/.test(noCrc)
  let updated = noCrc
  const field54 = `54${String(amountStr.length).padStart(2, "0")}${amountStr}`
  updated = has54 ? updated.replace(/54\d{2}\d+(\.\d+)?/, field54) : `${updated}${field54}`

  const toCrc = `${updated}6304`
  const crc = crc16ccitt(toCrc)
  return `${toCrc}${crc}`
}

// --- Opaque link codec (base64url + XOR obfuscation) ---

type ChargeData = { a: number; n?: string } // a=amount, n=note

const KEY = "azf2025"

function toBase64Url(u8: Uint8Array) {
  let bin = ""
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  const b64 = btoa(bin)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}
function xorBytes(u8: Uint8Array, key: string) {
  const out = new Uint8Array(u8.length)
  for (let i = 0; i < u8.length; i++) out[i] = u8[i] ^ key.charCodeAt(i % key.length)
  return out
}

export function encodeCharge(data: ChargeData) {
  const json = JSON.stringify(data)
  const enc = new TextEncoder().encode(json)
  const obf = xorBytes(enc, KEY)
  return toBase64Url(obf)
}

export function decodeCharge(code: string): ChargeData | null {
  try {
    const obf = fromBase64Url(code)
    const dec = xorBytes(obf, KEY)
    const json = new TextDecoder().decode(dec)
    const obj = JSON.parse(json)
    if (typeof obj.a !== "number" || !(obj.a > 0)) return null
    return obj
  } catch {
    return null
  }
}

export type { ChargeData }
