import {test,expect} from 'bun:test';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {EventStore} from './event-store';
test('editing branches before last prompt, keeps source and excludes stale reply',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'kanna-edit-'));try{const s=new EventStore(dir);await s.initialize();const p=await s.openProject(dir);const c=await s.createChat(p.id);await s.setChatProvider(c.id,'codex');await s.setSessionToken(c.id,'original-session');
 for(const e of [{_id:'u1',createdAt:1,kind:'user_prompt',content:'first'},{_id:'a1',createdAt:2,kind:'assistant_text',text:'answer'},{_id:'u2',createdAt:3,kind:'user_prompt',content:'second'},{_id:'a2',createdAt:4,kind:'assistant_text',text:'stale answer'}])await s.appendMessage(c.id,e as any);
 const b=await s.branchBeforeLastPrompt(c.id,'u2');expect(s.getMessages(b.chatId).map(e=>e._id)).toEqual(['u1','a1']);expect(s.getMessages(c.id)).toHaveLength(4);expect(s.requireChat(b.chatId).sessionToken).toBeNull();expect(s.requireChat(c.id).sessionToken).toBe('original-session');
 await expect(s.branchBeforeLastPrompt(c.id,'u1')).rejects.toThrow();const reload=new EventStore(dir);await reload.initialize();expect(reload.getMessages(b.chatId)).toHaveLength(2);
 }finally{await rm(dir,{recursive:true,force:true})}
});
