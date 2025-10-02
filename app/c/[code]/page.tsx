"use client"

import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { DEFAULT_STATIC_QRIS, buildDynamicQrisWithAmount, decodeCharge } from "@/lib/qris-codec"

export default function ChargePage({ params }: { params: { code: string } }) {
  const { code } = params
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState<string | undefined>()
  const [invalid, setInvalid] = useState(false)
  
  // PERUBAHAN DI SINI: State untuk menyimpan tanggal pembuatan
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const rupiah = useMemo(
    () => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }),
    [],
  )

  useEffect(() => {
    async function run() {
      const data = decodeCharge(code)
      if (!data || !data.a || data.a <= 0) {
        setInvalid(true)
        return
      }
      setAmount(data.a)
      setNote(data.n)
      
      // PERUBAHAN DI SINI: Baca timestamp dari data dan simpan ke state
      if (data.t) {
        setGeneratedAt(new Date(data.t))
      }

      const payload = buildDynamicQrisWithAmount(DEFAULT_STATIC_QRIS, Number(data.a))
      const url = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        width: 640,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
      setQrUrl(url)
    }
    run()
  }, [code])

  if (invalid) {
    return (
      <main className="min-h-dvh bg-white">
        <div className="mx-auto max-w-xl p-6">
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <h1 className="text-xl font-semibold text-slate-900">Tautan tidak valid</h1>
            <p className="mt-1 text-slate-600">Kode tagihan tidak dapat dibaca.</p>
            <p className="mt-6 text-center text-xs text-slate-500">
              Made with <span aria-hidden>♥</span> Azarafath, 2025
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 md:p-8 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 text-balance">Tagihan QRIS</h1>
            <p className="text-slate-600 mt-1">Scan QR berikut untuk melakukan pembayaran.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xs rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50">
                {qrUrl ? (
                  <img
                    src={qrUrl || "/placeholder.svg?height=640&width=640&query=QR%20charge"}
                    alt="QRIS Dinamis"
                    className="mx-auto aspect-square w-full rounded-xl bg-white p-2"
                  />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-600">Nominal</div>
                <div className="text-2xl font-semibold text-slate-900">{rupiah.format(amount)}</div>
              </div>
              {note && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-600">Catatan</div>
                  <div className="text-slate-900">{note}</div>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-600">Status</div>
                <div className="text-slate-900 font-medium text-amber-600">Menunggu pembayaran</div>
              </div>
              {generatedAt && (
                <div className="pl-4">
                  <div className="text-sm text-slate-400">Dibuat pada</div>
                  <div className="text-sm text-slate-400">
                    {new Intl.DateTimeFormat("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jakarta",
                    }).format(generatedAt)}{" "}
                    WIB
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-8 text-center text-xs text-slate-500">
            Made with <span aria-hidden>💖</span> Azarafath, 2025
          </footer>
        </div>
      </div>
    </main>
  )
}