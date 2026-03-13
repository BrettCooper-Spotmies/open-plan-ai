import { calculateProjectProgress } from '../src/features/projects/utils/projectUtils';
import { Task, Module, Milestone, Issue } from '../src/types';

const mockTasks: any[] = [
    { id: 't1', title: 'Task 1', status: 'done', moduleId: 'm1', moduleIds: ['m1'], tags: [], blockedBy: [] },
    { id: 't2', title: 'Task 2', status: 'todo', moduleId: 'm1', moduleIds: ['m1'], tags: [], blockedBy: [] },
    { id: 't3', title: 'Task 3', status: 'done', moduleId: 'm2', moduleIds: ['m2'], tags: [], blockedBy: [] },
];

const mockModules = [
    { id: 'm1', name: 'Module 1', type: 'software' as any },
    { id: 'm2', name: 'Module 2', type: 'hardware' as any },
];

const result = calculateProjectProgress(
    mockTasks as any,
    [],
    mockModules as any,
    []
);

console.log('Module Progress:', result.moduleProgress);
console.log('Average should be (50 + 100) / 2 = 75');
if (result.moduleProgress === 75) {
    console.log('VERIFICATION PASSED');
} else {
    console.log('VERIFICATION FAILED:', result.moduleProgress);
}
