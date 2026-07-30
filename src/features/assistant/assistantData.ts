import {
  Activity,
  ClipboardCheck,
  Flag,
  LayoutGrid,
  Layers,
  ListChecks,
  Search,
  Shield,
  Sparkles,
  UserPlus,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export type AssistantCategoryId = 'ask' | 'act' | 'build';

export interface AssistantCategoryMeta {
  id: AssistantCategoryId;
  label: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

export const ASSISTANT_CATEGORIES: AssistantCategoryMeta[] = [
  {
    id: 'ask',
    label: 'Ask',
    title: 'Ask',
    icon: Search,
    description: 'Status, blockers, BOM health, changes — answered live and traceable.',
  },
  {
    id: 'act',
    label: 'Act',
    title: 'Act',
    icon: Wand2,
    description: 'Create tasks, raise issues, shift gates, import a BOM revision.',
  },
  {
    id: 'build',
    label: 'Build',
    title: 'Build',
    icon: LayoutGrid,
    description: 'Stand up a whole project — or just a requirements set — from a PRD, a BOM, and a schedule.',
  },
];

export interface AssistantSuggestion {
  id: string;
  category: AssistantCategoryId;
  icon: LucideIcon;
  text: string;
}

export const ASSISTANT_SUGGESTIONS: AssistantSuggestion[] = [
  // Ask
  { id: 'ask-status', category: 'ask', icon: Activity, text: "What's the status of Smart Patient Vital Monitor?" },
  { id: 'ask-blocking', category: 'ask', icon: Shield, text: "What's blocking Smart Patient Vital Monitor?" },
  { id: 'ask-single-sourced', category: 'ask', icon: Layers, text: 'Which BOM lines are single-sourced?' },
  { id: 'ask-req-coverage', category: 'ask', icon: ListChecks, text: "How's requirements coverage looking for Smart Patient Vital Monitor?" },
  { id: 'ask-req-rework', category: 'ask', icon: Sparkles, text: 'Which requirements need rework before approval?' },
  // Act
  { id: 'act-create-task', category: 'act', icon: ClipboardCheck, text: 'Create a task "power tree review" under Power module, assign Sam, due Friday' },
  { id: 'act-move-gate', category: 'act', icon: Flag, text: 'Move the DVT gate to March 12' },
  { id: 'act-assign-backlog', category: 'act', icon: UserPlus, text: 'Assign all unassigned firmware tasks to the embedded team' },
  { id: 'act-acceptance-criteria', category: 'act', icon: ClipboardCheck, text: 'Generate acceptance criteria for SYS-006' },
  { id: 'act-check-conflicts', category: 'act', icon: Shield, text: 'Check Signal Processing requirements for conflicts' },
  // Build
  { id: 'build-new-project', category: 'build', icon: LayoutGrid, text: 'Create a new project from these documents' },
  { id: 'build-requirements', category: 'build', icon: LayoutGrid, text: 'Create requirements for this project from these notes' },
];

export interface AssistantConversation {
  id: string;
  title: string;
  subtitle: string;
  scope: string;
  timeAgo: string;
  icon?: LucideIcon;
}

export const ASSISTANT_RECENT_CONVERSATIONS: AssistantConversation[] = [
  {
    id: 'conv-status-vital-monitor',
    title: 'Status — Smart Patient Vital Monitor',
    subtitle: 'EVT gate 3d overdue · 2 open blockers',
    scope: 'This project',
    timeAgo: 'Just now',
    icon: Activity,
  },
  {
    id: 'conv-new-project-prd',
    title: 'New project from PRD + BOM',
    subtitle: 'Draft: 214 lines · 6 modules · 118 tasks',
    scope: 'All projects',
    timeAgo: '2h ago',
    icon: LayoutGrid,
  },
  {
    id: 'conv-single-sourced-bom',
    title: 'Single-sourced BOM lines',
    subtitle: '8 lines flagged single-sourced',
    scope: 'This BOM',
    timeAgo: 'Yesterday',
  },
  {
    id: 'conv-reassign-firmware',
    title: 'Reassign firmware backlog',
    subtitle: 'Assigned 14 tasks · 1 failed',
    scope: 'This project',
    timeAgo: 'Mon',
  },
  {
    id: 'conv-compare-vital-ecg',
    title: 'Compare Vital Monitor vs ECG Patch',
    subtitle: 'Progress, blockers, gate variance',
    scope: 'All projects',
    timeAgo: 'Jul 8',
  },
];

export const ASSISTANT_SCOPE_OPTIONS = ['This project', 'This BOM'] as const;
export type AssistantScope = (typeof ASSISTANT_SCOPE_OPTIONS)[number];
