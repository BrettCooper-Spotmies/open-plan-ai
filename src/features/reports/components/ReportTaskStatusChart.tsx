import { memo, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBreakdown, getStatusLabel, getStatusColor } from '../utils/reportsUtils';

interface ReportTaskStatusChartProps {
  data: StatusBreakdown[];
  onStatusClick?: (status: string) => void;
}

export const ReportTaskStatusChart = memo(function ReportTaskStatusChart({ data, onStatusClick }: ReportTaskStatusChartProps) {
  const chartData = useMemo(() => data.map(item => ({
    name: getStatusLabel(item.status),
    value: item.count,
    count: item.count,
    status: item.status,
    percentage: item.percentage,
    color: getStatusColor(item.status),
  })), [data]);
  
  const totalTasks = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

  const handlePieClick = useCallback((pieData: { status: string }) => {
    onStatusClick?.(pieData.status);
  }, [onStatusClick]);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Task Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {totalTasks === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No tasks to display
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handlePieClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.value} tasks ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {payload?.map((entry, index) => (
                        <button
                          key={`legend-${index}`}
                          className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
                          onClick={() => onStatusClick?.(chartData[index].status)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">
                            {entry.value}: {chartData[index].count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
