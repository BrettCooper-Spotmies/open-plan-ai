import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation } from "react-day-picker";
import { format, setMonth, setYear, getYear, getMonth } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// ── Custom caption with month + year dropdowns ─────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i); // 5 past → 15 future

function CustomCaption({ displayMonth }: { displayMonth: Date }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = setMonth(displayMonth, parseInt(e.target.value, 10));
    goToMonth(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = setYear(displayMonth, parseInt(e.target.value, 10));
    goToMonth(newDate);
  };

  return (
    <div className="flex items-center justify-between px-1 py-1">
      {/* Previous month */}
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        aria-label="Go to previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Month & Year selects */}
      <div className="flex items-center gap-1">
        <select
          value={getMonth(displayMonth)}
          onChange={handleMonthChange}
          className="text-sm font-medium bg-transparent cursor-pointer rounded-md px-1 py-0.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Select month"
        >
          {MONTHS.map((month, i) => (
            <option key={month} value={i} className="bg-popover text-popover-foreground">
              {month}
            </option>
          ))}
        </select>

        <select
          value={getYear(displayMonth)}
          onChange={handleYearChange}
          className="text-sm font-medium bg-transparent cursor-pointer rounded-md px-1 py-0.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Select year"
        >
          {YEARS.map((year) => (
            <option key={year} value={year} className="bg-popover text-popover-foreground">
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Next month */}
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        )}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        aria-label="Go to next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main Calendar ──────────────────────────────────────────────────────────

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden", // hidden – replaced by CustomCaption
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: ({ displayMonth }) => <CustomCaption displayMonth={displayMonth} />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
