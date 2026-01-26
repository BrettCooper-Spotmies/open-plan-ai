import { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DependencyViewProps {
  tasks: Task[];
}

const statusColors = {
  todo: 'border-status-todo',
  'in-progress': 'border-status-in-progress',
  review: 'border-status-review',
  done: 'border-status-done',
  blocked: 'border-status-blocked',
};

export function DependencyView({ tasks }: DependencyViewProps) {
  const tasksWithDeps = tasks.filter(t => t.dependencies.length > 0 || t.blockedBy.length > 0);
  const independentTasks = tasks.filter(t => t.dependencies.length === 0 && t.blockedBy.length === 0);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  return (
    <div className="space-y-6">
      {/* Dependency chains */}
      <div>
        <h3 className="text-sm font-medium mb-4">Dependency Chains</h3>
        <div className="space-y-4">
          {tasksWithDeps.map((task) => (
            <Card key={task.id} className={cn('p-4 border-l-4', statusColors[task.status])}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.status === 'blocked' && (
                      <AlertCircle className="h-4 w-4 text-status-blocked" />
                    )}
                  </div>
                  
                  {task.blockedBy.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Blocked by:</p>
                      <div className="flex flex-wrap gap-2">
                        {task.blockedBy.map((depId) => {
                          const depTask = getTaskById(depId);
                          return depTask ? (
                            <Badge 
                              key={depId} 
                              variant="outline"
                              className={cn(
                                'text-xs',
                                depTask.status === 'done' ? 'border-status-done text-status-done' : 'border-status-blocked text-status-blocked'
                              )}
                            >
                              {depTask.title}
                              {depTask.status === 'done' && ' ✓'}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {task.dependencies.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Depends on {task.dependencies.length} task(s)</span>
                      <ArrowRight className="h-3 w-3" />
                      <div className="flex gap-1">
                        {task.dependencies.slice(0, 2).map((depId) => {
                          const depTask = getTaskById(depId);
                          return depTask ? (
                            <span key={depId} className="text-xs">{depTask.title}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Badge variant="secondary" className="capitalize shrink-0">
                  {task.status.replace('-', ' ')}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Independent tasks */}
      {independentTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">
            Independent Tasks ({independentTasks.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {independentTasks.map((task) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{task.title}</span>
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">
                    {task.status.replace('-', ' ')}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
