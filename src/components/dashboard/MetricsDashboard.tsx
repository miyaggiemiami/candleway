import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Target, Activity, Award, BarChart3, AlertTriangle, 
  DollarSign, Percent 
} from "lucide-react";
import { DashboardMetrics } from "@/types/trading";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

interface MetricsDashboardProps {
  metrics: DashboardMetrics;
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const statCards = [
    {
      label: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      icon: <Target className="h-4 w-4 text-primary" />,
      color: metrics.winRate >= 50 ? 'text-primary' : 'text-destructive',
    },
    {
      label: "Total P&L",
      value: `$${metrics.totalPnl.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4 text-primary" />,
      color: metrics.totalPnl >= 0 ? 'text-primary' : 'text-destructive',
    },
    {
      label: "Max Drawdown",
      value: `$${metrics.maxDrawdown.toFixed(2)}`,
      icon: <AlertTriangle className="h-4 w-4 text-warning" />,
      color: 'text-warning',
    },
    {
      label: "Total Trades",
      value: metrics.totalTrades.toString(),
      icon: <Activity className="h-4 w-4 text-primary" />,
      color: 'text-foreground',
    },
    {
      label: "Avg Confidence",
      value: `${metrics.avgConfidence.toFixed(0)}%`,
      icon: <Percent className="h-4 w-4 text-primary" />,
      color: 'text-primary',
    },
    {
      label: "Best Pair",
      value: metrics.bestPair,
      icon: <Award className="h-4 w-4 text-primary" />,
      color: 'text-primary',
    },
  ];

  const pieData = [
    { name: 'Wins', value: metrics.winLossData.wins, fill: 'hsl(var(--primary))' },
    { name: 'Losses', value: metrics.winLossData.losses, fill: 'hsl(var(--destructive))' },
    { name: 'BE', value: metrics.winLossData.breakeven, fill: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <div className="p-1.5 rounded-lg bg-primary/10">{stat.icon}</div>
              </div>
              <p className={cn("text-lg font-bold font-mono", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equity Curve */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.tradesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.tradesByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No trade data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Win/Loss Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-sm">{metrics.winLossData.wins} Wins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    <span className="text-sm">{metrics.winLossData.losses} Losses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                    <span className="text-sm">{metrics.winLossData.breakeven} B/E</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
                No trade data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confidence Accuracy */}
      {metrics.confidenceAccuracy.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              AI Confidence vs Actual Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.confidenceAccuracy}>
                <XAxis 
                  dataKey="confidence" 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }} 
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Actual Win Rate']}
                  labelFormatter={(v) => `Confidence: ${v}%`}
                />
                <Bar dataKey="actualWinRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
