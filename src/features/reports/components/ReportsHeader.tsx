import { BarChart3, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReportsHeaderProps {
  projectName?: string;
  timeRangeLabel?: string;
}

export function ReportsHeader({ projectName, timeRangeLabel }: ReportsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          {(projectName || timeRangeLabel) && (
            <p className="text-sm text-muted-foreground">
              {projectName || 'All Projects'}
              {timeRangeLabel && ` · ${timeRangeLabel}`}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export coming soon</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled>
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save report templates coming soon</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
