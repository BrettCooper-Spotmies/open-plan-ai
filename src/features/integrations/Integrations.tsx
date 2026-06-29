import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo, type LogoSpec } from './BrandLogo';
import { LOGO_PATHS } from './logoPaths';
import solidworksLogo from '@/assets/logos/solidworks.svg';
import altiumLogo from '@/assets/logos/altium.svg';
import fusion360Logo from '@/assets/logos/fusion360.svg';
import orcadLogo from '@/assets/logos/orcad.svg';
import arenaLogo from '@/assets/logos/arena-plm.svg';
import {
  Search,
  Clock,
  Network,
  Bot,
  ClipboardList,
  Boxes,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: LogoSpec;
  color: string;
}

interface Section {
  title: string;
  items: Integration[];
}

const SECTIONS: Section[] = [
  {
    title: 'Features',
    items: [
      {
        id: 'requirements',
        name: 'Requirements',
        description: 'Trace requirements through tasks, modules, and ECOs for full coverage.',
        logo: { kind: 'icon', icon: ClipboardList },
        color: '#2563EB',
      },
      {
        id: 'inventory',
        name: 'Inventory',
        description: 'Track on-hand stock, allocations, and shortages against your BOMs.',
        logo: { kind: 'icon', icon: Boxes },
        color: '#D97706',
      },
      {
        id: 'gate-reviews',
        name: 'Gate Reviews',
        description: 'Run structured design and program gate reviews with sign-off tracking.',
        logo: { kind: 'icon', icon: ShieldCheck },
        color: '#059669',
      },
    ],
  },
  {
    title: 'Core Integrations',
    items: [
      {
        id: 'solidworks',
        name: 'SolidWorks',
        description: 'Sync CAD assemblies, parts, and revisions from SolidWorks into your BOM.',
        logo: { kind: 'image', src: solidworksLogo, alt: 'SolidWorks' },
        color: '#ED1C24',
      },
      {
        id: 'altium',
        name: 'Altium Designer',
        description: 'Pull PCB designs, schematics, and component data from Altium Designer.',
        logo: { kind: 'image', src: altiumLogo, alt: 'Altium Designer' },
        color: '#0091DA',
      },
      {
        id: 'arena-plm',
        name: 'Arena PLM',
        description: 'Keep BOMs, ECOs, and item masters in sync with Arena PLM.',
        logo: { kind: 'image', src: arenaLogo, alt: 'Arena PLM' },
        color: '#40AA1D',
      },
      {
        id: 'kicad',
        name: 'KiCad',
        description: 'Import open-source PCB designs and component libraries from KiCad.',
        logo: { kind: 'svg', path: LOGO_PATHS.kicad },
        color: '#314CB0',
      },
      {
        id: 'orcad',
        name: 'OrCAD',
        description: 'Bring schematic capture and PCB layout data in from OrCAD.',
        logo: { kind: 'image', src: orcadLogo, alt: 'OrCAD' },
        color: '#E31837',
      },
      {
        id: 'fusion-360',
        name: 'Fusion 360',
        description: 'Link mechanical CAD models and BOMs straight from Fusion 360.',
        logo: { kind: 'image', src: fusion360Logo, alt: 'Fusion 360' },
        color: '#FF6B00',
      },
    ],
  },
  {
    title: 'Connectors',
    items: [
      {
        id: 'mcp',
        name: 'MCP',
        description: 'Connect Model Context Protocol servers to bring external tools and data in.',
        logo: { kind: 'icon', icon: Network },
        color: '#7C3AED',
      },
      {
        id: 'google-sheets',
        name: 'Google Sheets',
        description: 'Sync project data, reports, and BOMs directly to and from Google Sheets.',
        logo: { kind: 'svg', path: LOGO_PATHS.googleSheets },
        color: '#34A853',
      },
      {
        id: 'excel',
        name: 'Microsoft Excel',
        description: 'Import and export BOMs, reports, and trackers as native Excel workbooks.',
        logo: { kind: 'icon', icon: FileSpreadsheet },
        color: '#217346',
      },
      {
        id: 'jira',
        name: 'Jira',
        description: 'Link issues, epics, and sprints to projects, tasks, and ECOs.',
        logo: { kind: 'svg', path: LOGO_PATHS.jira },
        color: '#0052CC',
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        description: "Bring OpenAI's GPT models into chat, automations, and document generation.",
        logo: { kind: 'icon', icon: Bot },
        color: '#74AA9C',
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'Link commits, branches, and pull requests to issues and ECOs automatically.',
        logo: { kind: 'svg', path: LOGO_PATHS.github },
        color: '#181717',
      },
      {
        id: 'claude',
        name: 'Claude',
        description: "Use Anthropic's Claude for AI-assisted planning, summaries, and task generation.",
        logo: { kind: 'svg', path: LOGO_PATHS.claude },
        color: '#D97757',
      },
      {
        id: 'google-docs',
        name: 'Google Docs',
        description: 'Generate and link requirement documents and specs straight from Google Docs.',
        logo: { kind: 'svg', path: LOGO_PATHS.googleDocs },
        color: '#4285F4',
      },
    ],
  },
];

export default function Integrations() {
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Integrations | Open Plan AI';
    return () => { document.title = 'Open Plan AI'; };
  }, []);

  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    return SECTIONS.map((section) => ({
      title: section.title,
      items: query
        ? section.items.filter((item) => item.name.toLowerCase().includes(query))
        : section.items,
    })).filter((section) => section.items.length > 0);
  }, [search]);

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search integrations..."
          className="pl-9"
        />
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No integrations match "{search}"</p>
        </div>
      ) : (
        grouped.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((integration) => (
                <Card key={integration.id} className="relative overflow-hidden">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={
                          integration.logo.kind === 'image'
                            ? 'flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-white border border-border p-1.5'
                            : 'flex h-10 w-10 items-center justify-center rounded-lg shrink-0'
                        }
                        style={integration.logo.kind === 'image' ? undefined : { backgroundColor: `${integration.color}1A` }}
                      >
                        <BrandLogo
                          logo={integration.logo}
                          color={integration.color}
                          className={integration.logo.kind === 'image' ? 'h-full w-full' : 'h-5 w-5'}
                        />
                      </div>
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        <Clock className="h-3 w-3" />
                        Coming soon
                      </Badge>
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground flex-1">{integration.description}</p>
                    <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
