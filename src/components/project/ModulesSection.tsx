import { useState, useMemo } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Module, ModuleViewMode, Task, Issue } from '@/types';
import { ModulesKanbanView } from './ModulesKanbanView';
import { ModulesListView } from './ModulesListView';
import { getModuleTasks, getModuleProgress } from '@/lib/projectUtils';

interface ModulesSectionProps {
  modules: Module[];
  tasks: Task[];
  issues: Issue[];
  viewMode?: ModuleViewMode;
  onViewModeChange?: (mode: ModuleViewMode) => void;
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
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange
}: ModulesSectionProps) {
  const [internalViewMode, setInternalViewMode] = useState<ModuleViewMode>('kanban');
  
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

  return (
    <div className="space-y-4 grid grid-cols-1 w-full min-w-0">
      {/* View Content */}
      <div className="min-h-[400px] w-full min-w-0">
        {viewMode === 'kanban' ? (
          <ModulesKanbanView modules={modulesWithStats} />
        ) : (
          <ModulesListView modules={modulesWithStats} />
        )}
      </div>
    </div>
  );
}
