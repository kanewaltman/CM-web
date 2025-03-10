import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CustomTooltipContent } from "./ChartExtras";
import { Badge } from "@/components/ui/badge";

const chartData = [
  { month: "Jan 2025", individual: 2000, team: 1000, enterprise: 1000 },
  { month: "Feb 2025", individual: 800, team: 4500, enterprise: 1700 },
  { month: "Mar 2025", individual: 400, team: 4600, enterprise: 1000 },
  { month: "Apr 2025", individual: 1800, team: 4700, enterprise: 2000 },
  { month: "May 2025", individual: 1800, team: 6000, enterprise: 4000 },
  { month: "Jun 2025", individual: 2500, team: 6000, enterprise: 1500 },
  { month: "Jul 2025", individual: 1000, team: 2500, enterprise: 1000 },
  { month: "Aug 2025", individual: 2000, team: 4000, enterprise: 2500 },
  { month: "Sep 2025", individual: 4500, team: 7000, enterprise: 3000 },
  { month: "Oct 2025", individual: 2500, team: 3000, enterprise: 3500 },
  { month: "Nov 2025", individual: 500, team: 1500, enterprise: 1000 },
  { month: "Dec 2025", individual: 2000, team: 3000, enterprise: 1500 },
];

const chartConfig = {
  individual: {
    label: "Individual",
    color: "hsl(var(--color-primary-default))",
  },
  team: {
    label: "Team",
    color: "hsl(var(--color-success-default))",
  },
  enterprise: {
    label: "Enterprise",
    color: "hsl(var(--color-info-default))",
  },
} satisfies ChartConfig;

export function SubscriptionsChart() {
  const id = useId();

  // Get first and last month with type assertions
  const firstMonth = chartData[0]?.month as string;
  const lastMonth = chartData[chartData.length - 1]?.month as string;

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>Subscriptions Sold</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">12,296</div>
              <Badge className="mt-1.5 bg-emerald-500/24 text-emerald-500 border-none">
                +11.9%
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-primary"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Individual
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-success"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">Team</div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-info"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Enterprise
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-60 w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-success/15"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            maxBarSize={20}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <defs>
              <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--color-success-default))" />
                <stop offset="100%" stopColor="hsl(var(--color-success-default) / 0.8)" />
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
              ticks={[firstMonth, lastMonth]}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value === 0 ? "0" : `${(value / 1000).toFixed(0)}K`
              }
            />
            <ChartTooltip
              content={
                <CustomTooltipContent
                  colorMap={{
                    individual: "hsl(var(--color-primary-default))",
                    team: "hsl(var(--color-success-default))",
                    enterprise: "hsl(var(--color-info-default))",
                  }}
                  labelMap={{
                    individual: "Individual",
                    team: "Team",
                    enterprise: "Enterprise",
                  }}
                  dataKeys={["individual", "team", "enterprise"]}
                  valueFormatter={(value) => `$${value.toLocaleString()}`}
                />
              }
            />
            <Bar dataKey="individual" fill="hsl(var(--color-primary-default))" stackId="a" />
            <Bar dataKey="team" fill={`url(#${id}-gradient)`} stackId="a" />
            <Bar dataKey="enterprise" fill="hsl(var(--color-info-default))" stackId="a" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 