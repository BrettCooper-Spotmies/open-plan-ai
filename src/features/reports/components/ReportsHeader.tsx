import { BarChart3, Download, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportsHeaderProps {
  projectName?: string;
  timeRangeLabel?: string;
  onExport?: (format: 'csv' | 'pdf') => void;
}

export function ReportsHeader({ projectName, timeRangeLabel, onExport }: ReportsHeaderProps) {
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
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
  );
}

