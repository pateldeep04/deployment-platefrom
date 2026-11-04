import { Request, Response } from 'express';
import { dbStore, IPayment } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';

export const getDynamicPlans = () => {
  const devPrice = dbStore.settings?.developerPriceINR ?? 30;
  const proPrice = dbStore.settings?.proPriceINR ?? 399;

  return [
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
      description: 'Ad-supported free cloud hosting for up to 3 web projects. Displays sponsored banner on hosted sites.'
    },
    {
      id: 'DEVELOPER',
      name: 'Developer',
      priceINR: devPrice,
      priceLabel: `₹${devPrice} / month`,
      projectsLimit: 20,
      storageMB: 10240, // 10 GB
      bandwidthGB: 100,
      customDomains: true,
      phpHosting: false,
      priorityBuilds: false,
      adFree: true,
      description: 'Zero ads on hosted sites! Great for freelance developers shipping client web projects.'
    },
    {
      id: 'PRO',
      name: 'Pro Infrastructure',
      priceINR: proPrice,
      priceLabel: `₹${proPrice} / month`,
      projectsLimit: 9999,
      storageMB: 51200, // 50 GB
      bandwidthGB: 500,
      customDomains: true,
      phpHosting: true,
      priorityBuilds: true,
      adFree: true,
      description: 'Zero ads, uncapped power for full-stack teams, PHP APIs, high bandwidth & fast deployments.'
    }
  ];
};

export const PLANS = getDynamicPlans();

export const getPlans = (req: Request, res: Response): void => {
  res.json({ success: true, data: { plans: getDynamicPlans(), settings: dbStore.settings } });
};

export const OFFICIAL_UPI_ID = process.env.MERCHANT_UPI_VPA || 'pd626784-1@okicici';

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

/**
 * POST /api/v1/billing/upi/submit-utr
 * Section 9: Submits 12-digit UTR for administrative verification
 */
export const submitUpiPayment = (req: AuthenticatedRequest, res: Response): void => {
  const { planId, utrNumber, amount, senderUpiId } = req.body;
  const user = req.user!;

  if (!planId || !['DEVELOPER', 'PRO'].includes(planId)) {
    res.status(400).json({ success: false, error: 'Invalid subscription plan selected' });
    return;
  }

  const cleanUtr = String(utrNumber || '').replace(/\D/g, '').trim();
  if (cleanUtr.length !== 12) {
    res.status(400).json({
      success: false,
      error: 'Please enter a valid 12-digit UPI Reference Number / UTR from your payment app.',
    });
    return;
  }

  // Section 8 Constraints: UNIQUE(payments.utr)
  dbStore.payments = dbStore.payments || [];
  const existingPayment = dbStore.payments.find(p => p.utr === cleanUtr);
  if (existingPayment) {
    res.status(409).json({
      success: false,
      error: `UTR ${cleanUtr} has already been registered on DeployHub. Each transaction reference can only be submitted once.`,
    });
    return;
  }

  const expectedAmount = planId === 'DEVELOPER'
    ? (dbStore.settings?.developerPriceINR || 30)
    : (dbStore.settings?.proPriceINR || 399);

  const newPayment: IPayment = {
    _id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user._id,
    userEmail: user.email,
    userName: user.name,
    plan: planId as 'DEVELOPER' | 'PRO',
    amountINR: Number(amount) || expectedAmount,
    utr: cleanUtr,
    senderUpiId: senderUpiId || undefined,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbStore.payments.push(newPayment);

  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: user._id,
    action: 'UPI_PAYMENT_SUBMITTED_PENDING_APPROVAL',
    ip: req.ip || '127.0.0.1',
    details: {
      paymentId: newPayment._id,
      plan: planId,
      utr: cleanUtr,
      amountINR: newPayment.amountINR,
    },
    createdAt: new Date().toISOString(),
  });

  dbStore.save();

  res.status(201).json({
    success: true,
    message: `Payment submitted successfully! Your 12-digit UTR (#${cleanUtr}) is queued for administrative verification. Your ${planId} tier will be activated upon confirmation.`,
    data: {
      payment: newPayment,
    },
  });
};

// Backwards-compatible alias for frontend
export const verifyUpiPayment = submitUpiPayment;

/**
 * GET /api/v1/billing/history
 * Returns payment and transaction history for authenticated user
 */
export const getBillingHistory = (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const userPayments = (dbStore.payments || []).filter(p => p.userId === user._id);
  res.json({
    success: true,
    data: {
      payments: userPayments.slice().reverse(),
    },
  });
};

/**
 * GET /api/v1/admin/payments
 * Lists all pending, approved, and rejected payments for administrators
 */
export const listAdminPayments = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      payments: (dbStore.payments || []).slice().reverse(),
    },
  });
};

/**
 * PATCH /api/v1/admin/payments/:paymentId
 * Admin approves or rejects a submitted UPI payment (Section 9)
 */
export const reviewPayment = (req: AuthenticatedRequest, res: Response): void => {
  const { paymentId } = req.params;
  const { status, adminNotes } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    res.status(400).json({ success: false, error: "Status must be either 'APPROVED' or 'REJECTED'" });
    return;
  }

  const payment = (dbStore.payments || []).find(p => p._id === paymentId || p.utr === paymentId);
  if (!payment) {
    res.status(404).json({ success: false, error: 'Payment transaction record not found' });
    return;
  }

  payment.status = status;
  payment.reviewedBy = req.user?.email || 'admin';
  payment.reviewedAt = new Date().toISOString();
  payment.adminNotes = adminNotes || payment.adminNotes;
  payment.updatedAt = new Date().toISOString();

  // If approved, upgrade target user and set 30-day plan expiration
  if (status === 'APPROVED') {
    const targetUser = dbStore.users.find(u => u._id === payment.userId);
    if (targetUser) {
      targetUser.plan = payment.plan;
      targetUser.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      targetUser.updatedAt = new Date().toISOString();
    }
  }

  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: req.user!._id,
    action: `ADMIN_PAYMENT_${status}`,
    ip: req.ip || '127.0.0.1',
    details: {
      paymentId: payment._id,
      utr: payment.utr,
      plan: payment.plan,
      targetUserId: payment.userId,
      status,
    },
    createdAt: new Date().toISOString(),
  });

  dbStore.save();

  res.json({
    success: true,
    message: `Payment #${payment.utr} has been ${status.toLowerCase()} successfully.`,
    data: { payment },
  });
};
