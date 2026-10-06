import { Request, Response } from 'express';
import { dbStore } from '../database/store';
import { awsFleetService } from '../services/awsFleetService';
import { namecheapService } from '../services/namecheapService';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

/**
 * Controller for AWS EC2 Fleet Management, storage-full auto-scaling, and Namecheap DNS monitoring.
 */

/**
 * GET /api/v1/fleet/nodes
 * Lists all server nodes in the AWS EC2 fleet with real-time storage metrics
 */
export const listFleetNodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const nodes = dbStore.serverNodes;

    const totalStorageBytes = nodes.reduce((sum, n) => sum + n.storageTotalBytes, 0);
    const totalUsedBytes = nodes.reduce((sum, n) => sum + n.storageUsedBytes, 0);
    const overallUsagePercent =
      totalStorageBytes > 0
        ? Math.round((totalUsedBytes / totalStorageBytes) * 1000) / 10
        : 0;

    res.json({
      success: true,
      data: {
        nodes,
        summary: {
          totalNodes: nodes.length,
          activeNodes: nodes.filter((n) => n.status === 'RUNNING').length,
          freeTierEligibleCount: nodes.filter((n) => n.instanceType === 't2.micro' || n.instanceType === 't3.micro').length,
          totalStorageGb: Math.round(totalStorageBytes / (1024 * 1024 * 1024)),
          totalUsedGb: Math.round((totalUsedBytes / (1024 * 1024 * 1024)) * 10) / 10,
          overallUsagePercent,
          autoSpinupThresholdPercent: config.awsAutoSpinupThresholdPercent,
          isRealAwsConfigured: awsFleetService.isRealAwsConfigured(),
          currentAwsRegion: config.awsRegion,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list fleet nodes' });
  }
};

/**
 * GET /api/v1/fleet/nodes/:id
 * Detailed metrics for a single node including assigned projects
 */
export const getNodeDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const node = dbStore.serverNodes.find((n) => n._id === id || n.instanceId === id);

    if (!node) {
      res.status(404).json({ success: false, error: 'Server node not found' });
      return;
    }

    const assignedProjects = dbStore.projects.filter((p) => p.assignedServerNodeId === node._id);

    res.json({
      success: true,
      data: {
        node,
        assignedProjects: assignedProjects.map((p) => ({
          id: p._id,
          name: p.name,
          slug: p.slug,
          subdomain: p.assignedSubdomain ? `${p.assignedSubdomain}.${config.platformDomain}` : `${p.slug}.${config.platformDomain}`,
          storageUsedMb: Math.round(p.storageUsed / (1024 * 1024)),
          status: p.status,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to get node details' });
  }
};

/**
 * POST /api/v1/fleet/spinup
 * Manually or programmatically triggers spinup of an AWS Free Tier (t2.micro) EC2 instance
 */
export const triggerSpinUpNode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reason = req.body.reason || 'MANUAL_OPERATOR_REQUEST';
    const result = await awsFleetService.spinUpNewFreeTierNode(reason);

    res.json({
      success: true,
      message: result.message,
      data: {
        node: result.node,
        isRealAwsCall: result.isRealAwsCall,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to spin up node' });
  }
};

/**
 * POST /api/v1/fleet/check-storage-threshold
 * Evaluates current storage. If >= 85%, automatically spins up a new server node.
 */
export const checkStorageThreshold = async (req: Request, res: Response): Promise<void> => {
  try {
    const nodeId = req.body.nodeId as string | undefined;
    const result = await awsFleetService.checkNodeStorageThreshold(nodeId);

    res.json({
      success: true,
      data: {
        nodeName: result.node.name,
        currentUsagePercent: result.usagePercent,
        thresholdPercent: result.thresholdPercent,
        shouldSpinUp: result.shouldSpinUp,
        newlySpawnedNode: result.newlySpawnedNode,
        message: result.shouldSpinUp
          ? `Storage capacity reached (${result.usagePercent}%). Automatically spun up new AWS Free Tier server node: ${result.newlySpawnedNode?.instanceId}!`
          : `Storage within normal operating limits (${result.usagePercent}% < ${result.thresholdPercent}%).`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to check storage threshold' });
  }
};

/**
 * POST /api/v1/fleet/simulate-storage-full
 * Demonstration & testing endpoint:
 * Fills node storage to 88% capacity, immediately auto-triggering a new AWS Free Tier server launch.
 */
export const simulateStorageFull = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nodeId, targetPercent = 88 } = req.body;
    const result = await awsFleetService.simulateStorageFull(nodeId, targetPercent);

    res.json({
      success: true,
      message: `Simulated storage full at ${result.newPercent}% on node. Automatic AWS Free Tier spinup successfully triggered!`,
      data: {
        previousPercent: result.previousPercent,
        newPercent: result.newPercent,
        spawnedNode: result.autoSpawnResult.node,
        isRealAwsCall: result.autoSpawnResult.isRealAwsCall,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to simulate storage full' });
  }
};

/**
 * GET /api/v1/fleet/dns-status
 * Lists all active Namecheap DNS host records and configuration status
 */
export const getDnsStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const hosts = namecheapService.getAllDomainHosts();
    const isConfigured = namecheapService.isConfigured();
    const rootDomain = namecheapService.getRootDomain();

    res.json({
      success: true,
      data: {
        rootDomain,
        isConfigured,
        useSandbox: config.namecheapUseSandbox,
        totalHostRecords: hosts.length,
        hosts: hosts.map((h) => ({
          hostName: h.hostName,
          recordType: h.recordType,
          address: h.address,
          ttl: h.ttl,
          fullDomain: h.hostName === '@' ? rootDomain : `${h.hostName}.${rootDomain}`,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to get DNS status' });
  }
};
