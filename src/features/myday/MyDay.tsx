import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, LayoutGrid, List } from 'lucide-react';
import { MyDayStats } from './components/MyDayStats';
import { MyDayKanbanView } from './components/MyDayKanbanView';
import { MyDayListView } from './components/MyDayListView';
import { MyDayGroupBySelector } from './components/MyDayGroupBySelector';
import { TaskDetailModal } from '@/features/projects/components/TaskDetailModal';
import { IssueDetailModal } from '@/features/projects/components/IssueDetailModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { categorizeMyDayItems, MyDayItem } from './utils/myDayUtils';
import { Task, Issue, TaskStatus, IssueStatus, MyDayView, MyDayGroupBy } from '@/types';
import { useMyDayTasks, useCompletedTodayCount } from '@/hooks/useMyDayTasks';
import { useUpdateTask, useBatchUpdateTasks } from '@/hooks/useTasks';
import { useUpdateIssue } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';

export default function MyDay() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [view, setView] = useState<MyDayView>('kanban');
  const [groupBy, setGroupBy] = useState<MyDayGroupBy>('progress');

  // Fetch dynamic data
  const { data: userTasks = [], isLoading: tasksLoading } = useMyDayTasks();
  const { data: completedTodayCount = 0 } = useCompletedTodayCount();
  const { data: projects = [] } = useProjects();
  const updateTaskMutation = useUpdateTask();
  const batchUpdateTasksMutation = useBatchUpdateTasks();
  const updateIssueMutation = useUpdateIssue();

  const allTasks = useMemo(() => {
    return projects.flatMap(p => p.tasks);
  }, [projects]);

  const { needsAttention, readyToWork, waitingBlocked } = useMemo(() => {
    return categorizeMyDayItems(userTasks);
  }, [userTasks]);

  const handleTaskClick = (item: MyDayItem) => {
    // Only open modal for tasks (issues have their own modal)
    if (item.itemType === 'task' && item.originalTask) {
      setSelectedTask(item.originalTask);
      setIsModalOpen(true);
    } else if (item.itemType === 'issue' && item.originalIssue) {
      setSelectedIssue(item.originalIssue);
      setIsIssueModalOpen(true);
    }
  };

  const handleStatusUpdate = async (taskId: string, status: TaskStatus) => {
    const item = userTasks.find(t => t.id === taskId);
    if (!item) return;

    try {
      if (item.itemType === 'task') {
        await updateTaskMutation.mutateAsync({
          projectId: item.projectId,
          taskId,
          updates: { status },
        });
      } else {
        const issueStatusMap: Record<TaskStatus, IssueStatus> = {
          'todo': 'open',
          'in-progress': 'investigating',
          'review': 'investigating',
          'done': 'resolved',
          'blocked': 'investigating'
        };
        await updateIssueMutation.mutateAsync({
          projectId: item.projectId,
          issueId: taskId,
          updates: { status: issueStatusMap[status] },
        });
      }
      toast.success(`${item.itemType === 'task' ? 'Task' : 'Issue'} status updated`);
    } catch (error) {
      console.error(`Failed to update ${item.itemType} status:`, error);
      toast.error(`Failed to update ${item.itemType} status`);
    }
  };

  const handleChecklistToggle = async (taskId: string, itemId: string) => {
    const item = userTasks.find(t => t.id === taskId);
    if (!item) return;

    try {
      const checklist = item.itemType === 'task' ? item.originalTask?.checklist : item.originalIssue?.checklist;
      if (!checklist) return;

      const updatedChecklist = checklist.map(checklistItem =>
        checklistItem.id === itemId ? { ...checklistItem, completed: !checklistItem.completed } : checklistItem
      );

      if (item.itemType === 'task') {
        await updateTaskMutation.mutateAsync({
          projectId: item.projectId,
          taskId,
          updates: { checklist: updatedChecklist },
        });
      } else {
        await updateIssueMutation.mutateAsync({
          projectId: item.projectId,
          issueId: taskId,
          updates: { checklist: updatedChecklist },
        });
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error);
      toast.error('Failed to update checklist');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleCloseIssueModal = () => {
    setIsIssueModalOpen(false);
    setSelectedIssue(null);
  };

  const handleIssueUpdate = async (updatedIssue: Issue) => {
    try {
      await updateIssueMutation.mutateAsync({
        projectId: updatedIssue.projectId,
        issueId: updatedIssue.id,
        updates: updatedIssue,
      });
      toast.success('Issue updated');
      // No need to close modal here as IssueDetailModal handles its own state or we might want to keep it open? 
      // Usually IssueDetailModal calls onUpdate. 
      // If we want to behave like TaskDetailModal, we just update.
    } catch (error) {
      console.error('Failed to update issue:', error);
      toast.error('Failed to update issue');
    }
  };

  // derived data for issue modal
  const selectedIssueProject = selectedIssue ? projects.find(p => p.id === selectedIssue.projectId) : null;
  const issueTeamMembers = selectedIssueProject?.team || [];
  const issueTasks = selectedIssueProject?.tasks || [];

  const today = format(new Date(), 'EEEE, MMMM d');

  // Early return: show identical skeleton to Suspense fallback while data loads
  if (tasksLoading) {
    return <AppLayoutSkeleton variant="list" />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 w-full min-w-0">
        {/* Header - always visible, never shimmers */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sun className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Day</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Your personal execution dashboard — focus on what matters today.
          </p>
        </div>

        {/* Stats - always visible once data is ready */}
        <MyDayStats
          attentionCount={needsAttention.length}
          readyCount={readyToWork.length}
          blockedCount={waitingBlocked.length}
          completedTodayCount={completedTodayCount}
        />

        {/* View controls - always visible once data is ready */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <Tabs value={view} onValueChange={(v) => setView(v as MyDayView)}>
              <TabsList>
                <TabsTrigger value="kanban" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
        </div>

        {/* Kanban/List content */}
        {userTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 rounded-full bg-muted/50 inline-block mb-4">
              <Sun className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              All caught up!
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You have no active tasks assigned to you. Check the Projects page to see available work.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 w-full min-w-0">
            <div className="min-h-[400px] w-full min-w-0">
              {view === 'kanban' ? (
                <MyDayKanbanView
                  tasks={userTasks}
                  groupBy={groupBy}
                  onTaskClick={handleTaskClick}
                  onStatusUpdate={handleStatusUpdate}
                  onChecklistToggle={handleChecklistToggle}
                />
              ) : (
                <MyDayListView
                  tasks={userTasks}
                  groupBy={groupBy}
                  onTaskClick={handleTaskClick}
                  onStatusUpdate={handleStatusUpdate}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          allTasks={allTasks}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={async (updatedTask) => {
            try {
              const item = userTasks.find(t => t.id === updatedTask.id);
              if (item) {
                await updateTaskMutation.mutateAsync({
                  projectId: item.projectId,
                  taskId: updatedTask.id,
                  updates: updatedTask,
                });
                toast.success('Task updated');
              }
            } catch (error) {
              console.error('Failed to update task:', error);
              toast.error('Failed to update task');
            }
          }}
          onBatchUpdate={async (updates) => {
            try {
              // Note: useBatchUpdateTasks in useTasks.ts expects {projectId, updates}
              // We'll pick the projectId from the first update (assuming same project for now, 
              // or handle individually if needed, but MyDay has projectId per item)
              if (updates.length === 0) return;
              const firstItem = userTasks.find(t => t.id === updates[0].id);
              if (firstItem) {
                await batchUpdateTasksMutation.mutateAsync({
                  projectId: firstItem.projectId,
                  updates: updates
                });
                toast.success('Dependencies updated');
              }
            } catch (error) {
              console.error('Failed to batch update tasks:', error);
              toast.error('Failed to update dependent tasks');
            }
          }}
        />
      )}

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          tasks={issueTasks}
          teamMembers={issueTeamMembers}
          isOpen={isIssueModalOpen}
          onClose={handleCloseIssueModal}
          onUpdate={handleIssueUpdate}
        />
      )}
    </>
  );
}
