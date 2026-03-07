import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Shield, AlertTriangle, Zap } from "lucide-react";
import { RiskSettings, AutomationMode } from "@/types/trading";
import { Badge } from "@/components/ui/badge";

interface RiskSettingsPanelProps {
  settings: RiskSettings;
  onUpdate: (updates: Partial<RiskSettings>) => void;
  tier: string;
}

export function RiskSettingsPanel({ settings, onUpdate, tier }: RiskSettingsPanelProps) {
  const canUseAdvancedRisk = true;
  const canUseAssisted = true;
  const canUseAuto = true;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Risk Engine Configuration
        </CardTitle>
        <CardDescription>Server-side enforced risk management rules</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Per Trade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Risk Per Trade (%)</Label>
            <span className="text-sm font-mono text-primary">{settings.risk_per_trade}%</span>
          </div>
          <Slider
            value={[Number(settings.risk_per_trade)]}
            onValueChange={([v]) => onUpdate({ risk_per_trade: v })}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>

        {/* Max Trades Per Day */}
        <div className="space-y-2">
          <Label>Max Trades / Day</Label>
          <Input
            type="number"
            value={settings.max_trades_per_day}
            onChange={(e) => onUpdate({ max_trades_per_day: Number(e.target.value) })}
            min={1}
            max={50}
            className="glass-card"
          />
        </div>

        {/* Max Daily Loss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Max Daily Loss (%)</Label>
            <span className="text-sm font-mono text-destructive">{settings.max_daily_loss}%</span>
          </div>
          <Slider
            value={[Number(settings.max_daily_loss)]}
            onValueChange={([v]) => onUpdate({ max_daily_loss: v })}
            min={1}
            max={20}
            step={0.5}
          />
        </div>

        {/* Daily Profit Lock */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Daily Profit Lock (%)</Label>
            <span className="text-sm font-mono text-primary">{settings.daily_profit_lock}%</span>
          </div>
          <Slider
            value={[Number(settings.daily_profit_lock)]}
            onValueChange={([v]) => onUpdate({ daily_profit_lock: v })}
            min={0}
            max={50}
            step={1}
          />
          <p className="text-xs text-muted-foreground">Lock daily gains after reaching this profit %. 0 = disabled.</p>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Min Confidence Threshold</Label>
            <span className="text-sm font-mono text-primary">{settings.confidence_threshold}%</span>
          </div>
          <Slider
            value={[settings.confidence_threshold]}
            onValueChange={([v]) => onUpdate({ confidence_threshold: v })}
            min={50}
            max={95}
            step={5}
          />
          <p className="text-xs text-muted-foreground">Reject signals below this confidence level.</p>
        </div>

        {/* Automation Mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Execution Mode
          </Label>
          <Select 
            value={settings.automation_mode} 
            onValueChange={(v) => onUpdate({ automation_mode: v as AutomationMode })}
          >
            <SelectTrigger className="glass-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (Execute yourself)</SelectItem>
              <SelectItem value="assisted">
                Assisted (Confirm before send)
              </SelectItem>
              <SelectItem value="auto">
                Full Auto (Paper Trading)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Safety Toggles */}
        <div className="space-y-4 pt-2 border-t border-border/50">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Safety Engine
          </h4>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Circuit Breaker</p>
              <p className="text-xs text-muted-foreground">Halt during abnormal volatility</p>
            </div>
            <Switch 
              checked={settings.circuit_breaker_enabled} 
              onCheckedChange={(v) => onUpdate({ circuit_breaker_enabled: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">News Filter</p>
              <p className="text-xs text-muted-foreground">Avoid trading during high-impact news</p>
            </div>
            <Switch 
              checked={settings.news_filter_enabled} 
              onCheckedChange={(v) => onUpdate({ news_filter_enabled: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                Kill Switch
                {settings.kill_switch_active && <Badge variant="destructive" className="text-xs">ACTIVE</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">Emergency stop all automation</p>
            </div>
            <Switch 
              checked={settings.kill_switch_active} 
              onCheckedChange={(v) => onUpdate({ kill_switch_active: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
