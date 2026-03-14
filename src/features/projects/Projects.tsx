import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectListProgress } from './components/ProjectListProgress';
import { Plus, Search, Grid3X3, List, Users, MoreVertical, Eye, Pencil, Calendar, Link as LinkIcon, Paperclip, FileText, Flag, Target, Trash2, FolderOpen, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { useProjectAttachments } from '@/hooks/useProjectAttachments';
import { useProjectLinks } from '@/hooks/useProjectLinks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatModuleType } from './utils/projectUtils';

const stageColors = {
  concept: 'bg-muted text-muted-foreground',
  design: 'bg-chart-1/10 text-chart-1',
  development: 'bg-chart-2/10 text-chart-2',
  testing: 'bg-chart-4/10 text-chart-4',
  production: 'bg-chart-3/10 text-chart-3',
};

const stageLabels = {
  concept: 'Concept',
  design: 'Design',
  development: 'Development',
  testing: 'Testing',
  production: 'Production',
};

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [selectedFilesProjectId, setSelectedFilesProjectId] = useState<string | null>(null);

  // Delete mutation
  const deleteProjectMutation = useDeleteProject();

  // Fetch full project details when a project is selected for viewing details
  const { data: selectedProjectDetails, isLoading: isLoadingDetails } = useProjectDetail(selectedProjectId || undefined);
  const { data: projectAttachments = [] } = useProjectAttachments(selectedProjectId || undefined);
  const { data: projectLinks = [] } = useProjectLinks(selectedProjectId || undefined);
  const { data: projectFiles = [], isLoading: isLoadingFiles } = useProjectAttachments(selectedFilesProjectId || undefined);

  const projectList = projects || [];

  const filteredProjects = projectList.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetails = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProjectId(projectId);
    setDetailsDialogOpen(true);
  };

  const handleViewFiles = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFilesProjectId(projectId);
    setFilesDialogOpen(true);
  };

  const handleEdit = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/projects/${projectId}/edit`);
  };

  const handleDeleteClick = (project: { id: string; name: string }, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      toast.success('Project deleted successfully');
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  if (isLoading) {
    return <AppLayoutSkeleton variant="projects" />;
  }

  if (error) {
    return (
      <>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">Failed to load projects</h3>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and track all your hardware projects.
            </p>
          </div>
          <Button className="gap-2 shrink-0" onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-muted-foreground">
              {projectList.length === 0
                ? 'Create your first project to get started'
                : 'Try adjusting your search query'}
            </p>
            {projectList.length === 0 && (
              <Button className="mt-4" onClick={() => navigate('/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className={cn(
            view === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              : 'space-y-3'
          )}>
            {filteredProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block h-full">
                <Card className="p-5 card-hover cursor-pointer h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-4 flex-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate flex items-center gap-2">
                        {project.icon && <span className="text-lg">{project.icon}</span>}
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className={cn(stageColors[project.stage as keyof typeof stageColors] || stageColors.concept)}>
                        {stageLabels[project.stage as keyof typeof stageLabels] || project.stage}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Project menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleViewDetails(project.id, e)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleViewFiles(project.id, e)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            View Files
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleEdit(project.id, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick({ id: project.id, name: project.name }, e)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <ProjectListProgress projectId={project.id} progress={project.progress || 0} />

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Project Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProjectDetails?.name || 'Project Details'}
              {selectedProjectDetails?.stage && (
                <Badge variant="secondary" className={cn(stageColors[selectedProjectDetails.stage as keyof typeof stageColors] || stageColors.concept)}>
                  {stageLabels[selectedProjectDetails.stage as keyof typeof stageLabels] || selectedProjectDetails.stage}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedProjectDetails ? (
            <div className="space-y-6">
              {/* Description */}
              {selectedProjectDetails.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedProjectDetails.description}</p>
                </div>
              )}

              {/* Progress */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Progress
                </h4>
                <div className="flex items-center gap-3">
                  <Progress value={selectedProjectDetails.progress || 0} className="flex-1" />
                  <span className="text-sm font-medium">{selectedProjectDetails.progress || 0}%</span>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectDetails.startDate ? new Date(selectedProjectDetails.startDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Target Date
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectDetails.targetDate ? new Date(selectedProjectDetails.targetDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Team Members */}
              {selectedProjectDetails.team && selectedProjectDetails.team.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members ({selectedProjectDetails.team.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedProjectDetails.team.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {member.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          {member.role && (
                            <p className="text-[11px] text-muted-foreground capitalize flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              {member.role.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {projectAttachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({projectAttachments.length})
                  </h4>
                  <div className="space-y-2">
                    {projectAttachments.map((attachment: any) => (
                      <a
                        key={attachment.id}
                        href={attachment.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors",
                          attachment.url ? "cursor-pointer" : "cursor-default"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!attachment.url) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{attachment.name || attachment.file_name}</span>
                        {attachment.url && (
                          <span className="text-xs text-primary">Open ↗</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {projectLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Links ({projectLinks.length})
                  </h4>
                  <div className="space-y-2">
                    {projectLinks.map((link: any) => (
                      <div key={link.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{link.name || link.title}</span>
                        {link.url && (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate max-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {link.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modules List */}
              {selectedProjectDetails.projectModules && selectedProjectDetails.projectModules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Modules ({selectedProjectDetails.projectModules.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectDetails.projectModules.map((module) => (
                      <Badge key={module.id} variant="outline" className="text-xs font-normal">
                        <span className="font-semibold mr-1">{module.name}</span>
                        <span className="text-muted-foreground">({formatModuleType(module.type)})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones count */}
              {selectedProjectDetails.milestones && selectedProjectDetails.milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Milestones ({selectedProjectDetails.milestones.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedProjectDetails.milestones.slice(0, 3).map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          milestone.completed ? "bg-green-500" : "bg-muted-foreground"
                        )} />
                        <span className={milestone.completed ? "line-through text-muted-foreground" : ""}>
                          {milestone.title}
                        </span>
                      </div>
                    ))}
                    {selectedProjectDetails.milestones.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{selectedProjectDetails.milestones.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    navigate(`/projects/${selectedProjectId}`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Project
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    navigate(`/projects/${selectedProjectId}/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No project details available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* View Files Dialog */}
      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Project Files
            </DialogTitle>
            <DialogDescription>
              All files attached to this project.
            </DialogDescription>
          </DialogHeader>

          {isLoadingFiles ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : projectFiles.length > 0 ? (
            <div className="space-y-2 py-4">
              {projectFiles.map((file: any) => (
                <a
                  key={file.id}
                  href={file.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors border",
                    file.url ? "cursor-pointer" : "cursor-default opacity-70"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!file.url) e.preventDefault();
                  }}
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">
                      {file.name || file.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to view • {new Date(file.uploaded_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  {file.url && (
                    <span className="text-xs text-primary font-medium shrink-0">Open ↗</span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Paperclip className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground">No files attached</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This project doesn't have any attached files yet. Files can be added when editing the project.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFilesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription className="break-all">
              Are you sure you want to delete <strong>"{projectToDelete?.name}"</strong>? This action cannot be undone and will permanently delete all associated data including tasks, milestones, and files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
