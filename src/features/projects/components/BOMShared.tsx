// Shared micro-components for BOM views
import {
  Zap, Cpu, Package, Box, Monitor, Shield, Layers,
} from 'lucide-react';
import { BOMCategory, BOMStatus, BOM_CAT_META } from './bomData';
import { Link2 } from 'lucide-react';

const CAT_ICONS: Record<BOMCategory, React.ElementType> = {
  power: Zap, control: Cpu, connector: Package, enclosure: Box,
  hmi: Monitor, safety: Shield, assembly: Layers,
};

export function PartThumb({
  cat, size = 32, radius = 7, big = false, imageUrl,
}: { cat: BOMCategory; size?: number; radius?: number; big?: boolean; imageUrl?: string | null }) {
  const meta = BOM_CAT_META[cat] ?? BOM_CAT_META.assembly;
  const Icon = CAT_ICONS[cat] ?? Package;
  const iconSize = big ? 34 : Math.round(size * 0.46);

  const patternSize = big ? 9 : 6;
  const containerStyle: React.CSSProperties = {
    width: big ? '100%' : size,
    height: big ? 132 : size,
    borderRadius: radius,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid var(--border)',
    background: `${meta.tint}0d`,
    backgroundImage: imageUrl ? undefined : `repeating-linear-gradient(135deg, ${meta.tint}1f 0, ${meta.tint}1f 1px, transparent 1px, transparent ${patternSize}px)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (imageUrl) {
    return (
      <div style={containerStyle}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Icon style={{ width: iconSize, height: iconSize, color: meta.tint }} />
      {big && (
        <span
          className="absolute bottom-2 left-0 right-0 text-center text-[9px] tracking-widest font-mono text-muted-foreground uppercase"
        >
          part photo
        </span>
      )}
    </div>
  );
}

export function BOMStatusPill({ status }: { status: BOMStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
        style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)' }}>
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.2)' }}>
      Pending
    </span>
  );
}

export function ReqTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap transition-colors bg-muted text-foreground border border-border hover:bg-accent"
    >
      <Link2 style={{ width: 10, height: 10 }} />
      {label}
    </span>
  );
}
