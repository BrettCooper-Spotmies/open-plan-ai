import { useState, useEffect } from 'react';
import { ECOListItem } from './ecoData';
import { ECOListView } from './ECOListView';
import { ECODetailView } from './ECODetailView';
import { ECOWizard } from './ECOWizard';

type WizardState = { seed: ECOListItem | null } | null;

export function ECOView({
  projectId,
  newTrigger,
  onNewConsumed,
}: {
  projectId: string;
  newTrigger?: boolean;
  onNewConsumed?: () => void;
}) {
  const [openEco, setOpenEco] = useState<ECOListItem | null>(null);
  const [wizard, setWizard] = useState<WizardState>(null);

  useEffect(() => {
    if (newTrigger) {
      setWizard({ seed: null });
      onNewConsumed?.();
    }
  }, [newTrigger]);

  return (
    <>
      {openEco ? (
        <ECODetailView
          eco={openEco}
          projectId={projectId}
          onBack={() => setOpenEco(null)}
          onEdit={eco => setWizard({ seed: eco })}
        />
      ) : (
        <ECOListView
          projectId={projectId}
          onOpen={eco => setOpenEco(eco)}
        />
      )}
      {wizard !== null && (
        <ECOWizard
          projectId={projectId}
          seed={wizard.seed ? { ...wizard.seed, ecr: wizard.seed.ecr ?? undefined } : null}
          onClose={() => setWizard(null)}
        />
      )}
    </>
  );
}
