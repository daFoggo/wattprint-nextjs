"use client"

import { IconTerminal } from "@tabler/icons-react"
import { CopyButton } from "@workspace/ui/components/animate-ui/buttons/copy"

export function CopyCommand({ command }: { command: string }) {
  return (
    <div className="flex h-11 max-w-full items-center gap-2 border bg-card pr-1 pl-3 font-mono text-sm">
      <IconTerminal aria-hidden className="size-3.5 text-muted-foreground" />
      <span className="overflow-x-auto whitespace-nowrap select-all">{command}</span>
      <CopyButton
        content={command}
        aria-label="Copy command"
        variant="ghost"
        size="icon-sm"
      />
    </div>
  )
}
