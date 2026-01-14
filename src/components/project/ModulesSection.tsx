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
}

export function ModulesSection({ modules, tasks, issues }: ModulesSectionProps) {
  const [viewMode, setViewMode] = useState<ModuleViewMode>('kanban');

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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ModuleViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="gap-1.5 px-3 data-[state=on]:bg-background">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3 data-[state=on]:bg-background">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      </div>

      {/* View Content */}
      <div className="min-h-[400px]">
        {viewMode === 'kanban' ? (
          <ModulesKanbanView modules={modulesWithStats} />
        ) : (
          <ModulesListView modules={modulesWithStats} />
        )}
      </div>
    </div>
  );
}
