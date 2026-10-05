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
    storageMB: 500,
    bandwidthGB: 5,
    customDomains: false,
    phpHosting: false,
    priorityBuilds: false,
    adFree: false,
    description: 'Perfect for learning, personal experiments, and small static portfolios.'
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
