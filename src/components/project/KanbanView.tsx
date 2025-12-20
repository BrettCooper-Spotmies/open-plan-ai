import { Task, TaskStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface KanbanViewProps {
  tasks: Task[];
}

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'bg-status-todo' },
  { status: 'in-progress', label: 'In Progress', color: 'bg-status-in-progress' },
  { status: 'review', label: 'Review', color: 'bg-status-review' },
  { status: 'done', label: 'Done', color: 'bg-status-done' },
];

const priorityColors = {
  critical: 'bg-priority-critical text-white',
  high: 'bg-priority-high text-white',
  medium: 'bg-priority-medium text-white',
  low: 'bg-priority-low text-white',
};

const moduleColors = {
  hardware: 'border-l-module-hardware',
  software: 'border-l-module-software',
  firmware: 'border-l-module-firmware',
  testing: 'border-l-module-testing',
};

export function KanbanView({ tasks }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = tasks.filter(t => t.status === column.status);
        
        return (
          <div key={column.status} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className={cn('w-2 h-2 rounded-full', column.color)} />
              <h3 className="font-medium text-sm">{column.label}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {columnTasks.length}
              </span>
            </div>
            
            <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30">
              {columnTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className={cn(
                    'p-3 cursor-pointer card-hover border-l-4',
                    moduleColors[task.module]
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium leading-tight">
                        {task.title}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={cn('text-[10px] px-1.5 py-0 shrink-0', priorityColors[task.priority])}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      {task.assignee && (
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-muted">
                            {task.assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
