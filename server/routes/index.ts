import { Router } from 'express';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import {
  authLimiter,
  uploadLimiter,
  cpanelActionLimiter,
  subdomainCheckLimiter,
  adInteractionLimiter,
} from '../middleware/rateLimiter';

import * as authCtrl from '../controllers/authController';
import * as projectCtrl from '../controllers/projectController';
import * as deployCtrl from '../controllers/deploymentController';
import * as envCtrl from '../controllers/envController';
import * as domainCtrl from '../controllers/domainController';
import * as billingCtrl from '../controllers/billingController';
import * as adsCtrl from '../controllers/adsController';
import * as adminCtrl from '../controllers/adminController';
import * as fileCtrl from '../controllers/fileManagerController';
import * as fleetCtrl from '../controllers/cloudFleetController';

const router = Router();

// ================= AUTHENTICATION =================
router.post('/auth/register', authLimiter, authCtrl.register);
router.post('/auth/login', authLimiter, authCtrl.login);
router.post('/auth/refresh', authLimiter, authCtrl.refreshToken);
router.get('/auth/me', authenticateJwt, authCtrl.getCurrentUser);

// ================= PROJECTS =================
router.get('/projects', authenticateJwt, projectCtrl.listProjects);
router.get('/projects/telemetry', authenticateJwt, projectCtrl.getTelemetryAnalytics);
router.post('/projects', authenticateJwt, projectCtrl.createProject);
router.get('/projects/:id', authenticateJwt, projectCtrl.getProject);
router.patch('/projects/:id', authenticateJwt, projectCtrl.updateProject);
router.delete('/projects/:id', authenticateJwt, projectCtrl.deleteProject);

// ================= FILE MANAGER / CPANEL =================
router.get('/projects/:projectId/files', authenticateJwt, fileCtrl.listFiles);
router.get('/projects/:projectId/files/content', authenticateJwt, fileCtrl.getFileContent);
router.put('/projects/:projectId/files/content', authenticateJwt, cpanelActionLimiter, fileCtrl.saveFileContent);
router.post('/projects/:projectId/files/create', authenticateJwt, cpanelActionLimiter, fileCtrl.createFileOrFolder);
router.delete('/projects/:projectId/files', authenticateJwt, cpanelActionLimiter, fileCtrl.deleteFileOrFolder);
router.post('/projects/:projectId/files/rename', authenticateJwt, cpanelActionLimiter, fileCtrl.renameFileOrFolder);
router.post('/projects/:projectId/files/upload', authenticateJwt, uploadLimiter, uploadMiddleware.array('files', 50), fileCtrl.uploadIndividualFiles);
router.post('/projects/:projectId/files/extract', authenticateJwt, cpanelActionLimiter, fileCtrl.extractArchive);
router.post('/projects/:projectId/files/upload-and-extract', authenticateJwt, uploadLimiter, uploadMiddleware.single('file'), fileCtrl.uploadAndExtractArchive);
router.post('/projects/:projectId/files/compress', authenticateJwt, uploadLimiter, fileCtrl.compressFolderOrFiles);
router.post('/projects/:projectId/files/initialize-template', authenticateJwt, cpanelActionLimiter, fileCtrl.initializeTemplate);

// ================= DEPLOYMENTS =================
router.post(
  '/projects/:projectId/deploy',
  authenticateJwt,
  uploadLimiter,
  uploadMiddleware.single('file'),
  deployCtrl.uploadAndDeploy
);
router.get('/projects/:projectId/deployments', authenticateJwt, deployCtrl.listProjectDeployments);
router.get('/deployments/:deploymentId', authenticateJwt, deployCtrl.getDeployment);
router.get('/deployments/:deploymentId/logs', authenticateJwt, deployCtrl.getDeploymentLogs);
router.post('/deployments/:deploymentId/rollback', authenticateJwt, deployCtrl.rollbackDeployment);

// ================= ENVIRONMENT VARIABLES =================
router.get('/projects/:projectId/env', authenticateJwt, envCtrl.listEnvVars);
router.post('/projects/:projectId/env', authenticateJwt, envCtrl.setEnvVar);
router.delete('/projects/:projectId/env/:key', authenticateJwt, envCtrl.deleteEnvVar);

// ================= CUSTOM DOMAINS =================
router.post('/projects/:projectId/domains', authenticateJwt, domainCtrl.addCustomDomain);
router.post('/projects/:projectId/domains/verify', authenticateJwt, domainCtrl.verifyCustomDomain);
router.delete('/projects/:projectId/domains', authenticateJwt, domainCtrl.removeCustomDomain);

// ================= AUTOMATED SUBDOMAINS & PLATFORM DOMAINS =================
router.get('/domains/available', domainCtrl.getAvailableDomains);
router.get('/subdomains/check', subdomainCheckLimiter, domainCtrl.checkSubdomainAvailability);
router.post('/subdomains/assign', authenticateJwt, subdomainCheckLimiter, domainCtrl.assignSubdomain);
router.get('/subdomains/verify', subdomainCheckLimiter, domainCtrl.verifySubdomainDns);

// ================= AWS EC2 FLEET & AUTO-SPINUP (SECURED) =================
router.get('/fleet/nodes', authenticateJwt, fleetCtrl.listFleetNodes);
router.get('/fleet/nodes/:id', authenticateJwt, fleetCtrl.getNodeDetails);
router.post('/fleet/spinup', authenticateJwt, requireRole('ADMIN'), fleetCtrl.triggerSpinUpNode);
router.post('/fleet/check-storage-threshold', authenticateJwt, requireRole('ADMIN'), fleetCtrl.checkStorageThreshold);
router.post('/fleet/simulate-storage-full', authenticateJwt, requireRole('ADMIN'), fleetCtrl.simulateStorageFull);
router.get('/fleet/dns-status', authenticateJwt, fleetCtrl.getDnsStatus);

// ================= BILLING & PLANS =================
router.get('/billing/plans', billingCtrl.getPlans);
router.get('/billing/upi-details', billingCtrl.getUpiPaymentDetails);
router.post('/billing/upi-verify', authenticateJwt, billingCtrl.verifyUpiPayment);
router.post('/billing/checkout', authenticateJwt, billingCtrl.createCheckoutOrder);
router.post('/billing/verify', authenticateJwt, billingCtrl.verifyPaymentAndUpgrade);

// ================= ADVERTISEMENTS =================
router.get('/ads', adsCtrl.getAdsByPlacement);
router.post('/ads/:id/impression', adInteractionLimiter, adsCtrl.recordImpression);
router.post('/ads/:id/click', adInteractionLimiter, adsCtrl.recordClick);

// Admin Ads
router.get('/admin/ads', authenticateJwt, requireRole('ADMIN'), adsCtrl.listAllAds);
router.post('/admin/ads', authenticateJwt, requireRole('ADMIN'), adsCtrl.createAd);
router.patch('/admin/ads/:id/toggle', authenticateJwt, requireRole('ADMIN'), adsCtrl.toggleAdStatus);

// ================= ADMIN MANAGEMENT & MONITORING =================
router.get('/admin/monitoring', authenticateJwt, requireRole('ADMIN'), adminCtrl.getLiveMonitoringData);
router.get('/admin/stats', authenticateJwt, requireRole('ADMIN'), adminCtrl.getSystemStats);
router.get('/admin/projects', authenticateJwt, requireRole('ADMIN'), adminCtrl.listAllProjects);
router.delete('/admin/projects/:projectId', authenticateJwt, requireRole('ADMIN'), adminCtrl.adminDeleteProject);
router.patch('/admin/projects/:projectId/status', authenticateJwt, requireRole('ADMIN'), adminCtrl.adminToggleProjectStatus);
router.get('/admin/users', authenticateJwt, requireRole('ADMIN'), adminCtrl.listAllUsers);
router.patch('/admin/users/:userId', authenticateJwt, requireRole('ADMIN'), adminCtrl.updateUserPlanOrRole);
router.post('/admin/users/:userId/reset-password', authenticateJwt, requireRole('ADMIN'), adminCtrl.adminResetUserPassword);
router.delete('/admin/users/:userId', authenticateJwt, requireRole('ADMIN'), adminCtrl.adminDeleteUser);
router.post('/admin/prune-storage', authenticateJwt, requireRole('ADMIN'), adminCtrl.adminPruneStorage);
router.get('/admin/deployments', authenticateJwt, requireRole('ADMIN'), adminCtrl.listAllDeployments);
router.get('/admin/security-logs', authenticateJwt, requireRole('ADMIN'), adminCtrl.getSecurityLogs);
router.delete('/admin/security-logs', authenticateJwt, requireRole('ADMIN'), adminCtrl.clearSecurityLogs);

export default router;
