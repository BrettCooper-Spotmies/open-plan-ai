import { Task, Milestone } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  milestones: Milestone[];
}

const moduleColors = {
  hardware: 'bg-module-hardware',
  software: 'bg-module-software',
  firmware: 'bg-module-firmware',
  testing: 'bg-module-testing',
};

export function TimelineView({ tasks, milestones }: TimelineViewProps) {
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.startDate || a.createdAt).getTime() - new Date(b.startDate || b.createdAt).getTime()
  );

  const allDates = [
    ...tasks.map(t => t.startDate || t.createdAt),
    ...tasks.map(t => t.dueDate).filter(Boolean),
    ...milestones.map(m => m.date),
  ].filter(Boolean) as string[];

  const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const getPosition = (date: string) => {
    const d = new Date(date);
    const days = Math.ceil((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const getWidth = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max((days / totalDays) * 100, 2);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Month headers */}
        <div className="flex border-b pb-2">
          <div className="w-48 shrink-0" />
          <div className="flex-1 relative h-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i}
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${i * 25}%` }}
              >
                {new Date(minDate.getTime() + (totalDays * i / 4) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' })}
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="flex items-center">
          <div className="w-48 shrink-0 text-sm font-medium text-muted-foreground">
            Milestones
          </div>
          <div className="flex-1 relative h-8">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${getPosition(milestone.date)}%` }}
              >
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                  milestone.completed ? 'bg-status-done/20 text-status-done' : 'bg-chart-4/20 text-chart-4'
                )}>
                  <Flag className="h-3 w-3" />
                  {milestone.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        {sortedTasks.map((task) => (
          <div key={task.id} className="flex items-center">
            <div className="w-48 shrink-0 pr-4">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <Badge variant="outline" className="text-[10px] mt-1">
                {task.module}
              </Badge>
            </div>
            <div className="flex-1 relative h-8 bg-muted/30 rounded">
              {task.startDate && task.dueDate && (
                <div
                  className={cn(
                    'absolute top-1 bottom-1 rounded-sm',
                    moduleColors[task.module],
                    task.status === 'done' && 'opacity-50'
                  )}
                  style={{
                    left: `${getPosition(task.startDate)}%`,
                    width: `${getWidth(task.startDate, task.dueDate)}%`,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
