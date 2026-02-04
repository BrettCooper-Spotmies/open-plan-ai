import { Progress } from '@/components/ui/progress';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Boxes, Flag, ListTodo, AlertTriangle } from 'lucide-react';
import { ProgressBreakdown } from '../utils/projectUtils';

interface ProjectProgressPopoverProps {
  breakdown: ProgressBreakdown;
}

export function ProjectProgressPopover({ breakdown }: ProjectProgressPopoverProps) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-help">
          <Progress value={breakdown.overallProgress} className="w-24 h-2" />
          <span className="text-sm font-medium">{breakdown.overallProgress}%</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Progress Breakdown</h4>
          
          {/* Modules */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Boxes className="h-3 w-3" />
                Modules
              </span>
              <span className="font-medium">{breakdown.moduleProgress}%</span>
            </div>
            <Progress value={breakdown.moduleProgress} className="h-1.5" />
          </div>

          {/* Milestones */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Flag className="h-3 w-3" />
                Milestones
              </span>
              <span className="font-medium">{breakdown.milestoneProgress}%</span>
            </div>
            <Progress value={breakdown.milestoneProgress} className="h-1.5" />
          </div>

          {/* Tasks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ListTodo className="h-3 w-3" />
                Tasks
              </span>
              <span className="font-medium">{breakdown.taskProgress}%</span>
            </div>
            <Progress value={breakdown.taskProgress} className="h-1.5" />
          </div>

          {/* Issues */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Issues Resolved
              </span>
              <span className="font-medium">{breakdown.issueProgress}%</span>
            </div>
            <Progress value={breakdown.issueProgress} className="h-1.5" />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
