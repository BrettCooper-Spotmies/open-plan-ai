import { useState } from 'react';
import { Issue, IssueStatus, IssueSeverity, IssueCategory, Task } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Bug, 
  Truck, 
  FileWarning, 
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Filter,
  Link2,
} from 'lucide-react';
import { IssueDetailModal } from './IssueDetailModal';

interface IssuesViewProps {
  issues: Issue[];
  tasks?: Task[]; // Add tasks prop, optional to avoid breaking other usages if any
  onIssueUpdate?: (issue: Issue) => void;
  onIssueCreate?: (issue: Partial<Issue>) => void;
}

const severityConfig: Record<IssueSeverity, { color: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle, label: 'Critical' },
  major: { color: 'bg-orange-500 text-white', icon: AlertCircle, label: 'Major' },
  minor: { color: 'bg-yellow-500 text-black', icon: Info, label: 'Minor' },
  trivial: { color: 'bg-muted text-muted-foreground', icon: Info, label: 'Trivial' },
};

const statusConfig: Record<IssueStatus, { color: string; label: string }> = {
  open: { color: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Open' },
  investigating: { color: 'bg-orange-500/20 text-orange-600 border-orange-500/30', label: 'Investigating' },
  resolved: { color: 'bg-status-done/20 text-status-done border-status-done/30', label: 'Resolved' },
  closed: { color: 'bg-muted text-muted-foreground border-muted', label: 'Closed' },
  'wont-fix': { color: 'bg-muted text-muted-foreground border-muted line-through', label: "Won't Fix" },
};

const categoryConfig: Record<IssueCategory, { icon: typeof Bug; label: string }> = {
  defect: { icon: Bug, label: 'Defect' },
  risk: { icon: AlertTriangle, label: 'Risk' },
  supplier: { icon: Truck, label: 'Supplier' },
  compliance: { icon: FileWarning, label: 'Compliance' },
  'test-failure': { icon: FlaskConical, label: 'Test Failure' },
  'design-change': { icon: Pencil, label: 'Design Change' },
  other: { icon: Info, label: 'Other' },
};

export function IssuesView({ issues, tasks = [], onIssueUpdate, onIssueCreate }: IssuesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Sort by severity (critical first), then by date
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const severityOrder = { critical: 0, major: 1, minor: 2, trivial: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
  };

  const handleIssueUpdateFromModal = (updatedIssue: Issue) => {
    setSelectedIssue(updatedIssue);
    onIssueUpdate?.(updatedIssue);
  };

  // Count stats
  const openCount = issues.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const criticalCount = issues.filter(i => i.severity === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {openCount} Open
            </Badge>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => onIssueCreate?.({})}>
          <Plus className="h-4 w-4" />
          Report Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as IssueSeverity | 'all')}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="major">Major</SelectItem>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="trivial">Trivial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssueStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="wont-fix">Won't Fix</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Severity</TableHead>
              <TableHead className="w-[300px]">Issue</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Blocking</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Reported</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No issues found
                </TableCell>
              </TableRow>
            ) : (
              sortedIssues.map((issue) => {
                const SeverityIcon = severityConfig[issue.severity].icon;
                const CategoryIcon = categoryConfig[issue.category].icon;
                const blockingCount = (issue.blocksTaskIds?.length || 0) + (issue.blocksMilestoneIds?.length || 0);

                return (
                  <TableRow 
                    key={issue.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleIssueClick(issue)}
                  >
                    <TableCell>
                      <Badge className={cn('gap-1', severityConfig[issue.severity].color)}>
                        <SeverityIcon className="h-3 w-3" />
                        {severityConfig[issue.severity].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {issue.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CategoryIcon className="h-4 w-4" />
                        {categoryConfig[issue.category].label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusConfig[issue.status].color)}>
                        {statusConfig[issue.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {blockingCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-destructive">
                          <Link2 className="h-3 w-3" />
                          {blockingCount} item{blockingCount > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {issue.assignees && issue.assignees.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {issue.assignees.map((assignee) => (
                            <Avatar key={assignee.id} className="inline-block h-6 w-6 ring-2 ring-background">
                              <AvatarFallback className="text-[10px]">
                                {assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(issue.reportedAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issue={selectedIssue}
        tasks={tasks}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleIssueUpdateFromModal}
      />
    </div>
  );
}
