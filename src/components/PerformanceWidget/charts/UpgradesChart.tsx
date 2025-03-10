import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function UpgradesChart() {
  return (
    <Card className="gap-5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>New Subscribers</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">26,864</div>
              <Badge className="mt-1.5 bg-emerald-500/24 text-emerald-500 border-none">
                +3.4%
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-chart-4"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Individual
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-chart-1"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">Team</div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-chart-6"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Enterprise
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex gap-1 h-5">
          <div className="bg-[rgb(98,126,234,0.75)] h-full" style={{ width: "22%" }}></div>
          <div
            className="bg-[rgb(0,194,110,0.75)] h-full"
            style={{ width: "24%" }}
          ></div>
          <div className="bg-[rgb(255,77,21,0.75)] h-full" style={{ width: "16%" }}></div>
          <div className="bg-[rgb(98,126,234,0.75)] h-full" style={{ width: "38%" }}></div>
        </div>
        <div>
          <div className="text-[13px]/3 text-muted-foreground/50 mb-3">
            Reason for upgrading
          </div>
          <ul className="text-sm divide-y divide-border">
            <li className="py-2 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-[rgb(98,126,234,0.75)]"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">
                Needed access to premium tools.
              </span>
              <span className="text-[13px]/3 font-medium text-foreground/70">
                4,279
              </span>
            </li>
            <li className="py-2 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-[rgb(0,194,110,0.75)]"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">
                Enhanced assistance and protection.
              </span>
              <span className="text-[13px]/3 font-medium text-foreground/70">
                4,827
              </span>
            </li>
            <li className="py-2 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-[rgb(255,77,21,0.75)]"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">
                Faster, more reliable experience.
              </span>
              <span className="text-[13px]/3 font-medium text-foreground/70">
                3,556
              </span>
            </li>
            <li className="py-2 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-[rgb(98,126,234,0.75)]"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">
                Scaling up operations.
              </span>
              <span className="text-[13px]/3 font-medium text-foreground/70">
                6,987
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 