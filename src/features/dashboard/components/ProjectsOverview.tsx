import { Link } from 'react-router-dom';
import { ArrowRight, Users, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProjectsOverviewProps {
  projects: Project[];
}

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

export function ProjectsOverview({ projects }: ProjectsOverviewProps) {
  const isMobile = useIsMobile();

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Active Projects</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects" className="text-muted-foreground hover:text-foreground">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 flex-1 px-3 md:px-6 overflow-x-hidden">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <FolderOpen className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No active projects</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              You don't have any active projects at the moment.
            </p>
            <Button variant="outline" size="sm" className="mt-4 gap-2" asChild>
              <Link to="/projects">
                Create Project
              </Link>
            </Button>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block"
            >
              <div className="p-3 md:p-4 rounded-lg border border-border/70 hover:border-border/80 hover:shadow-subtle transition-all cursor-pointer group overflow-hidden max-w-full">
                <div className="flex items-start justify-between gap-2 md:gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-medium text-sm group-hover:text-primary transition-colors max-w-full break-all line-clamp-2 md:line-clamp-1"
                      title={project.name}
                    >
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full whitespace-nowrap overflow-hidden text-ellipsis">
                      {project.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn('shrink-0 text-[11px]', stageColors[project.stage])}>
                    {stageLabels[project.stage]}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex -space-x-1.5 ml-1">
                      {project.team.slice(0, 3).map((member) => (
                        <Avatar key={member.id} className="h-5 w-5 border-2 border-background">
                          <AvatarFallback className="text-[8px] bg-muted">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {project.team.length > 3 && (
                        <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-[8px] text-muted-foreground">
                            +{project.team.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Due {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {isMobile && project.team.length === 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground">No team assigned</div>
                )}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
