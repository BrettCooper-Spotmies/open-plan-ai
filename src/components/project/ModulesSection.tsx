import { useState, useMemo } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Module, ModuleViewMode, Task, Issue, TeamMember } from '@/types';
import { ModulesKanbanView } from './ModulesKanbanView';
import { ModulesListView } from './ModulesListView';
import { ModuleDetailModal } from './ModuleDetailModal';
import { AddModuleDialog } from './AddModuleDialog';
import { getModuleTasks, getModuleProgress } from '@/lib/projectUtils';

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
  isAddDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  onModuleAdd?: (module: Omit<Module, 'id' | 'createdAt'>) => void;
  onModuleUpdate?: (module: Module) => void;
  onModuleDelete?: (moduleId: string) => void;
  onTaskClick?: (task: Task) => void;
  onIssueClick?: (issue: Issue) => void;
}

export function ModuleViewControls({
  viewMode,
  onViewModeChange,
  onAddModule
}: {
  viewMode: ModuleViewMode;
  onViewModeChange: (mode: ModuleViewMode) => void;
  onAddModule: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
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
  isAddDialogOpen: externalIsAddDialogOpen,
  onAddDialogClose,
  onModuleAdd,
  onModuleUpdate,
  onModuleDelete,
  onTaskClick,
  onIssueClick,
}: ModulesSectionProps) {
  const [internalViewMode, setInternalViewMode] = useState<ModuleViewMode>('kanban');
  const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [internalIsAddDialogOpen, setInternalIsAddDialogOpen] = useState(false);
  
  const isAddDialogOpen = externalIsAddDialogOpen ?? internalIsAddDialogOpen;
  
  const viewMode = externalViewMode ?? internalViewMode;

  // Calculate module stats
  const modulesWithStats = useMemo(() => {
    return modules.map(module => {
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
  }, [modules, tasks, issues]);

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
      />

      {/* Add Module Dialog */}
      <AddModuleDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setInternalIsAddDialogOpen(false);
          onAddDialogClose?.();
        }}
        onAdd={handleAddModule}
        teamMembers={teamMembers}
        existingModuleNames={existingModuleNames}
      />
    </>
  );
}

// Export a function to open the add dialog from parent
export function useModulesSectionControls() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return {
    isAddDialogOpen,
    openAddDialog: () => setIsAddDialogOpen(true),
    closeAddDialog: () => setIsAddDialogOpen(false),
  };
}
