import type {TranscriptEntry} from '../shared/types'
export interface ChildState {name:string; toolId:string; status:string}
export function updateChildStatus(states:Map<string,ChildState>, id:string, name:string|undefined, status:string, model?:string):TranscriptEntry[]{
 const old=states.get(id);if(old?.status===status)return []
 const entries:TranscriptEntry[]=[];const terminal=['completed','failed','interrupted'].includes(status)
 if(!old||(!terminal&&['completed','failed','interrupted'].includes(old.status))){
  const state={name:name||old?.name||id.slice(0,8),toolId:`subagent:${id}:${crypto.randomUUID()}`,status};states.set(id,state)
  entries.push({_id:crypto.randomUUID(),createdAt:Date.now(),kind:'tool_call',tool:{kind:'tool',toolKind:'subagent_task',toolName:'子代理',toolId:state.toolId,input:{subagentType:state.name, ...(model ? {model} : {})}}})
 }else {old.status=status;if(name)old.name=name}
 const state=states.get(id)!
 if(terminal)entries.push({_id:crypto.randomUUID(),createdAt:Date.now(),kind:'tool_result',toolId:state.toolId,content:`子代理 ${state.name}：${{completed:'已完成',failed:'失败',interrupted:'已中断'}[status]}`,isError:status!=='completed'})
 return entries
}
