import { useState } from 'react';
import { Milestone, Task, Issue, Module } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Flag,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  Box,
} from 'lucide-react';
import {
  getMilestoneProgress,
  getMilestoneTasks,
  getMilestoneIssues,
  getMilestoneStatus,
  sortMilestonesByDate,
  getModuleProgress,
} from '../utils/projectUtils';
import { MilestoneDetailModal } from './MilestoneDetailModal';
import { AddMilestoneDialog } from './AddMilestoneDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MilestonesViewProps {
  milestones: Milestone[];
  tasks: Task[];
  issues?: Issue[];
  modules?: Module[];
  searchQuery?: string;
  isAddDialogOpen?: boolean;
  onAddDialogClose?: () => void;
  onMilestoneUpdate?: (milestone: Milestone) => void;
  onMilestoneCreate?: (milestone: Omit<Milestone, 'id'>) => void;
  onMilestoneDelete?: (milestoneId: string) => void;
  onIssueUpdate?: (issue: Issue) => void;
}

const statusConfig = {
  completed: { color: 'bg-status-done', textColor: 'text-status-done', label: 'Completed', icon: CheckCircle2 },
  blocked: { color: 'bg-destructive', textColor: 'text-destructive', label: 'Blocked', icon: AlertTriangle },
  'at-risk': { color: 'bg-orange-500', textColor: 'text-orange-500', label: 'At Risk', icon: Clock },
  'on-track': { color: 'bg-chart-2', textColor: 'text-chart-2', label: 'On Track', icon: Flag },
};

export function MilestonesView({
  milestones,
  tasks,
  issues = [],
  modules = [],
  searchQuery = '',
  isAddDialogOpen: externalIsAddDialogOpen,
  onAddDialogClose,
  onMilestoneUpdate,
  onMilestoneCreate,
  onMilestoneDelete,
  onIssueUpdate,
}: MilestonesViewProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [internalIsAddDialogOpen, setInternalIsAddDialogOpen] = useState(false);

  const isAddDialogOpen = externalIsAddDialogOpen ?? internalIsAddDialogOpen;

  // Filter milestones by search query
  const filteredMilestones = searchQuery.trim()
    ? milestones.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : milestones;

  const sortedMilestones = sortMilestonesByDate(filteredMilestones);

  const toggleExpanded = (milestoneId: string) => {
    setExpandedMilestones(prev =>
      prev.includes(milestoneId)
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsModalOpen(true);
  };

  const handleMilestoneUpdateFromModal = (updatedMilestone: Milestone) => {
    setSelectedMilestone(updatedMilestone);
    onMilestoneUpdate?.(updatedMilestone);
  };

  const handleAddMilestone = (milestone: Omit<Milestone, 'id'>) => {
    onMilestoneCreate?.(milestone);
    setInternalIsAddDialogOpen(false);
    onAddDialogClose?.();
  };

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {milestones.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Flag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No milestones yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create milestones to track important project deadlines and deliverables.
          </p>
        </Card>

      ) : sortedMilestones.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Flag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No matching milestones</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            No milestones match your search query.
          </p>
        </Card>
      ) : (
        /* Timeline View */
        <Card className="p-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {sortedMilestones.map((milestone, index) => {
                const progress = getMilestoneProgress(milestone, tasks);
                const milestoneTasks = getMilestoneTasks(milestone, tasks);
                const milestoneIssues = getMilestoneIssues(milestone.id, issues);
                const linkedModules = modules.filter(m => milestone.linkedModuleIds?.includes(m.id));
                const status = getMilestoneStatus(milestone, tasks, issues);
                const StatusIcon = statusConfig[status].icon;
                const isExpanded = expandedMilestones.includes(milestone.id);
                const daysUntil = Math.ceil((new Date(milestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <Collapsible key={milestone.id} open={isExpanded} onOpenChange={() => toggleExpanded(milestone.id)}>
                    <div className="relative pl-10">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center',
                        statusConfig[status].color
                      )}>
                        {milestone.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>

                      {/* Milestone card */}
                      <Card className={cn(
                        'p-4 transition-shadow hover:shadow-md cursor-pointer',
                        milestone.completed && 'opacity-75'
                      )}
                        onClick={() => handleMilestoneClick(milestone)}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className={cn(
                                    'font-medium',
                                    milestone.completed && 'line-through text-muted-foreground'
                                  )}>
                                    {milestone.title}
                                  </h3>
                                  <Badge variant="outline" className={cn('text-xs', statusConfig[status].textColor)}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig[status].label}
                                  </Badge>
                                </div>
                                {milestone.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(milestone.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              {!milestone.completed && (
                                <div className={cn(
                                  'text-xs mt-1',
                                  daysUntil < 0 ? 'text-destructive' : daysUntil < 7 ? 'text-orange-500' : 'text-muted-foreground'
                                )}>
                                  {daysUntil < 0
                                    ? `${Math.abs(daysUntil)} days overdue`
                                    : daysUntil === 0
                                      ? 'Due today'
                                      : `${daysUntil} days left`
                                  }
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progress and stats */}
                          <div className="flex items-center gap-4 pl-9">
                            <div className="flex-1 flex items-center gap-3">
                              <Progress value={progress} className="h-2 flex-1 max-w-[200px]" />
                              <span className="text-sm font-medium">{progress}%</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{milestoneTasks.filter(t => t.status === 'done').length}/{milestoneTasks.length} tasks</span>
                              {milestoneIssues.length > 0 && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {milestoneIssues.length} issue{milestoneIssues.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Expanded content */}
                          <CollapsibleContent>
                            <div className="pl-9 pt-3 space-y-3">
                              <div className="text-sm font-medium text-muted-foreground">Linked Tasks</div>
                              <div className="space-y-2">
                                {milestoneTasks.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No tasks linked to this milestone</p>
                                ) : (
                                  milestoneTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          'w-2 h-2 rounded-full',
                                          task.status === 'done' ? 'bg-status-done' :
                                            task.status === 'in-progress' ? 'bg-status-in-progress' :
                                              task.status === 'blocked' ? 'bg-status-blocked' :
                                                'bg-status-todo'
                                        )} />
                                        <span className={cn(
                                          'text-sm',
                                          task.status === 'done' && 'line-through text-muted-foreground'
                                        )}>
                                          {task.title}
                                        </span>
                                      </div>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {task.status.replace('-', ' ')}
                                      </Badge>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Linked Modules */}
                              {linkedModules.length > 0 && (
                                <>
                                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-4">
                                    <Box className="h-4 w-4" />
                                    Linked Modules
                                  </div>
                                  <div className="space-y-2">
                                    {linkedModules.map(module => {
                                      const moduleProgress = getModuleProgress(module.id, tasks);
                                      return (
                                        <div key={module.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-2.5 h-2.5 rounded-full"
                                              style={{ backgroundColor: module.color || '#6B7280' }}
                                            />
                                            <span className="text-sm">{module.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Progress value={moduleProgress} className="h-1.5 w-16" />
                                            <span className="text-xs text-muted-foreground">{moduleProgress}%</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              )}

                              {milestoneIssues.length > 0 && (
                                <>
                                  <div className="text-sm font-medium text-destructive flex items-center gap-1.5 mt-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    Blocking Issues
                                  </div>
                                  <div className="space-y-2">
                                    {milestoneIssues.map(issue => (
                                      <div key={issue.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded-md border border-destructive/20">
                                        <span className="text-sm">{issue.title}</span>
                                        <Badge variant="outline" className="text-xs capitalize border-destructive/30 text-destructive">
                                          {issue.severity}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Card>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </Card>
      )
      }

      {/* Milestone Detail Modal */}
      {
        isModalOpen && selectedMilestone && (
          <MilestoneDetailModal
            milestone={selectedMilestone}
            tasks={tasks}
            issues={issues}
            modules={modules}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onUpdate={handleMilestoneUpdateFromModal}
            onDelete={onMilestoneDelete}
            onIssueUpdate={onIssueUpdate}
          />
        )
      }

      {/* Add Milestone Dialog */}
      {
        isAddDialogOpen && (
          <AddMilestoneDialog
            isOpen={isAddDialogOpen}
            onClose={() => {
              setInternalIsAddDialogOpen(false);
              onAddDialogClose?.();
            }}
            onAdd={handleAddMilestone}
            tasks={tasks}
            modules={modules}
            issues={issues}
          />
        )
      }
    </div >
  );
}
