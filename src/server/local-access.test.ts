import { test, expect } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createLocalAccess, localAccessUrls } from "./local-access"
import { createAuthManager } from "./auth"

test("access links persist, rotate, and exchange for a session with origin validation", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "kanna-access-"))
  try {
    const links = await createLocalAccess(dir, "password")
    const first = links.token()
    expect((await createLocalAccess(dir, "password")).token()).toBe(first)
    const auth = createAuthManager("password")
    const request = (token: string, origin = "http://192.168.1.10:3210") => new Request("http://192.168.1.10:3210/auth/token", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ token }),
    })
    expect((await auth.handleTokenLogin(request("wrong"), first)).status).toBe(401)
    expect((await auth.handleTokenLogin(request(first, "https://example.com"), first)).status).toBe(403)
    const response = await auth.handleTokenLogin(request(first), first)
    expect(response.status).toBe(200)
    expect(auth.isAuthenticated(new Request("http://192.168.1.10:3210", { headers: { Cookie: response.headers.get("set-cookie")!.split(";")[0]! } }))).toBe(true)
    await links.rotate()
    expect((await auth.handleTokenLogin(request(first), links.token())).status).toBe(401)
    expect((await createLocalAccess(dir, "different-password")).token()).not.toBe(links.token())
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test("loopback listeners only advertise loopback URLs", () => {
  expect(localAccessUrls("127.0.0.1", 3210)).toEqual(["http://localhost:3210"])
  expect(localAccessUrls("192.168.1.10", 3210)).toEqual(["http://192.168.1.10:3210"])
})
