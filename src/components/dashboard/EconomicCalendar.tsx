import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

interface EconEvent {
  date: Date;
  time: string;
  country: string;
  flag: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
  actual?: string;
}

function getUpcomingEvents(): EconEvent[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const d = (month: number, day: number, hr: string): EconEvent["date"] & { _time: string } => {
    const dt = new Date(y, month, day) as any;
    dt._time = hr;
    return dt;
  };

  const events: EconEvent[] = [
    {
      date: new Date(y, m, 17), time: "13:30", country: "US", flag: "🇺🇸",
      event: "Retail Sales m/m", impact: "high",
      forecast: "0.3%", previous: "0.1%", actual: "0.4%"
    },
    {
      date: new Date(y, m, 17), time: "15:00", country: "US", flag: "🇺🇸",
      event: "Consumer Confidence", impact: "medium",
      forecast: "98.5", previous: "97.2", actual: "99.1"
    },
    {
      date: new Date(y, m, 18), time: "19:00", country: "US", flag: "🇺🇸",
      event: "FOMC Meeting Minutes", impact: "high",
      forecast: "–", previous: "–"
    },
    {
      date: new Date(y, m, 19), time: "08:30", country: "GB", flag: "🇬🇧",
      event: "UK CPI y/y", impact: "high",
      forecast: "2.3%", previous: "2.2%"
    },
    {
      date: new Date(y, m, 19), time: "13:30", country: "US", flag: "🇺🇸",
      event: "Initial Jobless Claims", impact: "medium",
      forecast: "218K", previous: "222K"
    },
    {
      date: new Date(y, m, 20), time: "12:30", country: "CA", flag: "🇨🇦",
      event: "CAD CPI m/m", impact: "high",
      forecast: "0.2%", previous: "0.5%"
    },
    {
      date: new Date(y, m, 20), time: "13:30", country: "US", flag: "🇺🇸",
      event: "Core PCE Price Index m/m", impact: "high",
      forecast: "0.2%", previous: "0.2%"
    },
    {
      date: new Date(y, m, 23), time: "01:30", country: "CN", flag: "🇨🇳",
      event: "PBoC Loan Prime Rate", impact: "high",
      forecast: "3.10%", previous: "3.10%"
    },
    {
      date: new Date(y, m, 23), time: "09:00", country: "EU", flag: "🇪🇺",
      event: "ECB President Lagarde Speech", impact: "high",
      forecast: "–", previous: "–"
    },
    {
      date: new Date(y, m, 24), time: "13:30", country: "US", flag: "🇺🇸",
      event: "CB Consumer Confidence", impact: "medium",
      forecast: "101.3", previous: "100.1"
    },
    {
      date: new Date(y, m, 25), time: "13:30", country: "US", flag: "🇺🇸",
      event: "US GDP q/q (Final)", impact: "high",
      forecast: "2.4%", previous: "2.4%"
    },
    {
      date: new Date(y, m + 1, 3), time: "13:30", country: "US", flag: "🇺🇸",
      event: "Non-Farm Payrolls", impact: "high",
      forecast: "175K", previous: "189K"
    },
    {
      date: new Date(y, m + 1, 3), time: "13:30", country: "US", flag: "🇺🇸",
      event: "Unemployment Rate", impact: "high",
      forecast: "4.1%", previous: "4.0%"
    },
    {
      date: new Date(y, m + 1, 10), time: "13:30", country: "US", flag: "🇺🇸",
      event: "US CPI y/y", impact: "high",
      forecast: "2.7%", previous: "2.8%"
    },
  ];

  return events.filter(e => {
    const evDate = new Date(e.date);
    evDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 14);
    return evDate >= today && evDate <= cutoff;
  }).sort((a, b) => {
    const da = new Date(a.date).getTime() + toMinutes(a.time);
    const db = new Date(b.date).getTime() + toMinutes(b.time);
    return da - db;
  });
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h * 60 + m) * 60 * 1000;
}

function impactColor(i: EconEvent["impact"]) {
  if (i === "high") return "text-red-400 bg-red-400/10 border-red-400/30";
  if (i === "medium") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-blue-400 bg-blue-400/10 border-blue-400/30";
}

function groupByDate(events: EconEvent[]) {
  const groups: { label: string; events: EconEvent[] }[] = [];
  const seen: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const e of events) {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    let label: string;
    if (diff === 0) label = "Today";
    else if (diff === 1) label = "Tomorrow";
    else label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    if (!(label in seen)) {
      seen[label] = groups.length;
      groups.push({ label, events: [] });
    }
    groups[seen[label]].events.push(e);
  }
  return groups;
}

export function EconomicCalendar() {
  const [expanded, setExpanded] = useState(true);
  const events = getUpcomingEvents();
  const groups = groupByDate(events);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader
        className="pb-2 flex flex-row items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(x => !x)}
      >
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Economic Calendar
          <span className="text-xs font-normal text-muted-foreground">Next 14 days</span>
        </CardTitle>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No major events in the next 14 days</p>
          )}
          {groups.map(g => (
            <div key={g.label}>
              <p className={`text-xs font-semibold mb-2 px-1 ${g.label === "Today" ? "text-primary" : "text-muted-foreground"}`}>
                {g.label}
              </p>
              <div className="space-y-1.5">
                {g.events.map((e, i) => {
                  const isPast = e.actual !== undefined;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-md px-2 py-2 text-xs transition-colors ${isPast ? "opacity-60" : "hover:bg-muted/30"}`}
                    >
                      <span className="text-muted-foreground w-[38px] shrink-0 pt-0.5">{e.time}</span>
                      <span className="text-base leading-none shrink-0">{e.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.event}</p>
                        <div className="flex gap-2 mt-0.5 text-muted-foreground">
                          {e.forecast !== "–" && <span>Fcst: <span className="text-foreground">{e.forecast}</span></span>}
                          <span>Prev: <span className="text-foreground">{e.previous}</span></span>
                          {e.actual && <span className="text-green-400 font-semibold">Actual: {e.actual}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 border ${impactColor(e.impact)}`}>
                        {e.impact}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
