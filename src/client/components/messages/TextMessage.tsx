import type { ProcessedTextMessage } from "./types"
import { useTranscriptRenderOptions } from "./render-context"
import { TranscriptMarkdown } from "./shared"

interface Props {
  message: ProcessedTextMessage
}

export function TextMessage({ message }: Props) {
  const options = useTranscriptRenderOptions()
  const timestamp = options.replyTimes?.[message.id] ?? Date.parse(message.timestamp)
  return (
    // <VerticalLineContainer className="w-full">
      <div className="kanna-assistant-message text-pretty prose prose-base dark:prose-invert px-0.5 w-full max-w-full space-y-4">
        <TranscriptMarkdown text={message.text} />
        {Number.isFinite(timestamp) && <div className="not-prose text-xs text-muted-foreground" title={new Date(timestamp).toLocaleString()}>{new Date(timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false})}</div>}
      </div>
    // </VerticalLineContainer>
  )
}
