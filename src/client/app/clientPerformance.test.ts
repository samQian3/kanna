import { expect, test } from "bun:test"
import { startClientPerformance } from "./clientPerformance"

test("performance monitoring starts and stops on LAN HTTP without crypto.randomUUID", () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto")
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  let started = false
  let stopped = false
  try {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} })
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      setInterval: () => { started = true; return 7 },
      clearInterval: (id: number) => { stopped = id === 7 },
    } })
    const cleanup = startClientPerformance(() => ({}))
    expect(started).toBe(true)
    cleanup()
    expect(stopped).toBe(true)
  } finally {
    if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto)
    else Reflect.deleteProperty(globalThis, "crypto")
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
