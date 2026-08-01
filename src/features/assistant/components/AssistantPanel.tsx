import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { AssistantComposer } from './AssistantComposer';
import { AssistantSuggestionRow } from './AssistantSuggestionRow';
import { AssistantTranscript } from './AssistantTranscript';
import {
  ASSISTANT_CATEGORIES,
  ASSISTANT_SUGGESTIONS,
  scopeLabelToBackend,
  type AssistantScope,
  type AssistantFocusEntity,
} from '../assistantData';
import { useAssistantConversation } from '../hooks/useAssistantConversation';
import { useCreateAssistantConversation } from '../hooks/useAssistantConversations';

interface AssistantPanelProps {
  variant?: 'page' | 'widget';
  className?: string;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function AssistantPanel({
  variant = 'page',
  className,
  conversationId,
  onConversationCreated,
}: AssistantPanelProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { data: projects = [] } = useProjects();

  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [scope, setScope] = useState<AssistantScope>('This project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [focusEntities, setFocusEntities] = useState<AssistantFocusEntity[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const {
    conversation,
    streamingText,
    isStreaming,
    toolStatus,
    pendingQuestions,
    sendMessage,
    answerQuestion,
    isAnswering,
  } = useAssistantConversation(conversationId);
  const createConversation = useCreateAssistantConversation();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const isWidget = variant === 'widget';
  const hasActiveConversation = !!conversationId;
  const visibleCategories = ASSISTANT_CATEGORIES.filter((category) => !category.hidden);

  // Default to the first project once the list loads, so "This project" is
  // usable immediately without forcing an extra picker click.
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Clear the composer whenever the active conversation identity changes
  // (new conversation, or switching to a different past one from the
  // sidebar) — deliberately not tied to a remount/key so the in-flight
  // "just submitted" optimistic state below survives create → activate.
  useEffect(() => {
    setValue('');
    setFiles([]);
  }, [conversationId]);

  useEffect(() => {
    if (isStreaming) setJustSubmitted(false);
  }, [isStreaming]);

  const handleSend = () => {
    if (!value.trim()) return;

    // A conversation that already exists has its scope/project fixed
    // server-side — the composer's local scope picker is only relevant when
    // *creating* a new one, so a follow-up must never be blocked by it.
    if (conversationId) {
      setJustSubmitted(true);
      sendMessage(value);
      setValue('');
      setFiles([]);
      return;
    }

    if (scope !== 'All projects' && !selectedProjectId) {
      toast.error('Pick a project first.');
      return;
    }
    if (scope === 'All projects' && !currentOrganization) {
      toast.error('No organization selected.');
      return;
    }

    setJustSubmitted(true);
    createConversation.mutate(
      {
        scope: scopeLabelToBackend(scope),
        projectId: scope !== 'All projects' ? (selectedProjectId as string) : undefined,
        orgId: scope === 'All projects' ? currentOrganization?.id : undefined,
        message: value,
        focusEntities: focusEntities.length > 0 ? focusEntities : undefined,
      },
      {
        onSuccess: (created) => onConversationCreated(created.id),
        onError: () => {
          setJustSubmitted(false);
          toast.error("Couldn't start that conversation — try again.");
        },
      },
    );

    setValue('');
    setFiles([]);
  };

  const handleFilesAdd = (added: File[]) => {
    setFiles((prev) => [...prev, ...added]);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const effectivelyStreaming = isStreaming || justSubmitted;
  const isBusy = createConversation.isPending || effectivelyStreaming;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {hasActiveConversation ? (
        <AssistantTranscript
          messages={conversation?.messages ?? []}
          streamingText={streamingText}
          isStreaming={effectivelyStreaming}
          toolStatus={toolStatus}
          pendingQuestions={pendingQuestions}
          onAnswer={answerQuestion}
          isAnswering={isAnswering}
        />
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className={cn('mx-auto flex flex-col gap-6', isWidget ? 'max-w-full p-4' : 'max-w-3xl p-6')}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">OpenPlan Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  Hi {firstName} — <span className="font-semibold text-foreground">ask</span> me anything about
                  status, blockers, BOM health, or changes across OpenPlan.
                </p>
              </div>
            </div>

            <div className={cn('grid gap-3', isWidget ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
              {visibleCategories.map((category) => (
                <div key={category.id} className="rounded-xl border border-border p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-chart-1">
                    <category.icon className="h-4 w-4" />
                    {category.title}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{category.description}</p>
                </div>
              ))}
            </div>

            {visibleCategories.map((category) => {
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
      )}

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
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            focusEntities={focusEntities}
            onFocusEntitiesChange={setFocusEntities}
            onSend={handleSend}
            disabled={isBusy}
          />
        </div>
      </div>
    </div>
  );
}
