// BOM types, API response types, adapters, and tree helpers

export type BOMStatus = 'approved' | 'pending';
export type BOMCategory = 'power' | 'control' | 'connector' | 'enclosure' | 'hmi' | 'safety' | 'assembly';

export interface BOMRevision {
  rev: string;
  date: string;       // ISO date string
  author: string;
  changes: string;    // change description
  status: BOMStatus;
  price: number;
  leadTime: number;
}

export interface BOMNode {
  id: string;
  level: number;
  pn: string;
  desc: string;
  qty: number;
  uom: string;
  supplier: string;
  rev: string;
  status: BOMStatus;
  req: string[];
  cat: BOMCategory;
  manufacturer: string;
  distributor: string;
  price: number;
  leadTime: number;
  mpn: string;
  owner: string;
  revHistory: BOMRevision[];
  children?: BOMNode[];
  _x?: number;
  _y?: number;
  _partId?: string;   // backend part UUID — stored on adapted nodes for mutation calls
}

export const EMPTY_FILTERS = {
  priceMin: '', priceMax: '', leadMin: '', leadMax: '',
  units: [] as string[], suppliers: [] as string[],
  manufacturers: [] as string[], statuses: [] as BOMStatus[],
  owners: [] as string[],
  bomType: 'all' as 'all' | 'top' | 'catalog',
  mpn: '',
};
export type BOMFilters = typeof EMPTY_FILTERS;

// ── Category metadata ─────────────────────────────────────────────
export const BOM_CAT_META: Record<BOMCategory, { tint: string; label: string; iconName: string }> = {
  power:     { tint: '#9333EA', label: 'Power Electronics',      iconName: 'Zap' },
  control:   { tint: '#6366F1', label: 'Control & Comms',        iconName: 'Cpu' },
  connector: { tint: '#16A34A', label: 'Charging Connectors',    iconName: 'Package' },
  enclosure: { tint: '#EA8C00', label: 'Enclosure & Mechanical', iconName: 'Box' },
  hmi:       { tint: '#0EA5E9', label: 'HMI & Interface',        iconName: 'Monitor' },
  safety:    { tint: '#DC2626', label: 'Safety & Protection',    iconName: 'Shield' },
  assembly:  { tint: '#2563EB', label: 'Top Assembly',           iconName: 'Layers' },
};

// Empty fallback — components that previously used BOM_NODES as a default now receive
// the live rootNodes prop; this empty array prevents import errors during the migration.
export const BOM_NODES: BOMNode[] = [];

// ── Raw API response types ────────────────────────────────────────

export interface ApiRevisionResponse {
  id: string;
  partId: string;
  rev: string;
  changes: string;
  author: string | null;
  status: BOMStatus;
  price: string | null;
  leadTimeDays: number | null;
  ecoId: string | null;
  createdAt: string;
}

export interface ApiPartResponse {
  id: string;
  orgId: string;
  partNumber: string;
  description: string;
  category: BOMCategory;
  manufacturer: string | null;
  distributor: string | null;
  mpn: string | null;
  unit: string;
  notes: string | null;
  latestRevision: ApiRevisionResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReqLinkResponse {
  id: string;
  nodeId: string;
  requirementId: string;
  createdAt: string;
}

export interface ApiNodeResponse {
  id: string;
  treeId: string;
  partId: string;
  parentId: string | null;
  position: number;
  quantity: string;
  unit: string;
  status: BOMStatus;
  notes: string | null;
  owner: { id: string; name: string } | null;
  part: ApiPartResponse;
  requirements: ApiReqLinkResponse[];
  children?: ApiNodeResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiTreeResponse {
  id: string;
  projectId: string;
  orgId: string;
  root: ApiNodeResponse | null;
  totalNodes: number;
  pendingCount: number;
  approvedCount: number;
}

export interface ApiSummaryResponse {
  treeId: string | null;
  projectId: string;
  totalNodes: number;
  pendingCount: number;
  approvedCount: number;
  totalCost: number;
  byCategory: Array<{ category: string; count: number; totalCost: number }>;
}

// ── Adapters: API response → BOMNode / BOMRevision ────────────────

export function fromApiNode(node: ApiNodeResponse, depth = 0): BOMNode {
  const rev = node.part.latestRevision;
  return {
    id:           node.id,
    level:        depth,
    pn:           node.part.partNumber,
    desc:         node.part.description,
    qty:          parseFloat(node.quantity),
    uom:          node.unit,
    supplier:     node.part.manufacturer ?? '',
    rev:          rev?.rev ?? 'A',
    status:       node.status,
    req:          node.requirements.map(r => r.requirementId),
    cat:          node.part.category,
    manufacturer: node.part.manufacturer ?? '',
    distributor:  node.part.distributor ?? '',
    price:        parseFloat(rev?.price ?? '0'),
    leadTime:     Math.ceil((rev?.leadTimeDays ?? 0) / 7),
    mpn:          node.part.mpn ?? '',
    owner:        node.owner?.name ?? '',
    revHistory:   [],  // loaded on demand via usePartRevisions
    children:     node.children?.map(c => fromApiNode(c, depth + 1)),
    _partId:      node.part.id,
  };
}

export function fromApiRevision(r: ApiRevisionResponse): BOMRevision {
  return {
    rev:      r.rev,
    date:     r.createdAt.split('T')[0],
    author:   r.author ?? 'Unknown',
    changes:  r.changes,
    status:   r.status,
    price:    parseFloat(r.price ?? '0'),
    leadTime: Math.ceil((r.leadTimeDays ?? 0) / 7),
  };
}

// ── Tree helpers ──────────────────────────────────────────────────

export const bomFlatAll = (nodes: BOMNode[]): BOMNode[] => {
  const r: BOMNode[] = [];
  const w = (list: BOMNode[]) => { for (const n of list) { r.push(n); if (n.children) w(n.children); } };
  w(nodes);
  return r;
};

export const bomFlatten = (nodes: BOMNode[], expanded: Record<string, boolean>): BOMNode[] => {
  const r: BOMNode[] = [];
  const w = (list: BOMNode[]) => { for (const n of list) { r.push(n); if (n.children && expanded[n.id]) w(n.children); } };
  w(nodes);
  return r;
};

export const bomCountAll = (nodes: BOMNode[]) => bomFlatAll(nodes).length;

export const bomFind = (id: string, nodes: BOMNode[] = BOM_NODES): BOMNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = bomFind(id, n.children); if (f) return f; }
  }
  return null;
};

export const bomPath = (id: string, nodes: BOMNode[] = BOM_NODES, trail: BOMNode[] = []): BOMNode[] | null => {
  for (const n of nodes) {
    const t = [...trail, n];
    if (n.id === id) return t;
    if (n.children) { const f = bomPath(id, n.children, t); if (f) return f; }
  }
  return null;
};

export const bomFilterTree = (nodes: BOMNode[], pred: (n: BOMNode) => boolean): Set<string> => {
  const include = new Set<string>();
  const visit = (n: BOMNode, anc: BOMNode[]): boolean => {
    let match = pred(n), childMatch = false;
    if (n.children) for (const c of n.children) childMatch = visit(c, [...anc, n]) || childMatch;
    if (match || childMatch) { include.add(n.id); anc.forEach(a => include.add(a.id)); return true; }
    return false;
  };
  nodes.forEach(n => visit(n, []));
  return include;
};

export const bomFlattenInclude = (nodes: BOMNode[], include: Set<string>): BOMNode[] => {
  const r: BOMNode[] = [];
  const w = (list: BOMNode[]) => { for (const n of list) { if (include.has(n.id)) { r.push(n); if (n.children) w(n.children); } } };
  w(nodes);
  return r;
};

export const bomTypeOf = (n: BOMNode): 'top' | 'subassembly' | 'catalog' =>
  n.level === 0 ? 'top' : (n.children && n.children.length ? 'subassembly' : 'catalog');
