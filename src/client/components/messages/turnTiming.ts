import type { TranscriptEntry } from "../../../shared/types"

export interface TurnTiming {
  startedAt: number
  durationMs?: number
  state: "running" | "completed" | "stopped" | "unknown"
  toolCount: number
  replyCount: number
}

export function formatTurnDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  return `${hours ? `${hours}小时 ` : ""}${minutes ? `${minutes}分钟 ` : ""}${seconds % 60}秒`
}

export function buildTurnTiming(entries: TranscriptEntry[], running: boolean) {
  const turns: Record<string, TurnTiming> = {}
  const replyTimes: Record<string, number> = {}
  let turn: TurnTiming | undefined
  let lastReply: string | undefined
  for (const entry of entries) {
    if (entry.hidden || entry.parentToolUseId) continue
    if (entry.kind === "user_prompt") {
      if (entry.steered && turn) continue
      turn = { startedAt: entry.createdAt, state: "unknown", toolCount: 0, replyCount: 0 }
      turns[entry._id] = turn
      lastReply = undefined
    } else if (turn) {
      if (entry.kind === "tool_call") turn.toolCount++
      if (entry.kind === "assistant_text") {
        turn.replyCount++
        lastReply = entry._id
        replyTimes[lastReply] = entry.createdAt
      }
      if (entry.kind === "result") {
        turn.state = entry.subtype === "success" ? "completed" : "stopped"
        const wallTime = entry.createdAt - turn.startedAt
        turn.durationMs = entry.durationMs > 0 ? entry.durationMs : wallTime > 0 ? wallTime : undefined
        if (lastReply) replyTimes[lastReply] = entry.createdAt
      }
      if (entry.kind === "interrupted") {
        turn.state = "stopped"
        turn.durationMs = Math.max(0, entry.createdAt - turn.startedAt)
      }
    }
  }
  if (turn && running && turn.state === "unknown") turn.state = "running"
  return { turns, replyTimes }
}
