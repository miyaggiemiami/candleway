import { TrendingUp, Crown, Menu, User, LogOut, LogIn, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  isPremium?: boolean;
  dailyUsed?: number;
  dailyLimit?: number;
}

export function Header({ isPremium: propIsPremium, dailyUsed: propDailyUsed, dailyLimit = 10 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  // Use profile data if available, otherwise fall back to props
  const isPremium = profile?.is_premium ?? propIsPremium ?? false;
  const dailyUsed = profile?.daily_analyses_used ?? propDailyUsed ?? 0;
  const displayName = profile?.display_name || profile?.username || user?.displayName || user?.email?.split('@')[0];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/auth";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 shadow-lg shadow-primary/30">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">Apexium</span>
            </span>
            <span className="text-[10px] text-muted-foreground -mt-1">AI Chart Analyzer</span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Dashboard
          </a>
          <a href="/history" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            History
          </a>
          <a href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="/settings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Settings
          </a>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Usage Counter */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
              <span className="text-xs text-muted-foreground">Daily:</span>
              <span className={cn(
                "text-sm font-mono font-semibold",
                dailyUsed >= dailyLimit ? "text-destructive" : "text-primary"
              )}>
                {dailyUsed}/{dailyLimit}
              </span>
            </div>
          )}

          {user && isPremium ? (
            <Badge variant="premium" className="gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          ) : user && !isPremium ? (
            <Button variant="premium" size="sm" className="hidden sm:flex" onClick={() => window.location.href = "/pricing"}>
              <Crown className="h-4 w-4" />
              Upgrade
            </Button>
          ) : null}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                  <User className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" className="hidden md:flex gap-2" onClick={() => window.location.href = "/auth"}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="container flex flex-col gap-2 p-4">
            <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Dashboard</span>
            </a>
            <a href="/history" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">History</span>
            </a>
            <a href="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Pricing</span>
            </a>
            <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Settings</span>
            </a>
            {user && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/50">
                <span className="text-sm text-muted-foreground">Daily Analyses</span>
                <span className="text-sm font-mono font-semibold text-primary">{dailyUsed}/{dailyLimit}</span>
              </div>
            )}
            {user && !isPremium && (
              <Button variant="premium" className="mt-2" onClick={() => window.location.href = "/pricing"}>
                <Crown className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            )}
            {user ? (
              <Button variant="outline" className="mt-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button variant="default" className="mt-2" onClick={() => window.location.href = "/auth"}>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
