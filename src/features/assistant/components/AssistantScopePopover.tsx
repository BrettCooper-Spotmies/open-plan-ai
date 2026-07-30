import { useState } from 'react';
import { Check, ChevronDown, Folder, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ASSISTANT_SCOPE_OPTIONS, type AssistantScope } from '../assistantData';

const SCOPE_ICONS: Record<AssistantScope, typeof Folder> = {
  'This project': Folder,
  'This BOM': Layers,
};

interface AssistantScopePopoverProps {
  scope: AssistantScope;
  onScopeChange: (scope: AssistantScope) => void;
}

export function AssistantScopePopover({ scope, onScopeChange }: AssistantScopePopoverProps) {
  const [open, setOpen] = useState(false);
  const ScopeIcon = SCOPE_ICONS[scope];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full text-xs font-normal text-muted-foreground">
          <ScopeIcon className="h-3.5 w-3.5" />
          {scope}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-44 p-1">
        {ASSISTANT_SCOPE_OPTIONS.map((option) => {
          const OptionIcon = SCOPE_ICONS[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onScopeChange(option);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <OptionIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate">{option}</span>
              {option === scope && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
