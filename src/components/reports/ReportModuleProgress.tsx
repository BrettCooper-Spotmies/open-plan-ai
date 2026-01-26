import { Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ModuleProgressItem } from './reportsUtils';

interface ReportModuleProgressProps {
  data: ModuleProgressItem[];
  onModuleClick?: (moduleId: string) => void;
}

export function ReportModuleProgress({ data, onModuleClick }: ReportModuleProgressProps) {
  if (data.length === 0) {
    return null;
  }
  
  const sortedData = [...data].sort((a, b) => b.progress - a.progress);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Module Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((item) => (
            <div 
              key={item.module.id}
              className="cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors"
              onClick={() => onModuleClick?.(item.module.id)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.module.color || 'hsl(var(--primary))' }}
                  />
                  <span className="text-sm font-medium">{item.module.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.completedTasks}/{item.totalTasks} ({item.progress}%)
                </span>
              </div>
              <Progress 
                value={item.progress} 
                className="h-2"
                style={{ 
                  '--progress-color': item.module.color || 'hsl(var(--primary))'
                } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
