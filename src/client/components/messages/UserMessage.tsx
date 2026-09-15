import { useMemo, useState } from "react"
import type { ChatAttachment } from "../../../shared/types"
import { CornerUpLeft, Copy, Check, Pencil } from "lucide-react"
import { TranscriptMarkdown } from "./shared"
import { classifyAttachmentPreview } from "./attachmentPreview"
import { AttachmentFileCard, AttachmentImageCard } from "./AttachmentCard"
import { AttachmentPreviewModal } from "./AttachmentPreviewModal"
import { useTranscriptRenderOptions } from "./render-context"
import { TurnTimingHeader } from "./TurnTimingHeader"
import { cn } from "../../lib/utils"

interface Props {
  id?: string
  timestamp?: string
  content: string
  attachments?: ChatAttachment[]
  steered?: boolean
  /**
   * Light the bubble — a jump just landed on this message.
   *
   * The bubble rather than the row box the rest of the transcript lights: a
   * user prompt is a shape on one side of the column, not a full-width block,
   * so washing its container would light mostly empty space beside it.
   */
  flash?: boolean
}

/**
 * Legacy compatibility: steered prompts used to persist the injected
 * <system-message> block inside the transcript content, hidden here at render
 * time. Injections are now wire-only (applied at the harness boundary in
 * startTurnForChat and never stored), so this strip only matters for
 * transcripts written before that change.
 */
function parseSystemMessage(content: string) {
  const match = content.match(/^<system-message>\s*([\s\S]*?)\s*<\/system-message>\s*([\s\S]*)$/)
  if (!match) {
    return { systemMessage: null, body: content }
  }

  return {
    systemMessage: match[1]?.trim() || null,
    body: match[2] ?? "",
  }
}

export function UserMessage({ id, timestamp, content, attachments = [], steered = false, flash = false }: Props) {
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null)
  const renderOptions = useTranscriptRenderOptions()
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState(content)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const [copied,setCopied]=useState(false)
  const canEdit=!!id && id===renderOptions.editableMessageId && !!renderOptions.onEditMessage && !renderOptions.readonly
  async function saveEdit(){
    if(!id||!draft.trim())return
    setSaving(true);setError("")
    try{await renderOptions.onEditMessage?.(id,draft,attachments);setEditing(false)}catch(e){setError(e instanceof Error?e.message:"无法编辑，请重试")}finally{setSaving(false)}
  }
  async function copyText(){
    try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(parsedContent.body);else{const el=document.createElement("textarea");el.value=parsedContent.body;document.body.appendChild(el);el.select();document.execCommand("copy");el.remove()}setCopied(true)}catch{setError("复制失败，请手动选择文字")}
  }
  const parsedContent = useMemo(() => parseSystemMessage(content), [content])
  const shouldShowImagePlaceholders = renderOptions.attachmentMode === "metadata"
  const canInteractWithAttachments = !renderOptions.readonly || renderOptions.attachmentMode === "bundle"
  const imageAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.kind === "image" && (attachment.contentUrl || shouldShowImagePlaceholders)),
    [attachments, shouldShowImagePlaceholders],
  )
  const fileAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.kind !== "image" || (!attachment.contentUrl && !shouldShowImagePlaceholders)),
    [attachments, shouldShowImagePlaceholders],
  )
  const selectedAttachment = attachments.find((attachment) => attachment.id === selectedAttachmentId) ?? null

  function handleAttachmentClick(attachment: ChatAttachment) {
    if (!canInteractWithAttachments || !attachment.contentUrl) {
      return
    }

    const target = classifyAttachmentPreview(attachment)
    if (target.openInNewTab) {
      if (typeof window !== "undefined") {
        window.open(new URL(attachment.contentUrl, document.baseURI || window.location.href).toString(), "_blank", "noopener,noreferrer")
      }
      return
    }

    setSelectedAttachmentId(attachment.id)
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {imageAttachments.length > 0 ? (
          <div className="flex max-w-[85%] sm:max-w-[80%] flex-wrap justify-end gap-3">
            {imageAttachments.map((attachment) => (
              <AttachmentImageCard
                key={attachment.id}
                attachment={attachment}
                onClick={canInteractWithAttachments ? () => handleAttachmentClick(attachment) : undefined}
              />
            ))}
          </div>
        ) : null}
        {fileAttachments.length > 0 ? (
          <div className="flex max-w-[85%] sm:max-w-[80%] flex-wrap justify-end gap-2">
            {fileAttachments.map((attachment) => (
              <AttachmentFileCard
                key={attachment.id}
                attachment={attachment}
                onClick={canInteractWithAttachments ? () => handleAttachmentClick(attachment) : undefined}
              />
            ))}
          </div>
        ) : null}
        {(parsedContent.body || (!parsedContent.body && attachments.length === 0 && content && !parsedContent.systemMessage)) ? (
          <div className="flex max-w-[85%] items-center gap-2 sm:max-w-[80%]">
            {steered ? (
              <span
                aria-label="Sent mid-turn"
                role="img"
                title="Sent mid-turn"
                className="shrink-0 text-muted-foreground"
              >
                <CornerUpLeft className="h-4 w-4" />
              </span>
            ) : null}
            {/* The flash is a class on the bubble, not a layer inside it: this
                is a `prose` container, and an extra child displaces the
                `:first-child` margin reset onto itself, which grew the bubble
                by a paragraph's top margin for the length of the flash. */}
            <div className={cn(
              "kanna-user-bubble min-w-0 flex-1 rounded-[24px] border-0 bg-[#1c457c] px-5 py-3 text-white prose prose-sm prose-invert [&_p]:whitespace-pre-line",
              flash && "kanna-jump-flash",
            )}>
              <TranscriptMarkdown text={parsedContent.body} />
            </div>
          </div>
        ) : null}
        {!renderOptions.readonly && <div className="flex items-center justify-end gap-1 text-muted-foreground text-xs">
          {timestamp && <span className="mr-2" title={timestamp}>{new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>}
          <button type="button" aria-label="复制消息" title="复制消息" className="p-2 rounded-xl hover:bg-muted" onClick={()=>void copyText()}>{copied?<Check size={16}/>:<Copy size={16}/>}</button>
          {canEdit && <button type="button" aria-label="编辑上一条消息" title="编辑上一条消息" className="p-2 rounded-xl hover:bg-muted" onClick={()=>{setDraft(parsedContent.body);setEditing(true)}}><Pencil size={16}/></button>}
        </div>}
        {editing && <div className="w-full max-w-2xl rounded-2xl border border-border bg-muted p-4">
          <textarea aria-label="修改消息" className="w-full min-h-28 bg-transparent outline-none resize-y text-base" value={draft} onChange={e=>setDraft(e.target.value)} disabled={saving}/>
          <p className="text-xs text-muted-foreground my-2">保留原会话，在此消息之前建立修订分支。不会撤销已修改的文件。</p>
          <div className="flex justify-end gap-2"><button className="px-3 py-2 rounded-lg hover:bg-background" disabled={saving} onClick={()=>setEditing(false)}>取消</button><button className="px-3 py-2 rounded-lg bg-[#1c457c] text-white disabled:opacity-50" disabled={saving||!draft.trim()} onClick={()=>void saveEdit()}>{saving?"正在准备…":"保存并回到输入框"}</button></div>
        </div>}
        {id && renderOptions.turnTiming?.[id] && <TurnTimingHeader timing={renderOptions.turnTiming[id]} />}
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      </div>
      <AttachmentPreviewModal attachment={selectedAttachment} onOpenChange={(open) => !open && setSelectedAttachmentId(null)} />
    </>
  )
}
