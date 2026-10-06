import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { IPlan } from '../types';
import { 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Copy,
  CheckCheck,
  ExternalLink,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';

const OFFICIAL_UPI_ID = 'pd626784-1@okicici';

export const BillingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<IPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // UPI State
  const [selectedUpiPlanId, setSelectedUpiPlanId] = useState<'DEVELOPER' | 'PRO'>('DEVELOPER');
  const [utrNumber, setUtrNumber] = useState('');
  const [senderUpiId, setSenderUpiId] = useState('');
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  
  const upiSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/billing/plans')
      .then((res) => {
        if (res.data.success) {
          setPlans(res.data.data.plans);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(OFFICIAL_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2200);
  };

  const handleSelectPlanForUpi = (planId: 'DEVELOPER' | 'PRO') => {
    setSelectedUpiPlanId(planId);
    setUpiError(null);
    if (upiSectionRef.current) {
      upiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleVerifyUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError(null);

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setUpiError('Please enter the 12-digit UPI Reference Number (UTR) from your payment app.');
      return;
    }
    if (cleanUtr.length < 8) {
      setUpiError('Invalid UTR number. UPI reference numbers typically contain 12 digits.');
      return;
    }

    try {
      setIsVerifyingUpi(true);
      const targetPlan = plans.find(p => p.id === selectedUpiPlanId);
      const amount = targetPlan ? targetPlan.priceINR : (selectedUpiPlanId === 'DEVELOPER' ? 149 : 399);

      const res = await api.post('/billing/upi-verify', {
        planId: selectedUpiPlanId,
        utrNumber: cleanUtr,
        amount,
        senderUpiId: senderUpiId.trim() || undefined,
      });

      if (res.data.success) {
        setSuccessMsg(`🎉 Payment verified! Your account has been upgraded to ${selectedUpiPlanId} Plan.`);
        setUtrNumber('');
        setSenderUpiId('');
        await refreshUser();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setUpiError(res.data.error || 'Verification failed. Please double check your UTR number.');
      }
    } catch (err: any) {
      setUpiError(err.response?.data?.error || err.message || 'Payment verification failed');
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleUpgrade = async (plan: IPlan) => {
    handleSelectPlanForUpi(plan.id as 'DEVELOPER' | 'PRO');
  };

  const activeUpiPlan = plans.find(p => p.id === selectedUpiPlanId) || {
    id: selectedUpiPlanId,
    name: selectedUpiPlanId === 'DEVELOPER' ? 'Developer' : 'Pro Infrastructure',
    priceINR: selectedUpiPlanId === 'DEVELOPER' ? 149 : 399,
  };

  const upiPaymentUri = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=DeployHub%20Cloud&am=${activeUpiPlan.priceINR}&cu=INR&tn=${encodeURIComponent(`DeployHub ${activeUpiPlan.name} Subscription`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(upiPaymentUri)}`;

  return (
    <div className="min-h-screen bg-background text-deployText pb-16">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DeployHub Subscriptions & Instant UPI Payments</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Upgrade Your Deployment Power</h1>
          <p className="text-xs sm:text-sm text-deployText-secondary">
            Current Active Plan: <strong className="text-white uppercase font-bold">{user?.plan} PLAN</strong>
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-success/15 border border-success/30 text-success text-xs sm:text-sm flex items-center space-x-2.5 max-w-xl mx-auto shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {plans.map((p) => {
            const isCurrent = user?.plan === p.id;
            const isDev = p.id === 'DEVELOPER';
            const isPro = p.id === 'PRO';

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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
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
                      <span>{p.phpHosting ? 'Isolated PHP 8.4 Runtime' : 'Static / React / Vite'}</span>
                    </li>
                    <li className="flex items-center space-x-2.5">
                      <Check className="w-4 h-4 text-success" />
                      <span>{p.adFree ? 'Ad-Free Dashboard' : 'Dashboard Ads'}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 space-y-2">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-surface border border-deployBorder text-deployText-muted text-xs font-semibold cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : p.id === 'FREE' ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-surface border border-deployBorder text-deployText-muted text-xs font-semibold cursor-default"
                    >
                      Default Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectPlanForUpi(p.id as 'DEVELOPER' | 'PRO')}
                      className={`w-full py-2.5 rounded-xl text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isDev ? 'bg-primary hover:bg-primary-hover' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pay via UPI (₹{p.priceINR})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= INSTANT UPI PAYMENT SECTION ================= */}
        <section 
          ref={upiSectionRef} 
          className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            
            {/* UPI Header & App Badges */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-deployBorder pb-6">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-accent tracking-wide uppercase mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Instant UPI Checkout & QR Verification</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Pay via UPI (GPay / PhonePe / Paytm / BHIM)
                </h2>
                <p className="text-xs sm:text-sm text-deployText-secondary mt-1">
                  Zero gateway fees. Scan with any UPI application or pay directly to the verified UPI ID.
                </p>
              </div>

              {/* Supported UPI Apps Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-surface border border-deployBorder text-[11px] font-semibold text-white">Google Pay</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface border border-deployBorder text-[11px] font-semibold text-white">PhonePe</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface border border-deployBorder text-[11px] font-semibold text-white">Paytm</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface border border-deployBorder text-[11px] font-semibold text-white">BHIM</span>
                <span className="px-2.5 py-1 rounded-lg bg-surface border border-deployBorder text-[11px] font-semibold text-white">Cred</span>
              </div>
            </div>

            {/* Plan Selector Radio Buttons */}
            <div>
              <label className="text-xs font-bold text-white block mb-3 uppercase tracking-wider">
                1. Select Subscription Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedUpiPlanId('DEVELOPER')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedUpiPlanId === 'DEVELOPER'
                      ? 'bg-primary/15 border-primary shadow-glow-primary'
                      : 'bg-surface border-deployBorder hover:border-deployBorder-hover'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm">Developer Plan</div>
                    <div className="text-xs text-deployText-secondary mt-0.5">20 Projects • 10 GB Storage • Custom Domains</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-accent">₹149</div>
                    <div className="text-[10px] text-deployText-muted">per month</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUpiPlanId('PRO')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedUpiPlanId === 'PRO'
                      ? 'bg-primary/15 border-primary shadow-glow-primary'
                      : 'bg-surface border-deployBorder hover:border-deployBorder-hover'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm">Pro Infrastructure Plan</div>
                    <div className="text-xs text-deployText-secondary mt-0.5">Unlimited Projects • 50 GB Storage • PHP 8.4 Isolated</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-accent">₹399</div>
                    <div className="text-[10px] text-deployText-muted">per month</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Grid: QR Code & Verification Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
              
              {/* Left Column: QR Code Container */}
              <div className="lg:col-span-5 bg-surface border border-deployBorder rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-inner">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan to Pay ₹{activeUpiPlan.priceINR}</span>
                </div>

                {/* White Background Container for QR Image */}
                <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center border-4 border-emerald-400/30">
                  <img 
                    src={qrCodeUrl} 
                    alt={`UPI QR Code for ${OFFICIAL_UPI_ID}`} 
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                </div>

                <div className="text-xs text-deployText-secondary leading-relaxed">
                  Scan this QR code with <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any banking UPI app to transfer <strong>₹{activeUpiPlan.priceINR}</strong>.
                </div>

                {/* Direct Mobile Deep Link Button */}
                <a
                  href={upiPaymentUri}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Tap to Open in Installed UPI App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Right Column: UPI ID Copy Box & UTR Verification Form */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 2. Official UPI ID Copy Box */}
                <div className="bg-surface border border-deployBorder rounded-2xl p-5 space-y-3">
                  <div className="text-xs font-bold text-deployText-secondary uppercase tracking-wider">
                    2. Official Merchant UPI ID
                  </div>
                  
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-deployBorder">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                        UPI
                      </div>
                      <div>
                        <div className="font-mono text-base font-bold text-white tracking-wide">
                          {OFFICIAL_UPI_ID}
                        </div>
                        <div className="text-[11px] text-deployText-secondary">
                          Payee: DeployHub Cloud • ICICI Bank
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedUpi ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. UTR Reference Submission Form */}
                <form onSubmit={handleVerifyUpiPayment} className="bg-surface border border-deployBorder rounded-2xl p-5 space-y-4">
                  <div className="text-xs font-bold text-deployText-secondary uppercase tracking-wider">
                    3. Submit Transaction Reference (UTR) for Instant Activation
                  </div>

                  {upiError && (
                    <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{upiError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white flex items-center justify-between">
                      <span>12-Digit UPI Reference Number / UTR</span>
                      <span className="text-[11px] text-accent font-normal">Found in your payment receipt</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 428192019284 or 202610061928"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      maxLength={24}
                      className="w-full bg-card border border-deployBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-deployText-muted font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-deployText-secondary">
                      Your Sender UPI ID <span className="text-deployText-muted">(Optional, for cross-matching)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                      value={senderUpiId}
                      onChange={(e) => setSenderUpiId(e.target.value)}
                      className="w-full bg-card border border-deployBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-deployText-muted font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingUpi}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-glow-primary flex items-center justify-center space-x-2 cursor-pointer mt-2"
                  >
                    {isVerifyingUpi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying UPI Transaction with Bank...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Verify UTR & Activate {activeUpiPlan.name} (₹{activeUpiPlan.priceINR})</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-deployText-muted text-center leading-normal">
                    🔒 Verification checks the UTR timestamp and instantly applies your tier privileges to your account.
                  </p>
                </form>

              </div>
            </div>

          </div>
        </section>

        {/* Security / Compliance Notice */}
        <div className="p-4 rounded-xl bg-card border border-deployBorder flex items-center justify-between text-xs text-deployText-secondary">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
            <span>
              All transactions are encrypted with 256-bit SSL. Merchant VPA: <code className="text-white font-mono">{OFFICIAL_UPI_ID}</code>.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-emerald-400 font-semibold">
            ● UPI Instant Gateway Ready
          </span>
        </div>

      </main>
    </div>
  );
};
export default BillingPage;
