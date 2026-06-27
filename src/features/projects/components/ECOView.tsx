import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useECOList } from '@/hooks/useECOs';
import { ECOListItem, fromApiEcoListItem } from './ecoData';
import { ECOListView } from './ECOListView';
import { ECODetailView } from './ECODetailView';
import { ECOWizard } from './ECOWizard';

type WizardState = { ecoId: string | null } | null;

export function ECOView({
  projectId,
  newTrigger,
  onNewConsumed,
  openEcoId = null,
  onOpenEcoIdChange,
}: {
  projectId: string;
  newTrigger?: boolean;
  onNewConsumed?: () => void;
  openEcoId?: string | null;
  onOpenEcoIdChange?: (id: string | null) => void;
}) {
  const [wizard, setWizard] = useState<WizardState>(null);

  useEffect(() => {
    if (newTrigger) {
      setWizard({ ecoId: null });
      onNewConsumed?.();
    }
  }, [newTrigger]);

  // Resolves openEcoId (from the URL) into a full ECOListItem. Reuses ECOListView's
  // unfiltered query cache when both are mounted with the same key; otherwise fetches
  // its own copy (e.g. on a direct deep link / page refresh).
  const { data: listData, isLoading: listLoading } = useECOList(projectId, {});
  const resolvedEco = openEcoId
    ? (listData?.data ?? []).map(fromApiEcoListItem).find(e => e.id === openEcoId) ?? null
    : null;

  const setOpenEco = (eco: ECOListItem | null) => onOpenEcoIdChange?.(eco ? eco.id : null);

  return (
    <>
      {openEcoId ? (
        resolvedEco ? (
          <ECODetailView
            eco={resolvedEco}
            projectId={projectId}
            onBack={() => setOpenEco(null)}
            onEdit={eco => setWizard({ ecoId: eco.id })}
          />
        ) : listLoading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center px-4">
            <p className="text-sm text-muted-foreground">This engineering change could not be found.</p>
            <Button variant="outline" size="sm" onClick={() => setOpenEco(null)}>
              Back to Eng. Changes
            </Button>
          </div>
        )
      ) : (
        <ECOListView
          projectId={projectId}
          onOpen={eco => setOpenEco(eco)}
        />
      )}
      {wizard !== null && (
        <ECOWizard
          projectId={projectId}
          ecoId={wizard.ecoId ?? undefined}
          onClose={() => setWizard(null)}
        />
      )}
    </>
  );
}
