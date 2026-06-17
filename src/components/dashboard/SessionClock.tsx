import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  name: string;
  short: string;
  open: number;
  close: number;
  color: string;
  flag: string;
}

const SESSIONS: Session[] = [
  { name: "Sydney",   short: "SYD", open: 22, close: 7,  color: "text-blue-400",   flag: "🇦🇺" },
  { name: "Tokyo",    short: "TKY", open: 0,  close: 9,  color: "text-red-400",    flag: "🇯🇵" },
  { name: "London",   short: "LON", open: 8,  close: 17, color: "text-yellow-400", flag: "🇬🇧" },
  { name: "New York", short: "NY",  open: 13, close: 22, color: "text-green-400",  flag: "🇺🇸" },
];

function isSessionOpen(session: Session, utcHour: number): boolean {
  if (session.open < session.close) {
    return utcHour >= session.open && utcHour < session.close;
  }
  return utcHour >= session.open || utcHour < session.close;
}

function getOverlap(utcHour: number): string | null {
  const openSessions = SESSIONS.filter(s => isSessionOpen(s, utcHour)).map(s => s.short);
  if (openSessions.includes("LON") && openSessions.includes("NY")) return "London/NY — High Volatility";
  if (openSessions.includes("TKY") && openSessions.includes("LON")) return "Tokyo/London — Medium Vol.";
  return null;
}

export function SessionClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMin  = now.getUTCMinutes();
  const utcSec  = now.getUTCSeconds();
  const overlap = getOverlap(utcHour);
  const openCount = SESSIONS.filter(s => isSessionOpen(s, utcHour)).length;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Market Sessions</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {String(utcHour).padStart(2,"0")}:{String(utcMin).padStart(2,"0")}:{String(utcSec).padStart(2,"0")} UTC
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SESSIONS.map(session => {
          const open = isSessionOpen(session, utcHour);
          return (
            <div
              key={session.name}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-2 py-2 border transition-all",
                open
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/30 bg-secondary/20 opacity-50"
              )}
            >
              <span className="text-base">{session.flag}</span>
              <span className={cn("text-xs font-bold", open ? session.color : "text-muted-foreground")}>
                {session.short}
              </span>
              <span className={cn("text-[10px] font-medium", open ? "text-primary" : "text-muted-foreground")}>
                {open ? "OPEN" : "CLOSED"}
              </span>
            </div>
          );
        })}
      </div>

      {overlap ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          <span className="text-xs text-yellow-400 font-medium">{overlap}</span>
        </div>
      ) : openCount === 0 ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-border/30">
          <span className="h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">All sessions closed — low liquidity</span>
        </div>
      ) : null}
    </div>
  );
}
