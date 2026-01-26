import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Area,
  CartesianGrid 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TrendDataPoint } from '../utils/reportsUtils';

interface ReportTrendChartProps {
  data: TrendDataPoint[];
}

type ChartMode = 'burnup' | 'burndown';

export function ReportTrendChart({ data }: ReportTrendChartProps) {
  const [mode, setMode] = useState<ChartMode>('burnup');
  
  const chartData = data.map(point => ({
    ...point,
    value: mode === 'burnup' ? point.cumulative : point.remaining,
  }));
  
  const totalTasks = data.length > 0 ? data[0].remaining + data[data.length - 1].cumulative : 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {mode === 'burnup' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            Task Completion Trend
          </CardTitle>
          
          <div className="flex items-center rounded-md border bg-background">
            <Button
              variant={mode === 'burnup' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setMode('burnup')}
            >
              Burnup
            </Button>
            <Button
              variant={mode === 'burndown' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setMode('burndown')}
            >
              Burndown
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  domain={[0, totalTasks]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      return (
                        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                          <p className="font-medium text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {mode === 'burnup' 
                              ? `${value} tasks completed`
                              : `${value} tasks remaining`
                            }
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={mode === 'burnup' 
                        ? 'hsl(var(--status-done))' 
                        : 'hsl(var(--chart-1))'
                      } 
                      stopOpacity={0.3}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={mode === 'burnup' 
                        ? 'hsl(var(--status-done))' 
                        : 'hsl(var(--chart-1))'
                      } 
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="transparent"
                  fill="url(#colorValue)"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={mode === 'burnup' 
                    ? 'hsl(var(--status-done))' 
                    : 'hsl(var(--chart-1))'
                  }
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                {/* Target line for burndown */}
                {mode === 'burndown' && totalTasks > 0 && (
                  <Line
                    type="monotone"
                    dataKey={() => 0}
                    stroke="hsl(var(--status-done))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
