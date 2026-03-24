import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Crown, 
  Bell, 
  Moon, 
  Shield, 
  Trash2, 
  Mail, 
  HelpCircle,
  ExternalLink,
  LogOut,
  Wifi,
  WifiOff,
  Loader2,
  Monitor
} from "lucide-react";
import { useState } from "react";
import { useMetaTraderSettings } from "@/hooks/useMetaTraderSettings";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState("trader@example.com");
  const [name, setName] = useState("Trader");
  
  const { settings: mtSettings, loading: mtLoading, saving: mtSaving, saveSettings: saveMtSettings, testConnection } = useMetaTraderSettings();
  const [mtAccountId, setMtAccountId] = useState('');
  const [mtApiToken, setMtApiToken] = useState('');
  const [mtRegion, setMtRegion] = useState('new-york');
  const [mtPlatform, setMtPlatform] = useState('mt5');
  const [mtTesting, setMtTesting] = useState(false);

  // Populate fields when settings load
  const [initialized, setInitialized] = useState(false);
  if (mtSettings && !initialized) {
    setMtAccountId(mtSettings.account_id);
    setMtApiToken(mtSettings.api_token);
    setMtRegion(mtSettings.server_region);
    setMtPlatform(mtSettings.platform);
    setInitialized(true);
  }

  const handleMtSave = async () => {
    await saveMtSettings({
      account_id: mtAccountId,
      api_token: mtApiToken,
      server_region: mtRegion,
      platform: mtPlatform,
    });
  };

  const handleMtTest = async () => {
    setMtTesting(true);
    await testConnection();
    setMtTesting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Settings</h1>

        {/* Profile Section */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
              <Badge variant="outline">Free Plan</Badge>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="glass-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-card"
                />
              </div>
              <Button variant="outline">Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="glass-card mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="font-semibold">Free Plan</p>
                <p className="text-sm text-muted-foreground">3 analyses per day</p>
              </div>
              <Button variant="premium" onClick={() => window.location.href = "/pricing"}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive analysis alerts</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* MetaTrader Connection */}
        <Card className="glass-card mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              MetaTrader Connection
              {mtSettings?.is_connected ? (
                <Badge variant="outline" className="ml-auto text-xs border-emerald-500/50 text-emerald-400">
                  <Wifi className="h-3 w-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto text-xs border-muted-foreground/50">
                  <WifiOff className="h-3 w-3 mr-1" /> Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Connect your MetaTrader account via MetaApi for live trading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mt-account-id">MetaApi Account ID</Label>
              <Input
                id="mt-account-id"
                value={mtAccountId}
                onChange={(e) => setMtAccountId(e.target.value)}
                placeholder="e.g. a1b2c3d4-e5f6-..."
                className="glass-card font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Find this in your MetaApi dashboard under Accounts</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-api-token">MetaApi API Token</Label>
              <Input
                id="mt-api-token"
                type="password"
                value={mtApiToken}
                onChange={(e) => setMtApiToken(e.target.value)}
                placeholder="Your MetaApi token"
                className="glass-card font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Generate at metaapi.cloud → API Access</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={mtPlatform} onValueChange={setMtPlatform}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mt5">MetaTrader 5</SelectItem>
                    <SelectItem value="mt4">MetaTrader 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Server Region</Label>
                <Select value={mtRegion} onValueChange={setMtRegion}>
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-york">New York</SelectItem>
                    <SelectItem value="london">London</SelectItem>
                    <SelectItem value="singapore">Singapore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleMtSave} disabled={mtSaving || !mtAccountId || !mtApiToken} className="flex-1">
                {mtSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Credentials
              </Button>
              <Button variant="outline" onClick={handleMtTest} disabled={mtTesting || !mtAccountId || !mtApiToken}>
                {mtTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
                Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Shield className="h-4 w-4" />
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Data Section */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>Manage your data and history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Trash2 className="h-4 w-4" />
              Clear Analysis History
            </Button>
            <Button variant="destructive" className="w-full justify-start gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Support
            </CardTitle>
            <CardDescription>Get help and contact us</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              Help Center
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">
              <p>Apexium v1.0.0</p>
              <p className="mt-1">© 2025 Apexium. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
