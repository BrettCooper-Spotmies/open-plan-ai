import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, AlertTriangle, PlayCircle, Lock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MyDayStats } from '@/components/myday/MyDayStats';
import { MyDaySection } from '@/components/myday/MyDaySection';
import { TaskDetailModal } from '@/components/project/TaskDetailModal';
import { projects, currentUser } from '@/data/mockData';
import { getUserTasks, categorizeMyDayTasks, MyDayTask } from '@/lib/myDayUtils';
import { Task, TaskStatus } from '@/types';

export default function MyDay() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get all tasks from all projects
  const allTasks = useMemo(() => {
    return projects.flatMap(p => p.tasks);
  }, []);

  // Get all tasks for the current user
  const userTasks = useMemo(() => {
    return getUserTasks(projects, currentUser.id);
  }, []);

  // Categorize tasks into sections
  const { needsAttention, readyToWork, waitingBlocked } = useMemo(() => {
    return categorizeMyDayTasks(userTasks);
  }, [userTasks]);

  // Calculate stats
  const completedTodayCount = 0; // Would need to track this with actual state

  const handleTaskClick = (task: MyDayTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = (taskId: string, status: TaskStatus) => {
    // In a real app, this would update the task in the database
    console.log('Status update:', taskId, status);
  };

  const handleChecklistToggle = (taskId: string, itemId: string) => {
    // In a real app, this would update the checklist item
    console.log('Checklist toggle:', taskId, itemId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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

        {/* Stats Overview */}
        <MyDayStats
          attentionCount={needsAttention.length}
          readyCount={readyToWork.length}
          blockedCount={waitingBlocked.length}
          completedTodayCount={completedTodayCount}
        />

        {/* Empty State */}
        {userTasks.length === 0 && (
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
        )}

        {/* Task Sections */}
        <MyDaySection
          title="Needs Attention Today"
          description="Overdue, due today, high priority, or blocking others"
          icon={AlertTriangle}
          variant="attention"
          tasks={needsAttention}
          onTaskClick={handleTaskClick}
          onStatusUpdate={handleStatusUpdate}
          onChecklistToggle={handleChecklistToggle}
        />

        <MyDaySection
          title="Ready to Work"
          description="Tasks with no blockers — start or continue progress"
          icon={PlayCircle}
          variant="ready"
          tasks={readyToWork}
          onTaskClick={handleTaskClick}
          onStatusUpdate={handleStatusUpdate}
          onChecklistToggle={handleChecklistToggle}
        />

        <MyDaySection
          title="Waiting / Blocked"
          description="Tasks waiting on dependencies, approvals, or external factors"
          icon={Lock}
          variant="blocked"
          tasks={waitingBlocked}
          onTaskClick={handleTaskClick}
          onStatusUpdate={handleStatusUpdate}
          onChecklistToggle={handleChecklistToggle}
        />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          allTasks={allTasks}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={(updatedTask) => {
            // In a real app, this would update the task in the database
            console.log('Task updated:', updatedTask);
          }}
        />
      )}
    </AppLayout>
  );
}
