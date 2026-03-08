import { useState, useMemo } from 'react';
import { LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Module, ModuleViewMode, Task, Issue, TeamMember, ModuleType } from '@/types';
import { ModulesKanbanView } from './ModulesKanbanView';
import { ModulesListView } from './ModulesListView';
import { ModuleDetailModal } from './ModuleDetailModal';
import { AddModuleDialog } from './AddModuleDialog';
import { getModuleTasks, getModuleProgress } from '../utils/projectUtils';

interface ModuleWithStats extends Module {
  taskCount: number;
  progress: number;
  openIssues: number;
  tasks: Task[];
}

interface ModulesSectionProps {
  modules: Module[];
  tasks: Task[];
  issues: Issue[];
  teamMembers: TeamMember[];
  viewMode?: ModuleViewMode;
  onViewModeChange?: (mode: ModuleViewMode) => void;
  searchQuery?: string;
  isAddDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  onModuleAdd?: (module: Omit<Module, 'id' | 'createdAt'>) => void;
  onModuleUpdate?: (module: Module) => void;
  onModuleDelete?: (moduleId: string) => void;
  onTaskClick?: (task: Task) => void;
  onIssueClick?: (issue: Issue) => void;
  onTaskUpdate?: (task: Task) => void;
  onIssueUpdate?: (issue: Issue) => void;
}

export function ModuleViewControls({
  viewMode,
  onViewModeChange,
  onAddModule,
  searchQuery = '',
  onSearchQueryChange,
}: {
  viewMode: ModuleViewMode;
  onViewModeChange: (mode: ModuleViewMode) => void;
  onAddModule: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Search Icon / Input */}
      <div className="flex items-center">
        {isSearchOpen ? (
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              className="h-8 w-40"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsSearchOpen(false);
                onSearchQueryChange?.('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => value && onViewModeChange(value as ModuleViewMode)}
        className="bg-muted/50 p-1 rounded-lg"
      >
        <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-2 data-[state=on]:bg-background">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view" className="px-2 data-[state=on]:bg-background">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Button size="sm" className="gap-2" onClick={onAddModule}>
        <Plus className="h-4 w-4" />
        Add Module
      </Button>
    </div>
  );
}

export function ModulesSection({
  modules,
  tasks,
  issues,
  teamMembers,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
  searchQuery = '',
  isAddDialogOpen: externalIsAddDialogOpen,
  onAddDialogClose,
  onModuleAdd,
  onModuleUpdate,
  onModuleDelete,
  onTaskClick,
  onIssueClick,
  onTaskUpdate,
  onIssueUpdate,
}: ModulesSectionProps) {
  const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const viewMode = externalViewMode || 'kanban';

  // Filter modules by search query
  const filteredModules = searchQuery.trim()
    ? modules.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : modules;

  // Calculate module stats
  const modulesWithStats = useMemo(() => {
    return filteredModules.map(module => {
      const moduleTasks = getModuleTasks(module.type, tasks);
      const progress = getModuleProgress(module.type, tasks);
      const openIssues = issues.filter(
        i => i.moduleId === module.id && i.status !== 'resolved' && i.status !== 'closed'
      ).length;

      return {
        ...module,
        taskCount: moduleTasks.length,
        progress,
        openIssues,
        tasks: moduleTasks,
      };
    });
  }, [filteredModules, tasks, issues]);

  const handleModuleClick = (module: ModuleWithStats) => {
    setSelectedModule(module);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedModule(null);
  };

  const handleAddModule = (newModule: Omit<Module, 'id' | 'createdAt'>) => {
    onModuleAdd?.(newModule);
  };

  const handleLinkTask = (taskId: string, moduleId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && onTaskUpdate) {
      const currentIds = task.moduleIds || (task.moduleId ? [task.moduleId] : []);
      if (!currentIds.includes(moduleId)) {
        onTaskUpdate({
          ...task,
          moduleIds: [...currentIds, moduleId],
          moduleId: currentIds.length === 0 ? moduleId : task.moduleId,
          module: currentIds.length === 0 ? (modules.find(m => m.id === moduleId)?.type || task.module) : task.module
        });
      }
    }
  };

  const handleUnlinkTask = (taskId: string, moduleId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && onTaskUpdate) {
      const currentIds = task.moduleIds || (task.moduleId ? [task.moduleId] : []);
      const updatedIds = currentIds.filter(id => id !== moduleId);

      const nextModuleId = updatedIds.length > 0 ? updatedIds[0] : undefined;
      const nextModuleType = nextModuleId ? (modules.find(m => m.id === nextModuleId)?.type || task.module) : task.module;

      onTaskUpdate({
        ...task,
        moduleIds: updatedIds,
        moduleId: nextModuleId,
        module: nextModuleType as ModuleType
      });
    }
  };

  const handleLinkIssue = (issueId: string, moduleId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue && onIssueUpdate) {
      onIssueUpdate({ ...issue, moduleId });
    }
  };

  const handleUnlinkIssue = (issueId: string, moduleId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue && onIssueUpdate) {
      onIssueUpdate({ ...issue, moduleId: undefined });
    }
  };

  const existingModuleNames = modules.map(m => m.name);

  return (
    <>
      <div className="space-y-4 grid grid-cols-1 w-full min-w-0">
        {/* View Content */}
        <div className="min-h-[400px] w-full min-w-0">
          {viewMode === 'kanban' ? (
            <ModulesKanbanView
              modules={modulesWithStats}
              onModuleClick={handleModuleClick}
            />
          ) : (
            <ModulesListView
              modules={modulesWithStats}
              onModuleClick={handleModuleClick}
            />
          )}
        </div>
      </div>

      {/* Module Detail Modal */}
      <ModuleDetailModal
        module={selectedModule}
        allTasks={tasks}
        allIssues={issues}
        teamMembers={teamMembers}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={onModuleUpdate}
        onDelete={onModuleDelete}
        onTaskClick={onTaskClick}
        onIssueClick={onIssueClick}
        onLinkTask={handleLinkTask}
        onUnlinkTask={handleUnlinkTask}
        onLinkIssue={handleLinkIssue}
        onUnlinkIssue={handleUnlinkIssue}
      />
    </>
  );
}

// Export a function to open the add dialog from parent
export function useModulesSectionControls() {
  const [internalViewMode, setInternalViewMode] = useState<ModuleViewMode>('kanban');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return {
    isAddDialogOpen,
    internalViewMode,
    setInternalViewMode,
    openAddDialog: () => setIsAddDialogOpen(true),
    closeAddDialog: () => setIsAddDialogOpen(false),
  };
}
