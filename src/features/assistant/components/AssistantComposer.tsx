import { useEffect, useRef } from 'react';
import { ArrowUp, FileSpreadsheet, FileText, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AssistantScopePopover } from './AssistantScopePopover';
import type { AssistantScope } from '../assistantData';

const SPREADSHEET_EXTENSIONS = ['xlsx', 'xls', 'csv'];

function fileIconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return SPREADSHEET_EXTENSIONS.includes(ext) ? FileSpreadsheet : FileText;
}

interface AssistantComposerProps {
  value: string;
  onChange: (value: string) => void;
  files: File[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  scope: AssistantScope;
  onScopeChange: (scope: AssistantScope) => void;
  onSend: () => void;
  placeholder?: string;
}

export function AssistantComposer({
  value,
  onChange,
  files,
  onFilesAdd,
  onFileRemove,
  scope,
  onScopeChange,
  onSend,
  placeholder = "Ask, act, or describe what to build... Try /new task or /new project",
}: AssistantComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesAdd(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, i) => {
            const FileIcon = fileIconFor(file.name);
            return (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs"
              >
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-[160px] truncate font-medium text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onFileRemove(i)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="max-h-40 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach docs, xlsx, images</TooltipContent>
          </Tooltip>
          <AssistantScopePopover scope={scope} onScopeChange={onScopeChange} />
        </div>

        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={!value.trim() && files.length === 0}
          className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
