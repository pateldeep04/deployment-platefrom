import { Request, Response } from 'express';
import { dbStore, ISupportRequest, IAbuseReport } from '../database/store';
import { supportRequestSchema, reportAbuseSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * POST /api/v1/support/request
 * Allows visitors or registered users to submit domain requests or support queries.
 */
export const submitSupportRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = supportRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { name, email, type, domainName, subject, message } = parseResult.data;

    // Check optional authenticated user
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const { config } = require('../config');
        const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
        userId = payload.userId;
      } catch {}
    }

    // Generate human-friendly reference ticket number (e.g. REQ-2026-94812)
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const ticketNumber = `REQ-2026-${randomCode}`;

    const newRequest: ISupportRequest = {
      _id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber,
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      type,
      domainName: domainName ? domainName.trim().toLowerCase() : undefined,
      subject: subject.trim(),
      message: message.trim(),
      status: 'OPEN',
      ip: (req.ip || req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.supportRequests.push(newRequest);

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: userId || 'GUEST',
      action: 'SUPPORT_REQUEST_SUBMITTED',
      ip: newRequest.ip,
      details: {
        ticketNumber,
        type,
        email: newRequest.email,
        domainName: newRequest.domainName,
      },
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    console.log(`[Support Dispatcher] New Ticket #${ticketNumber} created by ${newRequest.email} [${type}]`);

    res.status(201).json({
      success: true,
      message: `Your request has been securely submitted! Our team will review it within 24 hours.`,
      data: {
        ticketNumber,
        type: newRequest.type,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
};

/**
 * GET /api/v1/support/requests
 * Admin-only: list all domain and support requests
 */
export const listSupportRequests = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      requests: dbStore.supportRequests.slice().reverse(),
    },
  });
};

/**
 * GET /api/v1/support/status/:ticketNumber
 * Public endpoint to check status of a submitted ticket
 */
export const getTicketStatus = (req: Request, res: Response): void => {
  const ticketNumber = (req.params.ticketNumber as string || '').toUpperCase();
  const ticket = dbStore.supportRequests.find(
    r => r.ticketNumber.toUpperCase() === ticketNumber
  );

  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket reference not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ticketNumber: ticket.ticketNumber,
      type: ticket.type,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
    },
  });
};

/**
 * POST /api/v1/abuse/report
 * Public Abuse & Malware Takedown reporting endpoint (Section 2)
 */
export const submitAbuseReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = reportAbuseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { targetUrlOrDomain, category, reporterEmail, description, evidenceUrl } = parseResult.data;
    const reportNumber = `ABUSE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', '');

    const newReport: IAbuseReport = {
      _id: `abuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reportNumber,
      targetUrlOrDomain: targetUrlOrDomain.trim(),
      category,
      reporterEmail: reporterEmail.trim().toLowerCase(),
      description: description.trim(),
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : undefined,
      ip: clientIp,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.abuseReports = dbStore.abuseReports || [];
    dbStore.abuseReports.push(newReport);

    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: 'ANONYMOUS_REPORTER',
      action: 'ABUSE_REPORT_FILED',
      ip: clientIp,
      details: {
        reportNumber,
        target: targetUrlOrDomain,
        category,
      },
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    console.log(`[Trust & Safety] Abuse Report #${reportNumber} received for '${targetUrlOrDomain}' [${category}]`);

    res.status(201).json({
      success: true,
      message: 'Abuse report received. DeployHub Trust & Safety reviews confirmed phishing and malware within 24 hours.',
      data: {
        reportNumber,
        targetUrlOrDomain: newReport.targetUrlOrDomain,
        status: newReport.status,
        createdAt: newReport.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit abuse report' });
  }
};

/**
 * GET /api/v1/admin/abuse-reports
 * Lists all filed abuse reports for platform admins
 */
export const listAbuseReports = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      reports: (dbStore.abuseReports || []).slice().reverse(),
    },
  });
};

/**
 * PATCH /api/v1/admin/abuse-reports/:reportId
 * Resolves or updates an abuse report
 */
export const updateAbuseReport = (req: AuthenticatedRequest, res: Response): void => {
  const { reportId } = req.params;
  const { status, actionTaken } = req.body;
  const report = (dbStore.abuseReports || []).find(r => r._id === reportId || r.reportNumber === reportId);

  if (!report) {
    res.status(404).json({ success: false, error: 'Abuse report not found' });
    return;
  }

  if (status) report.status = status;
  if (actionTaken) report.actionTaken = actionTaken;
  report.resolvedBy = req.user?.email || 'admin';
  report.resolvedAt = new Date().toISOString();
  report.updatedAt = new Date().toISOString();

  dbStore.auditLogs.push({
    _id: `log_${Date.now()}`,
    userId: req.user?._id,
    action: 'ABUSE_REPORT_UPDATED',
    ip: req.ip || '127.0.0.1',
    details: {
      reportId: report._id,
      reportNumber: report.reportNumber,
      status: report.status,
      actionTaken: report.actionTaken,
    },
    createdAt: new Date().toISOString(),
  });

  dbStore.save();

  res.json({
    success: true,
    message: 'Abuse report updated successfully',
    data: { report },
  });
};
