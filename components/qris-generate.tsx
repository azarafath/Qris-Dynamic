"use client"

import { useMemo, useState } from "react"
import QRCode from "qrcode"
import { DEFAULT_STATIC_QRIS, buildDynamicQrisWithAmount, encodeCharge } from "@/lib/qris-codec"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// PERUBAHAN DI SINI: Tambahkan 'generatedAt'
async function createPosterPNG({
  qrDataUrl,
  amount,
  note,
  link,
  generatedAt,
}: {
  qrDataUrl: string
  amount: number
  note?: string
  link: string
  generatedAt: Date
}) {
  const canvas = document.createElement("canvas")
  const width = 1080
  const height = 1350
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!

  // Background (white)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  // Card glass backdrop
  ctx.fillStyle = "rgba(255,255,255,0.8)"
  roundRect(ctx, 60, 80, width - 120, height - 160, 28)
  ctx.fill()
  ctx.strokeStyle = "rgba(0,0,0,0.06)"
  ctx.lineWidth = 2
  ctx.stroke()

  // Title
  ctx.fillStyle = "#111111"
  ctx.font = "700 54px system-ui, -apple-system, Segoe UI, Roboto, Helvetica"
  ctx.fillText("Tagihan QRIS", 100, 160)

  // Subtitle
  ctx.fillStyle = "#444444"
  ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto, Helvetica"
  const msg = `Kamu memiliki tagihan sebesar ${formatIDR(amount)}${note ? ` — ${note}` : ""}`
  wrapText(ctx, msg, 100, 210, width - 200, 40)

  // QR
  const img = new Image()
  img.crossOrigin = "anonymous"
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
  })
  img.src = qrDataUrl
  await loaded
  const qrSize = 720
  ctx.drawImage(img, (width - qrSize) / 2, 320, qrSize, qrSize)

  // Amount chip
  ctx.fillStyle = "rgba(0,0,0,0.8)"
  roundRect(ctx, 100, 1080, 420, 80, 16)
  ctx.fill()
  ctx.fillStyle = "#ffffff"
  ctx.font = "600 36px system-ui, -apple-system, Segoe UI, Roboto, Helvetica"
  ctx.fillText(formatIDR(amount), 120, 1132)

  // --- PERUBAHAN DI SINI: Tambahkan Teks Tanggal & Waktu ---
  const formattedDateTime =
    new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(generatedAt) + " WIB"

  ctx.fillStyle = "#888888" // Warna abu-abu yang lebih lembut
  ctx.font = "400 26px system-ui, -apple-system, Segoe UI, Roboto, Helvetica"
  ctx.textAlign = "center"
  ctx.fillText(`Dibuat pada: ${formattedDateTime}`, width / 2, 1200)
  ctx.textAlign = "left" // Reset alignment

  // Link
  ctx.fillStyle = "#0F6FFF"
  ctx.font = "500 28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica"
  wrapText(ctx, link, 100, 1240, width - 200, 34)

  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png", 0.95))
}


function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ")
  let line = ""
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " "
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y)
      line = words[n] + " "
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}


// --- Main Component ---

export default function QrisGenerate() {
  const [amount, setAmount] = useState<number | "">("")
  const [note, setNote] = useState<string>("")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [shareUrl, setShareUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const isReady = useMemo(() => !!qrDataUrl && !!shareUrl, [qrDataUrl, shareUrl])

  const onGenerate = async () => {
    if (amount === "" || Number(amount) <= 0) {
      alert("Masukkan nominal yang valid.")
      return
    }
    setIsGenerating(true)
    try {
      const dynamicPayload = buildDynamicQrisWithAmount(DEFAULT_STATIC_QRIS, Number(amount))
      const qr = await QRCode.toDataURL(dynamicPayload, { margin: 1, scale: 8 })
      setQrDataUrl(qr)

      const origin = window.location.origin
      
      // PERUBAHAN DI SINI: Tambahkan timestamp ke data QR
      const code = encodeCharge({ a: Number(amount), n: note || undefined, t: Date.now() })

      const url = `${origin}/c/${code}`
      setShareUrl(url)
    } finally {
      setIsGenerating(false)
    }
  }

  const onShare = async () => {
    if (!isReady) return
    setIsSharing(true)
    try {
      // PERUBAHAN DI SINI: Buat objek Date untuk diteruskan
      const generatedAt = new Date()

      const posterBlob = await createPosterPNG({
        qrDataUrl,
        amount: Number(amount),
        note,
        link: shareUrl,
        generatedAt, // <-- Teruskan objek Date
      })
      const files = [new File([posterBlob], "qris-tagihan.png", { type: "image/png" })]

      const caption = `Hai, Kamu memiliki tagihan sebesar ${formatIDR(Number(amount))}${note ? ` — ${note}` : ""}`
      const messageForClipboard = `${caption}\n\nLink Pembayaran:\n${shareUrl}`
      
      await navigator.clipboard.writeText(messageForClipboard)

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        alert("Pesan sudah disalin ke clipboard. Silakan pilih aplikasi untuk membagikan.");
        
        await navigator.share({
          title: "Tagihan QRIS",
          text: caption,
          files,
        })
      } else {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(posterBlob)
        a.download = "qris-tagihan.png"
        a.click()
        URL.revokeObjectURL(a.href)
        
        alert(
          "Gambar telah diunduh dan pesan LENGKAP telah disalin ke clipboard.\n\n" +
          "Silakan buka aplikasi chat Anda, paste pesannya, dan lampirkan gambar."
        )
      }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Proses berbagi dibatalkan oleh pengguna.');
        } else {
          console.error("Error saat berbagi:", error);
          alert("Terjadi kesalahan saat mencoba berbagi.");
        }
    } 
    finally {
      setIsSharing(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50 md:p-10">
        <div className="flex flex-col gap-6 md:gap-8">
          <header className="text-center">
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-4xl">
              QRIS Dinamis — Tagih dengan Sekali Klik
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground md:text-base">
              Masukkan nominal, generate QR, lalu bagikan sebagai gambar & tautan.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-[1fr,420px] md:gap-6">
            <Card className="border-slate-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
              <CardHeader>
                <CardTitle>Nominal Tagihan</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="text-sm text-muted-foreground" htmlFor="amount">
                  Nominal (IDR)
                </label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="cth: 75000"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "")
                    setAmount(v === "" ? "" : Number(v))
                  }}
                />

                <label className="mt-2 text-sm text-muted-foreground" htmlFor="note">
                  Catatan (opsional)
                </label>
                <Input
                  id="note"
                  placeholder="cth: Pembayaran kopi"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <div className="mt-4 flex items-center gap-3">
                  <Button onClick={onGenerate} disabled={isGenerating || !amount}>
                    {isGenerating ? "Menghasilkan..." : "Generate QR"}
                  </Button>
                  <Button variant="secondary" onClick={onShare} disabled={!isReady || isSharing}>
                    {isSharing ? "Membagikan..." : "Bagikan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
              <CardHeader>
                <CardTitle>Pratinjau</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4">
                {qrDataUrl ? (
                  <>
                    <img
                      src={qrDataUrl || "/placeholder.svg?height=288&width=288&query=QR%20preview"}
                      alt="QR dinamis"
                      className="h-auto w-64 rounded-lg border p-2 shadow-sm md:w-72"
                    />
                    <div className="w-full text-center">
                      <p className="text-sm text-muted-foreground">Nominal</p>
                      <p className="text-lg font-semibold">{amount ? formatIDR(Number(amount)) : "-"}</p>
                      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
                    </div>
                    {shareUrl && (
                      <div className="w-full break-all rounded-xl border px-3 py-2 text-center text-xs text-muted-foreground">
                        {shareUrl}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">QR akan muncul di sini setelah Anda Generate.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}