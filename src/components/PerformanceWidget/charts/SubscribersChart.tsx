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

// Subscriber data for the last 12 months
const chartData = [
  { month: "Jan 2025", actual: 5000, projected: 2000 },
  { month: "Feb 2025", actual: 10000, projected: 8000 },
  { month: "Mar 2025", actual: 15000, projected: 22000 },
  { month: "Apr 2025", actual: 22000, projected: 15000 },
  { month: "May 2025", actual: 20000, projected: 25000 },
  { month: "Jun 2025", actual: 35000, projected: 45000 },
  { month: "Jul 2025", actual: 30000, projected: 25000 },
  { month: "Aug 2025", actual: 60000, projected: 70000 },
  { month: "Sep 2025", actual: 65000, projected: 75000 },
  { month: "Oct 2025", actual: 60000, projected: 80000 },
  { month: "Nov 2025", actual: 70000, projected: 65000 },
  { month: "Dec 2025", actual: 78000, projected: 75000 },
];

const chartConfig = {
  actual: {
    label: "Actual",
    color: "rgb(16 185 129)", // emerald-500
  },
  projected: {
    label: "Projected",
    color: "rgb(16 185 129 / 0.5)", // emerald-500 at 50% opacity
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

export function SubscribersChart() {
  const id = useId();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>Subscribers</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">78,000</div>
              <Badge className="mt-1.5 bg-emerald-500/24 text-emerald-500 border-none">
                +4.2%
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[hsl(var(--color-widget-hover))] [&_.recharts-rectangle.recharts-tooltip-cursor]:opacity-25 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <defs>
              <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgb(16 185 129)" />
                <stop offset="100%" stopColor="rgb(16 185 129 / 0.8)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 2"
              stroke="hsl(var(--color-border-muted))"
              opacity={0.5}
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => value.slice(0, 3)}
              stroke="hsl(var(--color-border-muted))"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value === 0) return "0";
                return `${value / 1000}k`;
              }}
              interval="preserveStartEnd"
            />
            <Line
              type="linear"
              dataKey="projected"
              stroke="rgb(16 185 129 / 0.5)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <ChartTooltip
              content={
                <CustomTooltipContent
                  colorMap={{
                    actual: "rgb(16 185 129)",
                    projected: "rgb(16 185 129 / 0.5)",
                  }}
                  labelMap={{
                    actual: "Actual",
                    projected: "Projected",
                  }}
                  dataKeys={["actual", "projected"]}
                  valueFormatter={(value) => value.toLocaleString()}
                />
              }
              cursor={<CustomCursor fill="rgb(16 185 129)" />}
            />
            <Line
              type="linear"
              dataKey="actual"
              stroke={`url(#${id}-gradient)`}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: "rgb(16 185 129)",
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