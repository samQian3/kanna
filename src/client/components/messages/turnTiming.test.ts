import { expect, test } from "bun:test"
import { buildTurnTiming, formatTurnDuration } from "./turnTiming"
import type { TranscriptEntry } from "../../../shared/types"
const prompt: TranscriptEntry = { _id: "u", kind: "user_prompt", createdAt: 1000, content: "go" }
test("completed duration and reply time come from result; child result is ignored", () => {
  const entries: TranscriptEntry[] = [prompt,
    { _id: "a", kind: "assistant_text", createdAt: 2000, text: "done" },
    { _id: "child", kind: "result", createdAt: 3000, durationMs: 2000, subtype: "success", isError: false, result: "", parentToolUseId: "tool" },
  ]
  expect(buildTurnTiming(entries, true).turns.u?.state).toBe("running")
  entries.push({ _id: "r", kind: "result", createdAt: 76000, durationMs: 75000, subtype: "success", isError: false, result: "" })
  const result = buildTurnTiming(entries, false)
  expect(result.turns.u).toMatchObject({ state: "completed", durationMs: 75000 })
  expect(result.replyTimes.a).toBe(76000)
  expect(formatTurnDuration(75000)).toBe("1分钟 15秒")
})
test("unknown historical duration is not fabricated; interruption and steering preserve timer", () => {
  expect(buildTurnTiming([prompt], false).turns.u).toMatchObject({ state: "unknown" })
  const result = buildTurnTiming([prompt,
    { ...prompt, _id: "steer", steered: true, createdAt: 5000 },
    { _id: "stop", kind: "interrupted", createdAt: 7000 },
  ], false)
  expect(result.turns.u).toMatchObject({ state: "stopped", durationMs: 6000 })
  expect(result.turns.steer).toBeUndefined()
})
