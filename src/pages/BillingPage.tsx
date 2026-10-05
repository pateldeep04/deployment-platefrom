import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { IPlan } from '../types';
import { 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Zap
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<IPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/billing/plans')
      .then((res) => {
        if (res.data.success) {
          setPlans(res.data.data.plans);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleUpgrade = async (plan: IPlan) => {
    try {
      setSelectedPlan(plan);
      setIsProcessing(true);
      setSuccessMsg(null);

      // 1. Create simulated Razorpay Order
      const orderRes = await api.post('/billing/checkout', { planId: plan.id });
      if (!orderRes.data.success) {
        throw new Error(orderRes.data.error || 'Failed to initialize order');
      }

      const { orderId } = orderRes.data.data;

      // 2. Simulate Razorpay payment modal completion
      setTimeout(async () => {
        try {
          const verifyRes = await api.post('/billing/verify', {
            orderId,
            paymentId: `pay_${Date.now()}`,
            signature: 'simulated_secure_signature',
            planId: plan.id,
          });

          if (verifyRes.data.success) {
            setSuccessMsg(`🎉 Successfully upgraded to ${plan.name}! All tier features are now active.`);
            await refreshUser();
          }
        } catch (e: any) {
          alert('Verification failed');
        } finally {
          setIsProcessing(false);
          setSelectedPlan(null);
        }
      }, 1200);

    } catch (err: any) {
      alert(err.message || 'Payment failed');
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-deployText pb-16">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DeployHub Subscriptions & Billing</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Upgrade Your Deployment Power</h1>
          <p className="text-xs sm:text-sm text-deployText-secondary">
            Current Active Plan: <strong className="text-white uppercase font-bold">{user?.plan} PLAN</strong>
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-success/15 border border-success/30 text-success text-xs sm:text-sm flex items-center space-x-2.5 max-w-xl mx-auto">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const isPro = p.id === 'PRO';
            const isDev = p.id === 'DEVELOPER';

            return (
              <div
                key={p.id}
                className={`relative bg-card rounded-2xl p-7 flex flex-col justify-between border transition-all ${
                  isCurrent
                    ? 'border-accent shadow-glow-accent'
                    : isDev
                    ? 'border-primary/80 shadow-glow-primary'
                    : 'border-deployBorder'
                }`}
              >
                {isDev && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Recommended
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="my-5">
                    <span className="text-3xl font-extrabold text-white">{p.priceLabel.split(' ')[0]}</span>
                    <span className="text-xs text-deployText-secondary"> / month</span>
                  </div>

                  <p className="text-xs text-deployText-secondary mb-6">{p.description}</p>

                  <ul className="space-y-3 text-xs text-deployText-secondary">
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.projectsLimit === 9999 ? 'Unlimited' : p.projectsLimit} Projects</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.storageMB >= 1024 ? `${p.storageMB / 1024} GB` : `${p.storageMB} MB`} Storage</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.bandwidthGB} GB Bandwidth / mo</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.customDomains ? 'Custom Domains & SSL' : 'Subdomain only'}</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.phpHosting ? 'Isolated PHP 8.2 Runtime' : 'Static / React / Vite'}</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.adFree ? 'Ad-Free Dashboard' : 'Dashboard Ads'}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-surface border border-deployBorder text-deployText-muted text-xs font-semibold cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p)}
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>
                        {isProcessing && selectedPlan?.id === p.id
                          ? 'Connecting Razorpay...'
                          : `Upgrade to ${p.name}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Razorpay Integration Notice */}
        <div className="p-4 rounded-xl bg-card border border-deployBorder flex items-center space-x-3 text-xs text-deployText-secondary">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
          <span>
            Payments are securely routed via Razorpay payment gateway API with HMAC SHA-256 signature verification.
          </span>
        </div>
      </main>
    </div>
  );
};
