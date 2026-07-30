import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AssistantComposer } from './AssistantComposer';
import { AssistantSuggestionRow } from './AssistantSuggestionRow';
import { ASSISTANT_CATEGORIES, ASSISTANT_SUGGESTIONS, type AssistantScope } from '../assistantData';

interface AssistantPanelProps {
  variant?: 'page' | 'widget';
  className?: string;
}

export function AssistantPanel({ variant = 'page', className }: AssistantPanelProps) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [scope, setScope] = useState<AssistantScope>('This project');

  const firstName = user?.name?.split(' ')[0] || 'there';
  const isWidget = variant === 'widget';

  const handleSend = () => {
    if (!value.trim() && files.length === 0) return;
    toast.info("OpenPlan Assistant isn't wired up yet — this is a UI preview.");
    setValue('');
    setFiles([]);
  };

  const handleFilesAdd = (added: File[]) => {
    setFiles((prev) => [...prev, ...added]);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <ScrollArea className="flex-1 min-h-0">
        <div className={cn('mx-auto flex flex-col gap-6', isWidget ? 'max-w-full p-4' : 'max-w-3xl p-6')}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">OpenPlan Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Hi {firstName} — I can <span className="font-semibold text-foreground">ask</span>,{' '}
                <span className="font-semibold text-foreground">act</span>, or{' '}
                <span className="font-semibold text-foreground">build</span> across OpenPlan.
              </p>
            </div>
          </div>

          <div className={cn('grid gap-3', isWidget ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
            {ASSISTANT_CATEGORIES.map((category) => (
              <div key={category.id} className="rounded-xl border border-border p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-chart-1">
                  <category.icon className="h-4 w-4" />
                  {category.title}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{category.description}</p>
              </div>
            ))}
          </div>

          {ASSISTANT_CATEGORIES.map((category) => {
            const suggestions = ASSISTANT_SUGGESTIONS.filter((s) => s.category === category.id);
            if (suggestions.length === 0) return null;
            return (
              <div key={category.id} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {category.label}
                </p>
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <AssistantSuggestionRow key={suggestion.id} suggestion={suggestion} onSelect={setValue} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className={cn('shrink-0 border-t border-border', isWidget ? 'p-3' : 'px-6 py-4')}>
        <div className={cn('mx-auto', isWidget ? 'max-w-full' : 'max-w-3xl')}>
          <AssistantComposer
            value={value}
            onChange={setValue}
            files={files}
            onFilesAdd={handleFilesAdd}
            onFileRemove={handleFileRemove}
            scope={scope}
            onScopeChange={setScope}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
