import { useId, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const mrrData = [
  { month: "Jan 2025", actual: 300000, projected: 120000 },
  { month: "Feb 2025", actual: 420000, projected: 180000 },
  { month: "Mar 2025", actual: 500000, projected: 90000 },
  { month: "Apr 2025", actual: 630000, projected: 110000 },
  { month: "May 2025", actual: 710000, projected: 120000 },
  { month: "Jun 2025", actual: 800000, projected: 100000 },
  { month: "Jul 2025", actual: 900000, projected: 140000 },
  { month: "Aug 2025", actual: 1010000, projected: 120000 },
  { month: "Sep 2025", actual: 1090000, projected: 130000 },
  { month: "Oct 2025", actual: 1180000, projected: 110000 },
  { month: "Nov 2025", actual: 1280000, projected: 130000 },
  { month: "Dec 2025", actual: 1380000, projected: 100000 },
];

const arrData = [
  { month: "Jan 2025", actual: 3600000, projected: 1440000 },
  { month: "Feb 2025", actual: 4200000, projected: 1800000 },
  { month: "Mar 2025", actual: 5000000, projected: 900000 },
  { month: "Apr 2025", actual: 6300000, projected: 1100000 },
  { month: "May 2025", actual: 7100000, projected: 1200000 },
  { month: "Jun 2025", actual: 8000000, projected: 1000000 },
  { month: "Jul 2025", actual: 9000000, projected: 1400000 },
  { month: "Aug 2025", actual: 10100000, projected: 1200000 },
  { month: "Sep 2025", actual: 10900000, projected: 1300000 },
  { month: "Oct 2025", actual: 11800000, projected: 1100000 },
  { month: "Nov 2025", actual: 12800000, projected: 1300000 },
  { month: "Dec 2025", actual: 16560000, projected: 1200000 },
];

const chartConfig = {
  actual: {
    label: "Actual",
    color: "rgb(16 185 129)",
  },
  projected: {
    label: "Projected",
    color: "rgb(16 185 129 / 0.5)",
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

export function PerformanceChart() {
  const id = useId();
  const [selectedValue, setSelectedValue] = useState("off");

  const chartData = selectedValue === "on" ? arrData : mrrData;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>Performance</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">
                {selectedValue === "off" ? "$1,439,346" : "$8,272,152"}
              </div>
              <Badge className="mt-1.5 bg-emerald-500/24 text-emerald-500 border-none">
                {selectedValue === "off" ? "+48.1%" : "+52.7%"}
              </Badge>
            </div>
          </div>
          <RadioGroup
            value={selectedValue}
            onValueChange={setSelectedValue}
            className="group text-xs after:border after:border-border after:bg-background has-focus-visible:after:border-ring has-focus-visible:after:ring-ring/50 relative inline-grid grid-cols-[1fr_1fr] items-center gap-0 font-medium after:absolute after:inset-y-0 after:w-1/2 after:rounded-md after:shadow-xs after:transition-[translate,box-shadow] after:duration-300 after:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)] has-focus-visible:after:ring-[3px] data-[state=off]:after:translate-x-0 data-[state=on]:after:translate-x-full"
            data-state={selectedValue}
          >
            <label className="group-data-[state=on]:text-muted-foreground/50 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-2 py-1.5 whitespace-nowrap transition-colors select-none">
              MRR
              <RadioGroupItem
                id={`${id}-1`}
                value="off"
                className="sr-only"
              />
            </label>
            <label className="group-data-[state=off]:text-muted-foreground/50 relative z-10 inline-flex h-full min-w-8 cursor-pointer items-center justify-center px-2 py-1.5 whitespace-nowrap transition-colors select-none">
              ARR
              <RadioGroupItem id={`${id}-2`} value="on" className="sr-only" />
            </label>
          </RadioGroup>
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
                if (value === 0) return "$0";
                return `$${(value / 1000000).toFixed(1)}M`;
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
                  valueFormatter={(value) => `$${value.toLocaleString()}`}
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