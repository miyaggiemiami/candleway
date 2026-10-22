import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Crown, 
  Bell, 
  Moon,
  Sun,
  Shield, 
  Trash2, 
  Mail, 
  HelpCircle,
  ExternalLink,
  LogOut,
  Wifi,
  WifiOff,
  Loader2,
  Monitor,
  Eye,
  EyeOff,
  KeyRound,
  Server,
  UserRound,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMetaTraderSettings } from "@/hooks/useMetaTraderSettings";
import { useTheme } from "@/hooks/useTheme";

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const darkMode = isDark;
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState("trader@example.com");
  const [name, setName] = useState("Trader");
  
  const { settings: mtSettings, loading: mtLoading, saving: mtSaving, saveSettings: saveMtSettings, testConnection } = useMetaTraderSettings();
  const [mtLogin, setMtLogin] = useState("");
  const [mtPassword, setMtPassword] = useState("");
  const [mtServer, setMtServer] = useState("");
  const [showMtPassword, setShowMtPassword] = useState(false);
  const [mtTesting, setMtTesting] = useState(false);

  useEffect(() => {
    if (!mtSettings) return;
    setMtLogin(mtSettings.login);
    setMtServer(mtSettings.server);
  }, [mtSettings]);

  const handleMtSave = async () => {
    const saved = await saveMtSettings({
      login: mtLogin,
      password: mtPassword,
      server: mtServer,
    });
    if (saved) setMtPassword("");
  };

  const handleMtTest = async () => {
    setMtTesting(true);
    try {
      const credentialsChanged = mtLogin !== (mtSettings?.login || "") ||
        mtServer !== (mtSettings?.server || "") ||
        Boolean(mtPassword);
      if (credentialsChanged) {
        const saved = await saveMtSettings({
          login: mtLogin,
          password: mtPassword,
          server: mtServer,
        });
        if (!saved) return;
        setMtPassword("");
      }
      await testConnection();
    } finally {
      setMtTesting(false);
    }
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
                {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-medium">{isDark ? "Dark Mode" : "Light Mode"}</p>
                  <p className="text-sm text-muted-foreground">{isDark ? "Switch to light theme" : "Switch to dark theme"}</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleTheme} />
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
        <Card className="mt5-credentials-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
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
            <CardDescription>
              Connect your MT5 trading account directly. Credentials are encrypted before they are stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your password is encrypted on the server and never sent back to this page. Leave it blank to keep the saved password.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mt-login" className="text-sm font-medium">MT5 account number</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mt-login"
                    inputMode="numeric"
                    autoComplete="username"
                    value={mtLogin}
                    onChange={(e) => setMtLogin(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="mt5-credential-input pl-10 font-mono"
                    disabled={mtLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">The numeric login provided by your broker</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-server" className="text-sm font-medium">Broker server</Label>
                <div className="relative">
                  <Server className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mt-server"
                    autoComplete="off"
                    value={mtServer}
                    onChange={(e) => setMtServer(e.target.value)}
                    placeholder="e.g. BrokerName-Demo"
                    className="mt5-credential-input pl-10"
                    disabled={mtLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Use the exact server name shown in MT5</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mt-password" className="text-sm font-medium">MT5 trading password</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mt-password"
                    type={showMtPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={mtPassword}
                    onChange={(e) => setMtPassword(e.target.value)}
                    placeholder={mtSettings?.has_password ? "Saved securely — enter a new password to replace it" : "Enter your MT5 trading password"}
                    className="mt5-credential-input pr-12 pl-10"
                    disabled={mtLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMtPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showMtPassword ? "Hide MT5 password" : "Show MT5 password"}
                    aria-pressed={showMtPassword}
                  >
                    {showMtPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Use your trading password, not your investor/read-only password</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleMtSave}
                disabled={mtLoading || mtSaving || !/^\d+$/.test(mtLogin) || !mtServer.trim() || (!mtPassword && !mtSettings?.has_password)}
                className="h-11 flex-1 shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.65)]"
              >
                {mtSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Save MT5 Credentials
              </Button>
              <Button
                variant="outline"
                className="h-11 border-border/70 bg-background/40 px-6"
                onClick={handleMtTest}
                disabled={mtTesting || mtSaving || (!mtPassword && !mtSettings?.has_password) || !/^\d+$/.test(mtLogin) || !mtServer.trim()}
              >
                {mtTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
                Test connection
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
