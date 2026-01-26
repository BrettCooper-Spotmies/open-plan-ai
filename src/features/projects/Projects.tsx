import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Grid3X3, List, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { projects } from '@/data/mockData';
import { cn } from '@/lib/utils';

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
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
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

        <div className={cn(
          view === 'grid' 
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-3'
        )}>
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="p-5 card-hover cursor-pointer">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn('shrink-0', stageColors[project.stage])}>
                    {stageLabels[project.stage]}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex -space-x-2">
                      {project.team.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px] bg-muted">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {project.tasks.length} tasks
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
