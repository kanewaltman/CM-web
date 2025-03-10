import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CustomTooltipContent } from "./ChartExtras";
import { Badge } from "@/components/ui/badge";

const chartData = [
  { month: "Jan 2025", actual: 1000, projected: 500 },
  { month: "Feb 2025", actual: 3500, projected: 2000 },
  { month: "Mar 2025", actual: 10000, projected: 3500 },
  { month: "Apr 2025", actual: 9000, projected: 5000 },
  { month: "May 2025", actual: 15000, projected: 7000 },
  { month: "Jun 2025", actual: 17000, projected: 8000 },
  { month: "Jul 2025", actual: 16000, projected: 10000 },
  { month: "Aug 2025", actual: 18000, projected: 11000 },
  { month: "Sep 2025", actual: 9000, projected: 12500 },
  { month: "Oct 2025", actual: 16000, projected: 8000 },
  { month: "Nov 2025", actual: 22000, projected: 9000 },
  { month: "Dec 2025", actual: 15000, projected: 14000 },
];

const chartConfig = {
  actual: {
    label: "Actual",
    color: "hsl(var(--color-destructive-default))",
  },
  projected: {
    label: "Projected",
    color: "hsl(var(--color-muted-foreground))",
  },
} satisfies ChartConfig;

interface CustomCursorProps {
  fill?: string;
  pointerEvents?: string;
  height?: number;
  points?: Array<{ x: number; y: number }>;
  className?: string;
}

function CustomCursor(props: CustomCursorProps) {
  const { fill, pointerEvents, height, points, className } = props;

  if (!points || points.length === 0) {
    return null;
  }

  const { x, y } = points[0]!;
  return (
    <>
      <Rectangle
        x={x - 12}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={24}
        height={height}
        className={className}
        type="linear"
      />
      <Rectangle
        x={x - 1}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={1}
        height={height}
        className="recharts-tooltip-inner-cursor"
        type="linear"
      />
    </>
  );
}

export function RefundsChart() {
  const id = useId();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>Refunds</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">$15,000</div>
              <Badge className="mt-1.5 bg-destructive/24 text-destructive border-none">
                +12.5%
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-destructive/10 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <defs>
              <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--color-destructive-default))" />
                <stop offset="100%" stopColor="hsl(var(--color-destructive-default) / 0.8)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 2"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => value.slice(0, 3)}
              stroke="hsl(var(--border))"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value === 0) return "$0";
                return `$${value / 1000}k`;
              }}
              interval="preserveStartEnd"
            />
            <Line
              type="linear"
              dataKey="projected"
              stroke="hsl(var(--color-muted-foreground))"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <ChartTooltip
              content={
                <CustomTooltipContent
                  colorMap={{
                    actual: "hsl(var(--color-destructive-default))",
                    projected: "hsl(var(--color-muted-foreground))",
                  }}
                  labelMap={{
                    actual: "Actual",
                    projected: "Projected",
                  }}
                  dataKeys={["actual", "projected"]}
                  valueFormatter={(value) => `$${value.toLocaleString()}`}
                />
              }
              cursor={<CustomCursor fill="hsl(var(--color-destructive-default))" />}
            />
            <Line
              type="linear"
              dataKey="actual"
              stroke={`url(#${id}-gradient)`}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "hsl(var(--color-destructive-default))",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 