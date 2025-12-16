// CandleWay Dashboard
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ChartUpload } from "@/components/dashboard/ChartUpload";
import { TradingConfig } from "@/components/dashboard/TradingConfig";
import { AnalysisButton } from "@/components/dashboard/AnalysisButton";
import { PremiumBanner } from "@/components/dashboard/PremiumBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { AnalysisResultDisplay } from "@/components/analysis/AnalysisResult";
import { supabase } from "@/integrations/supabase/client";
import { 
  TradingPair, 
  Timeframe, 
  TradingStyle, 
  AnalysisResult 
} from "@/types/analysis";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pair, setPair] = useState<TradingPair>("EUR/USD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [style, setStyle] = useState<TradingStyle>("Day Trading");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dailyUsed, setDailyUsed] = useState(1);
  const { toast } = useToast();

  const dailyLimit = 10;
  const isPremium = false;
  const isLimitReached = dailyUsed >= dailyLimit && !isPremium;

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file);
    setSelectedImage(preview);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setSelectedImage(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage || isLimitReached) return;

    setIsAnalyzing(true);
    
    try {
      // Call the AI analysis edge function
      const { data, error } = await supabase.functions.invoke('analyze-chart', {
        body: {
          imageBase64: selectedImage,
          pair,
          timeframe,
          style,
        },
      });

      if (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to analyze chart. Please try again.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      if (data.error) {
        toast({
          title: "Analysis Failed",
          description: data.error,
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      // Create the analysis result from AI response
      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        pair,
        timeframe,
        style,
        imageUrl: selectedImage,
        trend: data.trend || "Sideways",
        bias: data.bias || "No Trade",
        probability: data.probability || 50,
        riskScore: data.riskScore || 5,
        supportLevels: data.supportLevels || [],
        resistanceLevels: data.resistanceLevels || [],
        marketStructure: data.marketStructure || "Unable to determine",
        detectedPatterns: data.detectedPatterns || [],
        supplyDemandZones: data.supplyDemandZones || [],
        possibleOutcomes: data.possibleOutcomes || [],
        stopLoss: data.stopLoss || "-",
        takeProfit: data.takeProfit || "-",
        reasoning: data.reasoning || "Analysis complete.",
        disclaimer: data.disclaimer || "Not financial advice. Probability-based analysis only.",
      };

      setAnalysisResult(result);
      setDailyUsed(prev => prev + 1);
      
      toast({
        title: "Analysis Complete",
        description: `${result.bias} signal detected with ${result.probability}% probability.`,
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Analysis Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setAnalysisResult(null);
    setSelectedImage(null);
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-[80px] pointer-events-none" />

      <Header isPremium={isPremium} dailyUsed={dailyUsed} dailyLimit={dailyLimit} />

      <main className="relative container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {analysisResult ? (
          <AnalysisResultDisplay 
            result={analysisResult} 
            onAnalyzeAnother={handleAnalyzeAnother} 
          />
        ) : (
          <>
            {/* Hero Section */}
            <section className="text-center space-y-4 py-8">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="gradient-text">AI-Powered</span>
                <br />
                <span className="text-foreground">Chart Analysis</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload your trading chart and get instant AI-powered analysis with 
                buy/sell signals, support/resistance levels, and probability scores.
              </p>
            </section>

            {/* Stats */}
            <StatsCards />

            {/* Premium Banner */}
            {!isPremium && <PremiumBanner />}

            {/* Main Analysis Section */}
            <section className="glass-card-glow p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">New Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  Upload a chart screenshot or take a photo to begin
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left - Upload */}
                <ChartUpload
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                  onClear={handleClearImage}
                />

                {/* Right - Config */}
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
                      You've reached your daily limit. Upgrade to Premium for unlimited analyses.
                    </p>
                  )}
                </div>
              </div>
            </section>

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
                  <span className="text-xl">⏰</span>
                </div>
                <h3 className="font-semibold">Match Timeframe</h3>
                <p className="text-sm text-muted-foreground">
                  Select the same timeframe as your chart for accurate analysis.
                </p>
              </div>
              <div className="glass-card p-5 space-y-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <h3 className="font-semibold">Trading Style</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your trading style to get tailored SL/TP recommendations.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2025 CandleWay. AI-powered trading analysis.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
