import { randomBytes, createHmac } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { networkInterfaces } from "node:os"

export async function createLocalAccess(dataDir: string, password: string) {
  const file = path.join(dataDir, "local-access-salt")
  let salt: string
  try { salt = (await readFile(file, "utf8")).trim() }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    salt = randomBytes(32).toString("hex")
    await writeFile(file, salt, { mode: 0o600 })
  }
  const token = () => createHmac("sha256", password).update(salt).digest("base64url")
  return {
    token,
    async rotate() {
      const next = randomBytes(32).toString("hex")
      await writeFile(file, next, { mode: 0o600 })
      salt = next
    },
  }
}

export function localAccessUrls(host: string, port: number) {
  if (["127.0.0.1", "localhost", "::1"].includes(host)) return [`http://localhost:${port}`]
  if (!["0.0.0.0", "::"].includes(host)) return [`http://${host.includes(":") ? `[${host}]` : host}:${port}`]
  return [...new Set(Object.values(networkInterfaces()).flatMap(list => (list ?? [])
    .filter(item => !item.internal && item.family === "IPv4")
    .map(item => `http://${item.address}:${port}`)))]
}

export const TOKEN_LOGIN_HTML = `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kanna 登录</title><body><p id="status">正在登录…</p><a href="/">返回 Kanna</a><script>
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', '/auth/link');
if (!token) document.getElementById('status').textContent = '链接缺少 Token，请重新复制链接。';
else fetch('/auth/token', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token})}).then(r=>{if(!r.ok)throw Error();location.replace('/');}).catch(()=>{document.getElementById('status').textContent='链接已失效或无法连接，请重新获取链接。';});
</script></body></html>`
