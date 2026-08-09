import { useState } from 'react';
import { AdjustQuantityDialog } from '@/features/projects/components/AdjustQuantityDialog';
import { ReceiveStockDialog } from '@/features/projects/components/ReceiveStockDialog';

export default function DebugDialogs() {
  const [which] = useState<'adjust' | 'receive'>(
    (new URLSearchParams(window.location.search).get('which') as 'adjust' | 'receive') || 'adjust'
  );

  return (
    <div>
      {which === 'adjust' && (
        <AdjustQuantityDialog isOpen onClose={() => {}} stock={[]} onAdjust={() => {}} />
      )}
      {which === 'receive' && (
        <ReceiveStockDialog isOpen onClose={() => {}} orgId="debug-org" parts={[]} onReceive={() => {}} />
      )}
    </div>
  );
}
