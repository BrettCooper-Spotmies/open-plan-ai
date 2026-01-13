import { Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MyDayGroupBy } from '@/types';

interface MyDayGroupBySelectorProps {
  value: MyDayGroupBy;
  onChange: (value: MyDayGroupBy) => void;
}

const groupByOptions = [
  { value: 'progress', label: 'Progress' },
  { value: 'project', label: 'Project' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
] as const;

export function MyDayGroupBySelector({ value, onChange }: MyDayGroupBySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Layers className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Group by" />
        </SelectTrigger>
        <SelectContent>
          {groupByOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
