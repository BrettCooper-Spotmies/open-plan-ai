import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

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
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Active Projects</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects" className="text-muted-foreground hover:text-foreground">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block"
          >
            <div className="p-4 rounded-lg border border-border hover:border-border/80 hover:shadow-subtle transition-all cursor-pointer group">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {project.description}
                  </p>
                </div>
                <Badge variant="secondary" className={cn('shrink-0', stageColors[project.stage])}>
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

              <div className="flex items-center justify-between mt-3">
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
                <span className="text-xs text-muted-foreground">
                  Due {new Date(project.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
