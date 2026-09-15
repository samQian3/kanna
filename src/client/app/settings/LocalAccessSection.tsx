import { useEffect, useState } from "react"

interface AccessInfo { host: string; port: number; scope: string; links: string[]; tokenEnabled: boolean }
export function LocalAccessSection() {
  const [info, setInfo] = useState<AccessInfo | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  async function load(rotate = false) {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/local-access", { method: rotate ? "POST" : "GET", cache: "no-store" })
      if (!response.ok) throw Error("无法读取本机访问设置，请在本机或局域网页面登录后重试。")
      setInfo(await response.json())
      setCopied(null)
    } catch (e) { setError(e instanceof Error ? e.message : "读取失败") }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [])
  async function copy(link: string, index: number) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link)
      else {
        const input = document.createElement("textarea")
        input.value = link
        document.body.appendChild(input)
        input.select()
        const ok = document.execCommand("copy")
        input.remove()
        if (!ok) throw Error("请手动选择并复制链接")
      }
      setCopied(index)
    } catch { setError("复制失败，请手动选择并复制链接") }
  }
  return <section className="rounded-xl border p-4 space-y-3" aria-label="本机与局域网访问">
    <h3 className="font-medium">本机与局域网访问</h3>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {info && <>
      <p className="text-sm">监听范围：{info.scope === "localhost" ? "仅本机（localhost）" : "局域网"} · {info.host}:{info.port}</p>
      <p className="text-xs text-muted-foreground">{info.tokenEnabled ? "持有链接的人可直接访问此 Kanna，请仅分享给可信设备。重置后旧链接失效，已登录设备仍保持登录。" : "当前未启用登录密钥，以下地址无需登录。"}</p>
      {info.links.map((link, index) => <div key={link} className="flex gap-2">
        <input aria-label={`访问链接 ${index + 1}`} readOnly value={link} onFocus={event => event.target.select()} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-2 text-xs" />
        <button type="button" className="shrink-0 rounded-md border px-3 text-sm" onClick={() => void copy(link,index)}>{copied === index ? "已复制" : "复制链接"}</button>
      </div>)}
      {!info.links.length && <p className="text-sm text-muted-foreground">未发现可用的局域网 IPv4 地址。</p>}
    </>}
    <div className="flex gap-3 text-sm"><button type="button" disabled={busy} onClick={() => void load()}>刷新</button>{info?.tokenEnabled && <button type="button" disabled={busy} onClick={() => void load(true)}>重置访问链接</button>}</div>
  </section>
}
