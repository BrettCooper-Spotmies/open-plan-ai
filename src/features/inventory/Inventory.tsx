import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { InventoryView } from '../projects/components/InventoryView';

// Temporary top-level entry point for the Inventory feature while it's being evaluated
// standalone. Inventory is conceptually project-scoped (stock is compared against a
// project's BOM demand) — this page just lets you pick which project to preview before
// the feature settles into its final location (likely back under Project Detail).
export default function Inventory() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  useEffect(() => {
    document.title = 'Inventory | Open Plan AI';
    return () => { document.title = 'Open Plan AI'; };
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const isLoading = orgLoading || projectsLoading;
  if (isLoading) return <AppLayoutSkeleton variant="default" />;

  if (!currentOrganization || projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-semibold">Inventory</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Create a project with a BOM to preview stock data here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedProjectId && (
        <div className="-mx-4 md:-mx-6 -mb-6">
          <InventoryView
            projectId={selectedProjectId}
            orgId={currentOrganization.id}
            projectSelector={projects.length > 1 ? (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full min-w-[220px] sm:w-[280px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-full min-w-[220px] sm:w-[280px]">
                <div className="flex h-11 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground">
                  {projects[0]?.name}
                </div>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
