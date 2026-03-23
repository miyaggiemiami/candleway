import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Zap, TrendingUp, Shield, Clock, BarChart3, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

const features = {
  free: [
    "10 daily chart analyses (with ads)",
    "Basic AI analysis",
    "Support/Resistance detection",
    "Candlestick pattern recognition",
    "7-day analysis history",
  ],
  premium: [
    "Unlimited chart analyses",
    "Advanced AI mode",
    "Multi-timeframe analysis",
    "SL/TP generation",
    "Market structure detection",
    "Volatility forecasting",
    "Supply/Demand zones",
    "Unlimited history",
    "Export & share results",
    "Priority processing",
    "No ads",
  ],
};

const faqs = [
  {
    question: "How accurate is the AI analysis?",
    answer: "Our AI provides probability-based analysis using advanced pattern recognition. While no trading tool can guarantee results, our system analyzes multiple factors including candlestick patterns, market structure, and historical data to give you the best possible insights."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your Premium subscription at any time. Your premium features will remain active until the end of your current billing period."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, Google Pay, and Apple Pay through our secure payment processor Stripe."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade encryption and never share your trading data or uploaded charts with third parties."
  },
  {
    question: "Do I need trading experience to use CandleWay?",
    answer: "CandleWay is designed for traders of all levels. Our AI provides clear buy/sell signals with explanations that both beginners and experienced traders can understand."
  },
];

export default function Pricing() {
  const { user, session, profile, checkSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Welcome to CandleWay Premium. Enjoy unlimited analyses!",
      });
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. No charges were made.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    if (!user || !session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upgrade to Premium.",
        variant: "destructive",
      });
      window.location.href = "/auth";
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to start checkout');
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    
    setPortalLoading(true);
    try {
      const response = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to open billing portal.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const isPremium = profile?.is_premium ?? false;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="premium" className="mb-4">
            <Zap className="h-3 w-3 mr-1" />
            Premium
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Upgrade Your Trading</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Get unlimited AI-powered chart analyses and unlock advanced features to make smarter trading decisions.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Free Plan */}
          <Card className="glass-card relative">
            <CardHeader>
              <CardTitle className="text-xl">Free Plan</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-6" disabled>
                {!isPremium ? "Current Plan" : "Free Plan"}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className={`glass-card relative ${isPremium ? 'border-emerald-500/50' : 'border-primary/50'} shadow-lg shadow-primary/20`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="premium" className="gap-1">
                <Crown className="h-3 w-3" />
                {isPremium ? "Your Plan" : "Most Popular"}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Premium
                <Crown className="h-5 w-5 text-amber-400" />
              </CardTitle>
              <CardDescription>For serious traders</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold gradient-text">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.premium.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {isPremium ? (
                <Button variant="outline" className="w-full mt-6" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Manage Subscription
                </Button>
              ) : (
                <Button variant="premium" className="w-full mt-6" onClick={handleUpgrade} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                  Upgrade to Premium
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Why Go Premium?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, title: "Advanced AI", desc: "Deeper pattern analysis" },
              { icon: BarChart3, title: "Multi-Timeframe", desc: "Analyze all timeframes" },
              { icon: Shield, title: "Risk Management", desc: "Auto SL/TP levels" },
              { icon: Clock, title: "Unlimited", desc: "No daily limits" },
            ].map((item, index) => (
              <Card key={index} className="glass-card text-center p-6">
                <item.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="glass-card px-4 border-border/50">
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}
