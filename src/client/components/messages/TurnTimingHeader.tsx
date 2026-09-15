import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { formatTurnDuration, type TurnTiming } from "./turnTiming"

export function TurnTimingHeader({ timing }: { timing: TurnTiming }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (timing.state !== "running") return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [timing.state, timing.startedAt])
  const duration = timing.state === "running" ? now - timing.startedAt : timing.durationMs
  const label = timing.state === "running" ? `已处理 ${formatTurnDuration(duration ?? 0)}`
    : timing.state === "stopped" ? duration === undefined ? "已停止" : `在 ${formatTurnDuration(duration)} 后停止`
    : duration === undefined ? "用时未记录" : `用时 ${formatTurnDuration(duration)}`
  return <details className="group mt-8 w-full self-stretch border-b border-border/80 pb-3 text-muted-foreground">
    <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
      <span>{label}</span><ChevronRight size={16} className="transition-transform group-open:rotate-90" />
    </summary>
    <p className="mt-3 text-xs">{timing.toolCount} 次工具调用 · {timing.replyCount} 条回复</p>
  </details>
}
