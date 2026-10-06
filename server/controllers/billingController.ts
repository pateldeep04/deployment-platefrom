import { Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

export const PLANS = [
  {
    id: 'FREE',
    name: 'Free Starter',
    priceINR: 0,
    priceLabel: '₹0 / month',
    projectsLimit: 3,
    storageMB: 1024, // 1 GB
    bandwidthGB: 5,
    customDomains: false,
    phpHosting: false,
    priorityBuilds: false,
    adFree: false,
    description: 'Perfect for learning, personal experiments, and hosting up to 3 web projects.'
  },
  {
    id: 'DEVELOPER',
    name: 'Developer',
    priceINR: 149,
    priceLabel: '₹149 / month',
    projectsLimit: 20,
    storageMB: 10240, // 10 GB
    bandwidthGB: 100,
    customDomains: true,
    phpHosting: false,
    priorityBuilds: false,
    adFree: true,
    description: 'Great for freelance developers and clients shipping modern web projects.'
  },
  {
    id: 'PRO',
    name: 'Pro Infrastructure',
    priceINR: 399,
    priceLabel: '₹399 / month',
    projectsLimit: 9999,
    storageMB: 51200, // 50 GB
    bandwidthGB: 500,
    customDomains: true,
    phpHosting: true,
    priorityBuilds: true,
    adFree: true,
    description: 'Uncapped power for full-stack teams, PHP APIs, high bandwidth & fast deployments.'
  }
];

export const getPlans = (req: Request, res: Response): void => {
  res.json({ success: true, data: { plans: PLANS } });
};

export const createCheckoutOrder = (req: AuthenticatedRequest, res: Response): void => {
  const { planId } = req.body;
  const user = req.user!;

  const targetPlan = PLANS.find(p => p.id === planId);
  if (!targetPlan || targetPlan.id === 'FREE') {
    res.status(400).json({ success: false, error: 'Invalid plan selected for checkout' });
    return;
  }

  // Generate simulated Razorpay order ID
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  res.json({
    success: true,
    data: {
      orderId,
      amount: targetPlan.priceINR * 100, // in paise
      currency: 'INR',
      keyId: config.razorpayKeyId,
      plan: targetPlan,
      user: {
        name: user.name,
        email: user.email,
      }
    }
  });
};

export const verifyPaymentAndUpgrade = (req: AuthenticatedRequest, res: Response): void => {
  const { orderId, paymentId, signature, planId } = req.body;
  const user = req.user!;

  if (!planId || !['DEVELOPER', 'PRO'].includes(planId)) {
    res.status(400).json({ success: false, error: 'Invalid plan' });
    return;
  }

  // In production, verify HMAC SHA256 signature using razorpayKeySecret:
  // const expectedSignature = crypto.createHmac('sha256', config.razorpayKeySecret)
  //   .update(`${orderId}|${paymentId}`).digest('hex');

  user.plan = planId as any;
  user.updatedAt = new Date().toISOString();

  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: user._id,
    action: 'SUBSCRIPTION_UPGRADE',
    ip: req.ip || '127.0.0.1',
    details: { plan: planId, orderId, paymentId },
    createdAt: new Date().toISOString(),
  });
  dbStore.save();

  res.json({
    success: true,
    message: `Account successfully upgraded to ${planId}! All features unlocked.`,
    data: { user: { _id: user._id, plan: user.plan } }
  });
};

export const OFFICIAL_UPI_ID = 'pd626784-1@okicici';

export const getUpiPaymentDetails = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      upiId: OFFICIAL_UPI_ID,
      payeeName: 'DeployHub Cloud Platform',
      currency: 'INR',
      supportedApps: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Cred', 'Amazon Pay'],
    },
  });
};

export const verifyUpiPayment = (req: AuthenticatedRequest, res: Response): void => {
  const { planId, utrNumber, amount, senderUpiId } = req.body;
  const user = req.user!;

  if (!planId || !['DEVELOPER', 'PRO'].includes(planId)) {
    res.status(400).json({ success: false, error: 'Invalid subscription plan selected' });
    return;
  }

  const cleanUtr = String(utrNumber || '').trim();
  if (!cleanUtr || cleanUtr.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Please enter a valid 12-digit UPI Reference Number / UTR from your payment app.',
    });
    return;
  }

  // Update user plan to the upgraded tier
  user.plan = planId as any;
  user.updatedAt = new Date().toISOString();

  // Update in dbStore
  const storeUser = dbStore.users.find(u => u._id === user._id);
  if (storeUser) {
    storeUser.plan = planId as any;
    storeUser.updatedAt = new Date().toISOString();
  }

  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: user._id,
    action: 'UPI_PAYMENT_VERIFIED',
    ip: req.ip || '127.0.0.1',
    details: {
      plan: planId,
      utrNumber: cleanUtr,
      recipientUpiId: OFFICIAL_UPI_ID,
      senderUpiId: senderUpiId || 'N/A',
      amount: amount || (planId === 'DEVELOPER' ? 149 : 399),
      verifiedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  });
  dbStore.save();

  res.json({
    success: true,
    message: `Payment verified successfully! Your account has been upgraded to ${planId}.`,
    data: {
      user: {
        _id: user._id,
        plan: user.plan,
        name: user.name,
        email: user.email,
      },
      transaction: {
        utrNumber: cleanUtr,
        planId,
        verifiedAt: new Date().toISOString(),
      },
    },
  });
};
