import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { AssistantCard, CardItem, CardSeverity } from '../assistantData';

interface AssistantCardMessageProps {
  card: AssistantCard;
  /** Real persisted timestamp, or null for the fleeting live render before the REST refetch lands. */
  createdAt: string | null;
  onFollowUp: (text: string) => void;
}

// Feature-local — deliberately reimplemented rather than imported from
// features/projects (ISSUE_SEVERITY_DISPLAY) or features/dashboard
// (RAG_DOT_CLASS/ECOAvatar), matching this codebase's convention of small
// per-feature dot/avatar helpers over cross-feature component imports.

const SEVERITY_DOT_CLASS: Record<CardSeverity, string> = {
  critical: 'bg-destructive',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-muted-foreground',
};

const AVATAR_PALETTE = ['#2563EB', '#9333EA', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#0D9488'];

function hashIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % AVATAR_PALETTE.length;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Never model-supplied — derived purely from the item's real UUID/dueDate so
// nothing shown on a card can be an invented ID or age (see the plan's "no
// fabricated data" requirement).
function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function dueLabel(dueDate: string | undefined): string | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const days = Math.round((due.getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'due today';
  return `due in ${days}d`;
}

function CardItemRow({ item }: { item: CardItem }) {
  const due = dueLabel(item.dueDate);
  const metaLine = [item.contextLabel, due].filter(Boolean).join(' · ');
  const primaryAssignee = item.assignees?.[0];

  return (
    <div className="flex items-center gap-2.5 py-2">
      {item.severity && <span className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT_CLASS[item.severity])} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {metaLine && <p className="truncate text-xs text-muted-foreground">{metaLine}</p>}
      </div>
      {primaryAssignee && (
        <span
          title={item.assignees?.join(', ')}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: AVATAR_PALETTE[hashIndex(primaryAssignee)] }}
        >
          {initials(primaryAssignee)}
        </span>
      )}
      <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
        {shortId(item.id)}
      </Badge>
    </div>
  );
}

export function AssistantCardMessage({ card, createdAt, onFollowUp }: AssistantCardMessageProps) {
  const asOf = createdAt
    ? `as of ${format(new Date(createdAt), 'MMM d')} · ${formatDistanceToNow(new Date(createdAt), { addSuffix: true })}`
    : 'just now';
  const footerText = `${card.sources.length} source${card.sources.length === 1 ? '' : 's'} · ${asOf}`;

  return (
    <div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
            {card.badge && <Badge variant="secondary">{card.badge}</Badge>}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {card.type === 'status' && (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold text-foreground">{Math.round(card.metricValue)}%</div>
                  <p className="text-xs text-muted-foreground">{card.metricLabel ?? 'Complete'}</p>
                </div>
                {card.taskCount && (
                  <div className="text-right">
                    <div className="text-lg font-semibold text-foreground">
                      {card.taskCount.completed} / {card.taskCount.total}
                    </div>
                    <p className="text-xs text-muted-foreground">tasks done</p>
                  </div>
                )}
              </div>
              <Progress value={card.metricValue} />
            </>
          )}

          {card.items.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {card.itemsLabel ?? 'Items'}
              </p>
              <div className="divide-y divide-border">
                {card.items.map((item) => (
                  <CardItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : (
            card.type === 'list' &&
            card.emptyText && <p className="text-sm text-muted-foreground">{card.emptyText}</p>
          )}
        </CardContent>

        <CardFooter className="border-t border-border py-3 text-xs text-muted-foreground">{footerText}</CardFooter>
      </Card>

      {card.followUps && card.followUps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.followUps.map((text) => (
            <Button
              key={text}
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-xs"
              onClick={() => onFollowUp(text)}
            >
              {text}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
