// CandleWay Trading Dashboard
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ChartUpload } from "@/components/dashboard/ChartUpload";
import { TradingConfig } from "@/components/dashboard/TradingConfig";
import { AnalysisButton } from "@/components/dashboard/AnalysisButton";
import { PremiumBanner } from "@/components/dashboard/PremiumBanner";
import { AnalysisResultDisplay } from "@/components/analysis/AnalysisResult";
import { MetricsDashboard } from "@/components/dashboard/MetricsDashboard";
import { TradeHistory } from "@/components/dashboard/TradeHistory";
import { TradeExecutionPanel } from "@/components/trading/TradeExecutionPanel";
import { OpenTradesPanel } from "@/components/trading/OpenTradesPanel";
import { RiskSettingsPanel } from "@/components/trading/RiskSettingsPanel";
import { RiskConsentDialog } from "@/components/trading/RiskConsentDialog";
import { MetaTraderWidget } from "@/components/dashboard/MetaTraderWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRiskSettings } from "@/hooks/useRiskSettings";
import { useTrades } from "@/hooks/useTrades";
import { useRiskConsent } from "@/hooks/useRiskConsent";
import { 
  TradingPair, 
  Timeframe, 
  TradingStyle, 
  AnalysisResult 
} from "@/types/analysis";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Settings2, TrendingUp } from "lucide-react";

export default function Index() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pair, setPair] = useState<TradingPair>("EUR/USD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [style, setStyle] = useState<TradingStyle>("Day Trading");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const { toast } = useToast();
  const { user, profile, incrementDailyUsage } = useAuth();
  
  const { settings: riskSettings, updateSettings } = useRiskSettings();
  const { trades, openTrade, closeTrade, cancelTrade, getMetrics, getTodayStats } = useTrades();
  const { hasConsented, giveConsent } = useRiskConsent();

  const dailyLimit = 10;
  const dailyUsed = profile?.daily_analyses_used ?? 0;
  const isPremium = profile?.is_premium ?? false;
  const tier = profile?.subscription_tier ?? 'free';
  const isLimitReached = dailyUsed >= dailyLimit && !isPremium;

  const metrics = getMetrics();
  const todayStats = getTodayStats();

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file);
    setSelectedImage(preview);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setSelectedImage(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveAnalysisToDb = async (result: AnalysisResult) => {
    if (!user) return;
    const { error } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        pair: result.pair,
        timeframe: result.timeframe,
        style: result.style,
        image_url: result.imageUrl,
        trend: result.trend,
        bias: result.bias,
        probability: result.probability,
        risk_score: result.riskScore,
        support_levels: result.supportLevels,
        resistance_levels: result.resistanceLevels,
        market_structure: result.marketStructure,
        detected_patterns: result.detectedPatterns,
        supply_demand_zones: result.supplyDemandZones,
        possible_outcomes: result.possibleOutcomes,
        stop_loss: result.stopLoss,
        take_profit: result.takeProfit,
        reasoning: result.reasoning,
        disclaimer: result.disclaimer,
      });
    if (error) console.error('Error saving analysis:', error);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isLimitReached) return;

    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to analyze charts.", variant: "destructive" });
      window.location.href = "/auth";
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const imageBase64 = await convertFileToBase64(selectedFile);
      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, pair, timeframe, style }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({ title: "Analysis Failed", description: data.error || "Failed to analyze chart.", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Analysis Failed", description: data.error, variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }

      if (!data) {
        toast({ title: "Analysis Failed", description: "No response from AI service.", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }

      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        pair,
        timeframe,
        style,
        imageUrl: selectedImage || "",
        trend: data.trend || "Sideways",
        bias: data.bias || data.direction === 'BUY' ? 'Buy' : data.direction === 'SELL' ? 'Sell' : "No Trade",
        probability: data.probability || data.confidence || 50,
        riskScore: data.riskScore || 5,
        supportLevels: data.supportLevels || [],
        resistanceLevels: data.resistanceLevels || [],
        marketStructure: data.marketStructure || "Unable to determine",
        detectedPatterns: data.detectedPatterns || [],
        supplyDemandZones: data.supplyDemandZones || [],
        possibleOutcomes: data.possibleOutcomes || [],
        stopLoss: data.stopLoss || data.stop_loss || "-",
        takeProfit: data.takeProfit || data.take_profit || "-",
        reasoning: data.reasoning || "Analysis complete.",
        disclaimer: data.disclaimer || "Not financial advice. Probability-based analysis only.",
      };

      await saveAnalysisToDb(result);
      await incrementDailyUsage();
      setAnalysisResult(result);
      
      toast({
        title: "Analysis Complete",
        description: `${result.bias} signal detected with ${result.probability}% confidence.`,
      });
    } catch (err) {
      toast({ title: "Analysis Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setAnalysisResult(null);
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleConsentAccepted = async () => {
    await giveConsent();
    setShowConsentDialog(false);
    toast({ title: "Risk Agreement Accepted", description: "You can now use trading automation features." });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <Header isPremium={isPremium} dailyUsed={dailyUsed} dailyLimit={dailyLimit} />

      <main className="relative container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {analysisResult ? (
          <div className="grid gap-8 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <AnalysisResultDisplay 
                result={analysisResult} 
                onAnalyzeAnother={handleAnalyzeAnother} 
              />
            </div>
            <div className="space-y-6">
              <TradeExecutionPanel
                analysis={analysisResult}
                riskSettings={riskSettings}
                onExecuteTrade={openTrade}
                todayStats={todayStats}
                hasConsented={hasConsented}
                onRequestConsent={() => setShowConsentDialog(true)}
              />
              <OpenTradesPanel 
                trades={trades} 
                onCloseTrade={closeTrade} 
                onCancelTrade={cancelTrade} 
              />
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="text-center space-y-4 py-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="gradient-text">AI-Powered</span>
                <br />
                <span className="text-foreground">Trading Automation</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Analyze charts, manage risk, and execute paper trades — all powered by institutional-grade AI.
              </p>
            </section>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="analyze" className="space-y-6">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
                <TabsTrigger value="analyze" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analyze
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="risk" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Risk
                </TabsTrigger>
              </TabsList>

              {/* Analyze Tab */}
              <TabsContent value="analyze" className="space-y-8">
                {!isPremium && <PremiumBanner />}

                <section className="glass-card-glow p-6 md:p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">New Analysis</h2>
                    <p className="text-sm text-muted-foreground">
                      Upload a chart screenshot to get AI analysis with entry, SL/TP, and trade execution
                    </p>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    <ChartUpload
                      onImageSelect={handleImageSelect}
                      selectedImage={selectedImage}
                      onClear={handleClearImage}
                    />
                    <div className="space-y-6">
                      <TradingConfig
                        pair={pair}
                        timeframe={timeframe}
                        style={style}
                        onPairChange={setPair}
                        onTimeframeChange={setTimeframe}
                        onStyleChange={setStyle}
                      />
                      <AnalysisButton
                        onClick={handleAnalyze}
                        disabled={!selectedImage || isLimitReached}
                        isLoading={isAnalyzing}
                        hasImage={!!selectedImage}
                        isLimitReached={isLimitReached}
                      />
                      {isLimitReached && (
                        <p className="text-sm text-center text-destructive">
                          Daily limit reached. Upgrade to Premium for unlimited analyses.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* MT Widget + Open Trades + Recent */}
                {user && <MetaTraderWidget />}
                <div className="grid gap-6 lg:grid-cols-2">
                  <OpenTradesPanel 
                    trades={trades} 
                    onCloseTrade={closeTrade} 
                    onCancelTrade={cancelTrade} 
                  />
                  <TradeHistory trades={trades} />
                </div>

                {/* Quick Tips */}
                <section className="grid gap-4 md:grid-cols-3">
                  <div className="glass-card p-5 space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <h3 className="font-semibold">Clear Charts</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload high-quality screenshots with visible candlesticks for best results.
                    </p>
                  </div>
                  <div className="glass-card p-5 space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xl">🤖</span>
                    </div>
                    <h3 className="font-semibold">AI Execution</h3>
                    <p className="text-sm text-muted-foreground">
                      After analysis, execute paper trades directly with risk management applied.
                    </p>
                  </div>
                  <div className="glass-card p-5 space-y-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xl">🛡️</span>
                    </div>
                    <h3 className="font-semibold">Risk Engine</h3>
                    <p className="text-sm text-muted-foreground">
                      Server-side risk limits prevent overtrading and enforce daily loss limits.
                    </p>
                  </div>
                </section>
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-6">
                <MetricsDashboard metrics={metrics} />
                <TradeHistory trades={trades} />
              </TabsContent>

              {/* Risk Settings Tab */}
              <TabsContent value="risk">
                {riskSettings ? (
                  <RiskSettingsPanel 
                    settings={riskSettings} 
                    onUpdate={updateSettings}
                    tier={tier}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {user ? "Loading risk settings..." : "Sign in to configure risk settings."}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <footer className="border-t border-border/40 mt-16">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2025 CandleWay. AI-powered trading automation.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      <RiskConsentDialog
        open={showConsentDialog}
        onConsent={handleConsentAccepted}
        onCancel={() => setShowConsentDialog(false)}
      />
    </div>
  );
}
