import { BarChart3, Download, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportTimeRange } from '../utils/reportsUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportsHeaderProps {
  projectName?: string;
  timeRangeLabel?: string;
  timeRange?: ReportTimeRange;
  onTimeRangeChange?: (value: ReportTimeRange) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
}

export function ReportsHeader({
  projectName,
  timeRangeLabel,
  onExport,
}: ReportsHeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isMobile && (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border/60 shrink-0">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            {!isMobile && <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>}
            {!isMobile && (projectName || timeRangeLabel) && (
              <p className="text-sm text-muted-foreground truncate">
                {projectName || 'All Projects'}
                {timeRangeLabel && ` · ${timeRangeLabel}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Export</span>
                <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-popover border border-border shadow-md z-50">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onExport?.('csv')}
              >
                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onExport?.('pdf')}
              >
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </div>
  );
}

