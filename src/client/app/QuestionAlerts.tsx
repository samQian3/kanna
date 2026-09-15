import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSidebarStore } from "../stores/sidebarStore"

export function QuestionAlerts() {
  const navigate = useNavigate()
  const [waiting, setWaiting] = useState<{chatId:string;title:string}[]>([])
  useEffect(() => {
    let previous = new Set<string>()
    const update = () => {
      const store = useSidebarStore.getState()
      if (!store.ready) return
      const next = store.data.projectGroups.flatMap(group => group.chats).filter(chat => chat.status === "waiting_for_user")
      setWaiting(next.map(chat => ({chatId:chat.chatId,title:chat.title})))
      for (const chat of next) {
        if (!previous.has(chat.chatId) && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const notification = new Notification("Kanna 等待你回答", {body:chat.title,tag:`kanna-question-${chat.chatId}`})
            notification.onclick = () => {window.focus();navigate(`/chat/${chat.chatId}`);notification.close()}
          } catch { /* The persistent in-page alert remains available. */ }
        }
      }
      previous = new Set(next.map(chat => chat.chatId))
    }
    update()
    return useSidebarStore.subscribe(update)
  }, [navigate])
  if (!waiting.length) return null
  return <aside role="status" aria-live="polite" className="fixed right-4 top-16 z-50 max-w-[min(360px,calc(100vw-32px))] rounded-xl border bg-background p-3 shadow-lg">
    <p className="text-sm font-medium">{waiting.length} 个任务等待回答或确认</p>
    {waiting.map(chat => <button key={chat.chatId} className="block w-full truncate py-2 text-left text-sm underline" onClick={()=>navigate(`/chat/${chat.chatId}`)}>{chat.title} · 去回答</button>)}
  </aside>
}

export function QuestionNotificationSetting() {
  const supported = typeof Notification !== "undefined" && window.isSecureContext
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported")
  return <section className="rounded-xl border p-4 space-y-2">
    <h3 className="font-medium">提问通知</h3>
    <p className="text-sm text-muted-foreground">页内提醒始终显示。系统通知：{permission === "granted" ? "已允许" : permission === "denied" ? "已被浏览器禁止，请到网站权限中开启" : permission === "unsupported" ? "当前地址不支持，请使用 HTTPS 或 localhost" : "尚未授权"}。网页关闭后不会推送。</p>
    {supported && permission !== "granted" && <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={()=>void Notification.requestPermission().then(setPermission)}>开启系统通知</button>}
  </section>
}
