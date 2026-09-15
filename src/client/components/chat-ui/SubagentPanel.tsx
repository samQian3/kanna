import { useEffect, useState } from "react"
import { Network } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import type { TranscriptEntry } from "../../../shared/types"
import { formatTurnDuration } from "../messages/turnTiming"

export function collectSubagents(entries: TranscriptEntry[], active: boolean) {
  const agents = new Map<string, {id:string; name:string; model:string; startedAt:number; endedAt?:number; status:string}>()
  for (const entry of entries) {
    if (entry.parentToolUseId) continue
    if (entry.kind === "tool_call" && entry.tool.toolKind === "subagent_task") {
      const input = entry.tool.input as Record<string, unknown>
      agents.set(entry.tool.toolId, {id:entry.tool.toolId, name:String(input.subagentType || input.description || "子代理"), model:typeof input.model === "string" ? input.model : "未提供", startedAt:entry.createdAt, status:active ? "运行中" : "状态未确认"})
    }
    if (entry.kind === "tool_result") {
      const agent=agents.get(entry.toolId)
      if(agent){agent.endedAt=entry.createdAt;agent.status=entry.isError ? "失败 / 已中断" : "已完成"}
    }
    if (entry.kind === "result" || entry.kind === "interrupted") {
      for(const agent of agents.values())if(!agent.endedAt){agent.endedAt=entry.createdAt;agent.status="状态未确认"}
    }
  }
  return [...agents.values()]
}
export function SubagentPanel({entries, active}:{entries:TranscriptEntry[];active:boolean}) {
  const [now,setNow]=useState(Date.now)
  const agents=collectSubagents(entries,active)
  const running=agents.filter(a=>a.status==="运行中")
  useEffect(()=>{if(!running.length)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[running.length])
  return <Popover><PopoverTrigger asChild><button type="button" aria-label={`子代理状态，${running.length} 个运行中`} className="flex shrink-0 items-center gap-1 rounded-lg p-2 text-muted-foreground hover:bg-muted"><Network size={18}/><span className="text-xs tabular-nums">{running.length}</span></button></PopoverTrigger>
    <PopoverContent side="top" align="end" className="w-[min(400px,calc(100vw-24px))] p-4">
      <div className="mb-3 flex items-center justify-between"><strong>子代理</strong><span className="text-xs text-muted-foreground">{running.length} 个运行中</span></div>
      {!agents.length ? <p className="text-sm text-muted-foreground">当前任务暂无子代理记录</p> : <div className="max-h-72 overflow-y-auto space-y-3">{[...agents].sort((a,b)=>Number(b.status==="运行中")-Number(a.status==="运行中")).map(agent=><div key={agent.id} className="rounded-xl border p-3 text-sm">
        <div className="flex justify-between gap-2"><span className="truncate font-medium">{agent.name}</span><span className="shrink-0 text-xs text-muted-foreground">{agent.status}</span></div>
        <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>模型：{agent.model}</span><span className="shrink-0 tabular-nums">{agent.status==="状态未确认" ? "时长未确认" : formatTurnDuration((agent.endedAt??now)-agent.startedAt)}</span></div>
      </div>)}</div>}
      <p className="mt-3 text-xs text-muted-foreground">显示已加载的任务记录；模型未返回时标为“未提供”。</p>
    </PopoverContent></Popover>
}
