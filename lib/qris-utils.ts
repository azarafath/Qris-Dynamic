// Utilities to handle QRIS TLV manipulation and CRC16-CCITT (0x1021)

export function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

type TLV = { id: string; value: string }

function hex(num: number, len = 4) {
  return num.toString(16).toUpperCase().padStart(len, "0")
}

function toAsciiBytes(str: string) {
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

// CRC16-CCITT (poly 0x1021), init 0xFFFF
export function crc16ccitt(input: string) {
  let crc = 0xffff
  const data = toAsciiBytes(input)
  for (const b of data) {
    crc ^= b << 8
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xffff
    }
  }
  return hex(crc, 4)
}

export function parseTLV(payload: string): TLV[] {
  const out: TLV[] = []
  let i = 0
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2)
    const len = Number.parseInt(payload.slice(i + 2, i + 4), 10)
    const value = payload.slice(i + 4, i + 4 + len)
    out.push({ id, value })
    i += 4 + len
  }
  return out
}

export function buildTLV(tlvs: TLV[]) {
  return tlvs
    .map(({ id, value }) => {
      const length = value.length.toString().padStart(2, "0")
      return `${id}${length}${value}`
    })
    .join("")
}

function setOrReplace(tlvs: TLV[], id: string, value: string) {
  const idx = tlvs.findIndex((t) => t.id === id)
  if (idx >= 0) tlvs[idx] = { id, value }
  else tlvs.push({ id, value })
}

export function setAmount(payload: string, amount: number) {
  const tlvs = parseTLV(payload)
  // Amount tag is "54", format with 2 decimals
  const amt = amount.toFixed(2)
  setOrReplace(tlvs, "54", amt)
  // Rebuild without CRC (63), then append CRC
  const noCrc = tlvs.filter((t) => t.id !== "63")
  const base = buildTLV(noCrc)
  // CRC id 63 length 04 then CRC over base + "6304"
  const crc = crc16ccitt(base + "6304")
  return base + "6304" + crc
}

export function buildDynamicFromStatic(staticPayload: string, amount: number) {
  if (!staticPayload) throw new Error("Static QRIS payload missing.")
  return setAmount(staticPayload, amount)
}

export function canonicalOrigin() {
  return window.location.origin;
}