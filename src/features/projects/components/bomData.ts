// BOM types, data, enrichment, and tree helpers

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
  owner: string;            // person responsible for this part
  revHistory: BOMRevision[];
  children?: BOMNode[];
  _x?: number;
  _y?: number;
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
  power:     { tint: '#9333EA', label: 'Power Electronics',    iconName: 'Zap' },
  control:   { tint: '#6366F1', label: 'Control & Comms',      iconName: 'Cpu' },
  connector: { tint: '#16A34A', label: 'Charging Connectors',  iconName: 'Package' },
  enclosure: { tint: '#EA8C00', label: 'Enclosure & Mechanical', iconName: 'Box' },
  hmi:       { tint: '#0EA5E9', label: 'HMI & Interface',       iconName: 'Monitor' },
  safety:    { tint: '#DC2626', label: 'Safety & Protection',   iconName: 'Shield' },
  assembly:  { tint: '#2563EB', label: 'Top Assembly',          iconName: 'Layers' },
};

const CAT_BY_PREFIX: Record<string, BOMCategory> = {
  CS: 'assembly', PWR: 'power', CTL: 'control',
  CHD: 'connector', ENC: 'enclosure', HMI: 'hmi', SAF: 'safety',
};

const catOf = (pn: string): BOMCategory => {
  const m = pn.match(/EV-([A-Z]+)-/);
  return (m && CAT_BY_PREFIX[m[1]]) || 'assembly';
};

// ── Owner pool ────────────────────────────────────────────────────
const OWNERS = [
  'Sarah Chen', 'Marcus Rodriguez', 'Aisha Kumar', 'James Park',
  'Lena Torres', 'Wei Zhang', 'David Okafor', 'Priya Nair',
];

// ── Revision history generation ───────────────────────────────────
const REV_AUTHORS = ['S. Chen', 'M. Rodriguez', 'A. Kumar', 'J. Park', 'L. Torres'];
const REV_NOTES: Record<string, string[]> = {
  A: ['Initial release', 'Prototype validation complete'],
  B: ['Updated per ECO-0042; replaced connector housing', 'Supplier change — Mouser to Arrow, same MPN', 'Tolerance updated per DFM review'],
  C: ['Rev B issues resolved; approved for production pilot', 'Lead time negotiated — 16 wk → 10 wk', 'Alternate MPN qualified'],
  D: ['Mass-production BOM freeze', 'Cost reduction — $2.30/unit saving'],
};

function makeRevDate(revIdx: number): string {
  // Spread dates from 18 months ago up to today
  const base = new Date('2024-12-01');
  base.setMonth(base.getMonth() + revIdx * 4);
  return base.toISOString().split('T')[0];
}

function generateRevHistory(rev: string, price: number, leadTime: number, status: BOMStatus, h: number): BOMRevision[] {
  const LETTERS = 'ABCDEFGHIJ';
  const idx = LETTERS.indexOf(rev.toUpperCase());
  const history: BOMRevision[] = [];
  for (let i = 0; i <= Math.max(0, idx); i++) {
    const r = LETTERS[i];
    const isCurrent = i === idx;
    const notes = REV_NOTES[r] || ['Engineering change applied'];
    history.push({
      rev: r,
      date: makeRevDate(i),
      author: REV_AUTHORS[(h + i) % REV_AUTHORS.length],
      changes: notes[(h + i) % notes.length],
      status: isCurrent ? status : 'approved',
      price: Math.round(price * (1 - (idx - i) * 0.04) * 100) / 100,
      leadTime: Math.max(2, leadTime + (idx - i)),
    });
  }
  return history;
}

// ── Enrichment ────────────────────────────────────────────────────
const DISTRIBUTORS = ['Digi-Key', 'Mouser', 'Arrow', 'Avnet', 'Future Electronics'];

function bomHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface RawNode {
  id: string; level: number; pn: string; desc: string;
  qty: number; uom: string; supplier: string; rev: string;
  status: BOMStatus; req: string[]; children?: RawNode[];
}

function enrich(n: RawNode): BOMNode {
  const h = bomHash(n.pn);
  const manufacturer = n.supplier;
  const internal = /internal|chargepoint/i.test(manufacturer);
  const distributor = internal ? 'Internal' : DISTRIBUTORS[h % DISTRIBUTORS.length];
  const price = Math.round(((h % 31900) / 100 + 0.5) * 100) / 100;
  const leadTime = (h % 22) + 2;
  const code = (h % 90000 + 10000).toString(36).toUpperCase().slice(0, 5);
  const mpn = `${manufacturer.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN'}-${code}`;
  const revHistory = generateRevHistory(n.rev, price, leadTime, n.status, h);
  const owner = OWNERS[h % OWNERS.length];
  return {
    ...n, cat: catOf(n.pn), manufacturer, distributor, price, leadTime, mpn, owner, revHistory,
    children: n.children?.map(enrich),
  };
}

// ── Raw BOM data ──────────────────────────────────────────────────
const RAW: RawNode[] = [
  {
    id: '1.0', level: 0, pn: 'EV-CS-001', desc: 'EV Charging Station — Top Assembly',
    qty: 1, uom: 'EA', supplier: 'Internal', rev: 'C', status: 'approved', req: ['SYS-001', 'SYS-002'],
    children: [
      {
        id: '1.1', level: 1, pn: 'EV-PWR-010', desc: 'Power Electronics Module',
        qty: 1, uom: 'EA', supplier: 'SiemensAG', rev: 'B', status: 'approved', req: ['PWR-001', 'PWR-002'],
        children: [
          { id: '1.1.1', level: 2, pn: 'EV-PWR-011', desc: 'IGBT Power Bridge 150A',       qty: 4,  uom: 'EA', supplier: 'Infineon',          rev: 'A', status: 'approved', req: ['PWR-003'] },
          { id: '1.1.2', level: 2, pn: 'EV-PWR-012', desc: 'Gate Driver PCB',               qty: 2,  uom: 'EA', supplier: 'Texas Instruments', rev: 'A', status: 'approved', req: ['PWR-004'] },
          { id: '1.1.3', level: 2, pn: 'EV-PWR-013', desc: 'DC Bus Capacitor 1200V 1500µF', qty: 6,  uom: 'EA', supplier: 'Vishay',            rev: 'B', status: 'pending',  req: ['PWR-005'] },
          { id: '1.1.4', level: 2, pn: 'EV-PWR-014', desc: 'Current Sense Resistor 0.01Ω', qty: 12, uom: 'EA', supplier: 'Bourns Inc.',       rev: 'A', status: 'approved', req: ['PWR-006'] },
        ],
      },
      {
        id: '1.2', level: 1, pn: 'EV-CTL-020', desc: 'Controller & Communication Board',
        qty: 1, uom: 'EA', supplier: 'Kontron AG', rev: 'C', status: 'approved', req: ['CTL-001', 'CTL-002'],
        children: [
          { id: '1.2.1', level: 2, pn: 'EV-CTL-021', desc: 'ARM Cortex-M7 MCU',         qty: 1, uom: 'EA',  supplier: 'STMicroelectronics', rev: 'A', status: 'approved', req: ['CTL-003'] },
          { id: '1.2.2', level: 2, pn: 'EV-CTL-022', desc: 'CAN Bus Transceiver 5Mbps',  qty: 2, uom: 'EA',  supplier: 'NXP Semicond.',     rev: 'A', status: 'approved', req: ['CTL-004'] },
          { id: '1.2.3', level: 2, pn: 'EV-CTL-023', desc: '4G/LTE Modem Module',        qty: 1, uom: 'EA',  supplier: 'Sierra Wireless',   rev: 'B', status: 'pending',  req: ['CTL-005', 'CTL-006'] },
          { id: '1.2.4', level: 2, pn: 'EV-CTL-024', desc: 'Ethernet PHY 1Gbps',         qty: 1, uom: 'EA',  supplier: 'Marvell Tech.',     rev: 'A', status: 'approved', req: ['CTL-007'] },
          {
            id: '1.2.5', level: 2, pn: 'EV-CTL-025', desc: 'OCPP Protocol Stack License',
            qty: 1, uom: 'LIC', supplier: 'ChargePoint', rev: '2.0.1', status: 'approved', req: ['CTL-008'],
            children: [
              { id: '1.2.5.1', level: 3, pn: 'EV-CTL-025A', desc: 'OCPP 1.6 Firmware',   qty: 1, uom: 'LIC', supplier: 'ChargePoint', rev: '1.6.3', status: 'approved', req: ['CTL-009'] },
              { id: '1.2.5.2', level: 3, pn: 'EV-CTL-025B', desc: 'OCPP 2.0.1 Firmware', qty: 1, uom: 'LIC', supplier: 'ChargePoint', rev: '2.0.1', status: 'pending',  req: ['CTL-010'] },
            ],
          },
        ],
      },
      {
        id: '1.3', level: 1, pn: 'EV-CHD-030', desc: 'Charging Connectors Assembly',
        qty: 2, uom: 'SET', supplier: 'TE Connectivity', rev: 'B', status: 'approved', req: ['CHD-001'],
        children: [
          { id: '1.3.1', level: 2, pn: 'EV-CHD-031', desc: 'CCS2 DC Combo Connector',     qty: 1, uom: 'EA', supplier: 'TE Connectivity',  rev: 'B', status: 'approved', req: ['CHD-002', 'SAF-001'] },
          { id: '1.3.2', level: 2, pn: 'EV-CHD-032', desc: 'CHAdeMO Connector 62.5A',      qty: 1, uom: 'EA', supplier: 'Sumitomo Elec.',   rev: 'A', status: 'approved', req: ['CHD-003', 'SAF-001'] },
          { id: '1.3.3', level: 2, pn: 'EV-CHD-033', desc: 'Type 2 AC Connector 32A',      qty: 1, uom: 'EA', supplier: 'Phoenix Contact',  rev: 'C', status: 'pending',  req: ['CHD-004'] },
          { id: '1.3.4', level: 2, pn: 'EV-CHD-034', desc: 'Cable Management Bracket',     qty: 4, uom: 'EA', supplier: 'Internal',         rev: 'A', status: 'approved', req: [] },
        ],
      },
      {
        id: '1.4', level: 1, pn: 'EV-ENC-040', desc: 'Enclosure & Mechanical Structure',
        qty: 1, uom: 'EA', supplier: 'Rittal GmbH', rev: 'D', status: 'approved', req: ['MEC-001', 'ENV-001'],
        children: [
          { id: '1.4.1', level: 2, pn: 'EV-ENC-041', desc: 'Sheet Metal Cabinet IP54',          qty: 1, uom: 'EA', supplier: 'Rittal GmbH',    rev: 'D', status: 'approved', req: ['ENV-002'] },
          { id: '1.4.2', level: 2, pn: 'EV-ENC-042', desc: 'Front Door Panel w/ Display Cutout', qty: 1, uom: 'EA', supplier: 'Rittal GmbH',    rev: 'C', status: 'approved', req: ['MEC-002'] },
          { id: '1.4.3', level: 2, pn: 'EV-ENC-043', desc: 'DIN Rail Assembly Kit',              qty: 3, uom: 'EA', supplier: 'Phoenix Contact', rev: 'A', status: 'approved', req: [] },
          { id: '1.4.4', level: 2, pn: 'EV-ENC-044', desc: 'Pedestal Mounting Base',             qty: 1, uom: 'EA', supplier: 'Internal',        rev: 'B', status: 'pending',  req: ['MEC-003'] },
        ],
      },
      {
        id: '1.5', level: 1, pn: 'EV-HMI-050', desc: 'HMI Display & Interface',
        qty: 1, uom: 'EA', supplier: 'Advantech', rev: 'A', status: 'pending', req: ['UI-001'],
        children: [
          { id: '1.5.1', level: 2, pn: 'EV-HMI-051', desc: '7" Capacitive Touch Display', qty: 1, uom: 'EA', supplier: 'Advantech',   rev: 'A', status: 'pending',  req: ['UI-002'] },
          { id: '1.5.2', level: 2, pn: 'EV-HMI-052', desc: 'RFID Card Reader 13.56MHz',   qty: 1, uom: 'EA', supplier: 'HID Global',   rev: 'B', status: 'approved', req: ['UI-003', 'SEC-001'] },
          { id: '1.5.3', level: 2, pn: 'EV-HMI-053', desc: 'Status LED Strip RGB',         qty: 1, uom: 'EA', supplier: 'Osram',        rev: 'A', status: 'approved', req: ['UI-004'] },
          { id: '1.5.4', level: 2, pn: 'EV-HMI-054', desc: 'Payment Terminal Module',      qty: 1, uom: 'EA', supplier: 'Ingenico',     rev: 'C', status: 'pending',  req: ['UI-005', 'SEC-002'] },
        ],
      },
      {
        id: '1.6', level: 1, pn: 'EV-SAF-060', desc: 'Safety & Protection Systems',
        qty: 1, uom: 'EA', supplier: 'ABB Ltd.', rev: 'B', status: 'approved', req: ['SAF-001', 'SAF-002'],
        children: [
          { id: '1.6.1', level: 2, pn: 'EV-SAF-061', desc: 'Ground Fault Detection GFCI',   qty: 1, uom: 'EA', supplier: 'ABB Ltd.',        rev: 'B', status: 'approved', req: ['SAF-003', 'REG-001'] },
          { id: '1.6.2', level: 2, pn: 'EV-SAF-062', desc: 'Emergency Stop Button IP65',    qty: 1, uom: 'EA', supplier: 'Schneider Elec.', rev: 'A', status: 'approved', req: ['SAF-004'] },
          { id: '1.6.3', level: 2, pn: 'EV-SAF-063', desc: 'Surge Protection Device 40kA', qty: 1, uom: 'EA', supplier: 'Dehn+Söhne',     rev: 'A', status: 'approved', req: ['SAF-005', 'REG-002'] },
          { id: '1.6.4', level: 2, pn: 'EV-SAF-064', desc: 'Thermal Fuse 250A 500VDC',     qty: 2, uom: 'EA', supplier: 'Littelfuse',     rev: 'A', status: 'approved', req: ['SAF-006'] },
        ],
      },
    ],
  },
];

export const BOM_NODES: BOMNode[] = RAW.map(enrich);

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
