import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Sun, LayoutGrid, List } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MyDayStats } from './components/MyDayStats';
import { MyDayKanbanView } from './components/MyDayKanbanView';
import { MyDayListView } from './components/MyDayListView';
import { MyDayGroupBySelector } from './components/MyDayGroupBySelector';
import { TaskDetailModal } from '@/features/projects/components/TaskDetailModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projects, currentUser } from '@/data/mockData';
import { getUserTasks, categorizeMyDayTasks, MyDayTask } from './utils/myDayUtils';
import { Task, TaskStatus, MyDayView, MyDayGroupBy } from '@/types';

export default function MyDay() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<MyDayView>('kanban');
  const [groupBy, setGroupBy] = useState<MyDayGroupBy>('progress');

  const allTasks = useMemo(() => {
    return projects.flatMap(p => p.tasks);
  }, []);

  const userTasks = useMemo(() => {
    return getUserTasks(projects, currentUser.id);
  }, []);

  const { needsAttention, readyToWork, waitingBlocked } = useMemo(() => {
    return categorizeMyDayTasks(userTasks);
  }, [userTasks]);

  const completedTodayCount = 0;

  const handleTaskClick = (task: MyDayTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = (_taskId: string, _status: TaskStatus) => {
    // TODO: Implement status update via store or event
  };

  const handleChecklistToggle = (_taskId: string, _itemId: string) => {
    // TODO: Implement checklist toggle via store or event
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <AppLayout>
      <div className="grid grid-cols-1 gap-6 w-full min-w-0">
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

        <MyDayStats
          attentionCount={needsAttention.length}
          readyCount={readyToWork.length}
          blockedCount={waitingBlocked.length}
          completedTodayCount={completedTodayCount}
        />

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
          <MyDayGroupBySelector value={groupBy} onChange={setGroupBy} />
        </div>

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

        {userTasks.length > 0 && (
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
          onUpdate={(updatedTask) => {
            console.log('Task updated:', updatedTask);
          }}
        />
      )}
    </AppLayout>
  );
}
