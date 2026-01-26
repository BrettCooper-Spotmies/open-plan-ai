import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarViewMode } from '@/types';
import { formatDateRangeLabel } from './calendarUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToday,
}) => {
  const dateLabel = formatDateRangeLabel(currentDate, viewMode);

  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
      {/* Left: Title and date navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Calendar</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onNavigatePrevious} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToday} className="h-8">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={onNavigateNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium text-foreground min-w-[200px]">
          {dateLabel}
        </span>
      </div>

      {/* Right: View mode toggle */}
      <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as CalendarViewMode)}>
        <TabsList className="h-9">
          <TabsTrigger value="month" className="text-xs px-3">
            Month
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs px-3">
            Week
          </TabsTrigger>
          <TabsTrigger value="day" className="text-xs px-3">
            Day
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
