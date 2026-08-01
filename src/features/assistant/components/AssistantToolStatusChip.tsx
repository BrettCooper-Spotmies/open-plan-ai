import { CheckCircle2, Loader2 } from 'lucide-react';
import type { ToolStatusEntry } from '../hooks/useAssistantConversation';

const TOOL_LABELS: Record<string, string> = {
  query_project_data: 'Checking project data',
  search_project_files: 'Searching files',
  present_card: 'Building a summary',
};

export function AssistantToolStatusChip({ entry }: { entry: ToolStatusEntry }) {
  const label = TOOL_LABELS[entry.tool] ?? entry.tool;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
      {entry.done ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
      ) : (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
      )}
      <span>{entry.done && entry.summary ? `${label} — ${entry.summary}` : label}</span>
    </div>
  );
}
