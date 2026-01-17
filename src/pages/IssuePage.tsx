import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { IssueDetailContent } from '@/components/project/IssueDetailContent';
import { projects, projectModules } from '@/data/mockData'; // Assuming tasks are here/linked or we find them
import { Issue } from '@/types';

export default function IssuePage() {
  const { projectId, issueId } = useParams();
  const navigate = useNavigate();

  // Mock Data Retrieval
  const project = projects.find(p => p.id === projectId);
  const issue = project?.issues?.find(i => i.id === issueId);

  // In real app, we would fetch issue and related tasks here
  
  if (!project || !issue) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
            <h2 className="text-xl font-medium">Issue not found</h2>
            <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
                Go Back
            </Button>
        </div>
      </AppLayout>
    );
  }

  const handleUpdate = (updatedIssue: Issue) => {
     // In a real app ensuring data consistency is key.
     // Here we just update the local mock object in memory for the session if possible, 
     // or mostly just reflect it in UI state within IssueDetailContent.
     // Since mock data is imported, mutating it *might* work for local session persistence across components if same ref.
     const index = project.issues?.findIndex(i => i.id === updatedIssue.id);
     if (index !== undefined && index !== -1 && project.issues) {
         project.issues[index] = updatedIssue;
     }
  };

  return (
    <AppLayout>
        <div className="container max-w-5xl mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}?tab=issues`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                </Button>
                <div className="text-sm text-muted-foreground">
                    {project.name} / Issues / {issue.id}
                </div>
            </div>

            <div className="bg-background rounded-lg border shadow-sm p-6 min-h-[80vh]">
                <IssueDetailContent 
                   issue={issue} 
                   tasks={project.tasks} 
                   onUpdate={handleUpdate}
                   isExpanded={true}
                />
            </div>
        </div>
    </AppLayout>
  );
}
