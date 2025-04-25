import { TooltipProps } from "recharts";

interface CustomTooltipContentProps extends TooltipProps<number, string> {
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  // Optional array to define display order
  dataKeys?: string[];
  // Optional formatter for values
  valueFormatter?: (value: number) => string;
}

export function CustomTooltipContent({
  active,
  payload,
  label,
  colorMap = {},
  labelMap = {},
  dataKeys,
  valueFormatter = (value) => `$${value.toLocaleString()}`,
}: CustomTooltipContentProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Format the label to show the full date
  const formattedLabel = (() => {
    try {
      // Get the date from the first payload item's payload
      const date = payload[0]?.payload?.date;
      if (date) {
        return new Date(date).toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return label;
    } catch (e) {
      return label;
    }
  })();

  // Create a map of payload items by dataKey for easy lookup
  const payloadMap = payload.reduce(
    (acc, item) => {
      acc[item.dataKey as string] = item;
      return acc;
    },
    {} as Record<string, (typeof payload)[0]>,
  );

  // If dataKeys is provided, use it to order the items
  // Otherwise, use the original payload order
  const orderedPayload = dataKeys
    ? dataKeys
        .filter((key) => payloadMap[key])
        .map((key) => payloadMap[key])
    : payload;

  return (
    <div className="bg-popover text-popover-foreground grid min-w-32 items-start gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs shadow-lg">
      <div className="font-medium text-foreground">{formattedLabel}</div>
      <div className="grid gap-1.5">
        {orderedPayload.map((entry, index) => {
          if (!entry) return null;

          const name = entry.dataKey as string;
          const value = entry.value as number;

          const color = colorMap[name] || "var(--chart-1)";
          const displayLabel = labelMap[name] || name;

          return (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{displayLabel}</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {valueFormatter(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 