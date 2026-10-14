import mongoose from 'mongoose';
import { dbStore } from './store';

/**
 * Transfers all local state (users, projects, deployments, nodes, settings)
 * directly into your MongoDB Atlas cloud database.
 */
export async function transferDataToMongo(): Promise<{ success: boolean; transferred: Record<string, number>; message: string }> {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Please verify your MongoDB Atlas URI.');
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB database handle is unavailable.');
  }

  const transferred: Record<string, number> = {};

  const collectionsToSync: Array<{ name: string; data: any[] }> = [
    { name: 'users', data: dbStore.users },
    { name: 'projects', data: dbStore.projects },
    { name: 'deployments', data: dbStore.deployments },
    { name: 'envVars', data: dbStore.envVars },
    { name: 'ads', data: dbStore.ads },
    { name: 'auditLogs', data: dbStore.auditLogs },
    { name: 'serverNodes', data: dbStore.serverNodes },
    { name: 'trafficLogs', data: dbStore.trafficLogs },
    { name: 'supportRequests', data: dbStore.supportRequests },
  ];

  for (const item of collectionsToSync) {
    const col = db.collection(item.name);
    if (item.data && item.data.length > 0) {
      for (const doc of item.data) {
        const queryId = doc._id || doc.id;
        if (queryId) {
          await col.updateOne({ _id: queryId }, { $set: doc }, { upsert: true });
        } else {
          await col.insertOne(doc);
        }
      }
      transferred[item.name] = item.data.length;
    } else {
      transferred[item.name] = 0;
    }
  }

  // Sync settings
  const settingsCol = db.collection('settings');
  await settingsCol.updateOne(
    { _id: 'platform_settings' as any },
    { $set: { _id: 'platform_settings', ...dbStore.settings, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  transferred['settings'] = 1;

  console.log('[DeployHub MongoDB Transfer] Successfully transferred local state to MongoDB Atlas:', transferred);

  return {
    success: true,
    transferred,
    message: 'All local accounts, projects, and settings successfully migrated to global MongoDB Atlas!',
  };
}

/**
 * Automatically pull latest data from MongoDB Atlas if it exists, or push if empty.
 */
export async function syncOnStartup(): Promise<void> {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    const remoteUserCount = await db.collection('users').countDocuments();
    if (remoteUserCount === 0 && dbStore.users.length > 0) {
      console.log('[DeployHub MongoDB] Remote Atlas database is empty. Pushing initial local state...');
      await transferDataToMongo();
    } else if (remoteUserCount > 0) {
      console.log(`[DeployHub MongoDB] Syncing ${remoteUserCount} users from MongoDB Atlas into active runtime...`);
      const remoteUsers = (await db.collection('users').find({}).toArray()) as any[];
      const remoteProjects = (await db.collection('projects').find({}).toArray()) as any[];
      const remoteDeployments = (await db.collection('deployments').find({}).toArray()) as any[];

      if (remoteUsers.length > 0) {
        dbStore.users = remoteUsers;
      }
      if (remoteProjects.length > 0) {
        dbStore.projects = remoteProjects;
      }
      if (remoteDeployments.length > 0) {
        dbStore.deployments = remoteDeployments;
      }
      dbStore.save();
    }
  } catch (err: any) {
    console.warn('[DeployHub MongoDB Sync] Could not sync with MongoDB Atlas:', err.message);
  }
}
