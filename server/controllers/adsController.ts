import { Request, Response } from 'express';
import { dbStore, IAdvertisement } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAdSchema } from '../validators';

export const getAdsByPlacement = (req: Request, res: Response): void => {
  const { placement } = req.query;
  let activeAds = dbStore.ads.filter(a => a.status === 'ACTIVE');

  if (placement) {
    activeAds = activeAds.filter(a => a.placement === placement);
  }

  // Shuffle or return random ad
  const selected = activeAds.length > 0 ? activeAds[Math.floor(Math.random() * activeAds.length)] : null;
  res.json({ success: true, data: { ad: selected } });
};

export const recordImpression = (req: Request, res: Response): void => {
  const { id } = req.params;
  const ad = dbStore.ads.find(a => a._id === id);
  if (ad) {
    ad.impressions++;
    dbStore.save();
  }
  res.json({ success: true });
};

export const recordClick = (req: Request, res: Response): void => {
  const { id } = req.params;
  const ad = dbStore.ads.find(a => a._id === id);
  if (ad) {
    ad.clicks++;
    dbStore.save();
  }
  res.json({ success: true });
};

// Admin endpoints
export const listAllAds = (req: AuthenticatedRequest, res: Response): void => {
  const adsWithCtr = dbStore.ads.map(ad => ({
    ...ad,
    ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + '%' : '0.00%',
  }));
  res.json({ success: true, data: { ads: adsWithCtr } });
};

export const createAd = (req: AuthenticatedRequest, res: Response): void => {
  const parseResult = createAdSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  const newAd: IAdvertisement = {
    _id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...parseResult.data,
    impressions: 0,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  dbStore.ads.push(newAd);
  dbStore.save();

  res.status(201).json({ success: true, data: { ad: newAd } });
};

export const toggleAdStatus = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const ad = dbStore.ads.find(a => a._id === id);
  if (!ad) {
    res.status(404).json({ success: false, error: 'Ad not found' });
    return;
  }

  ad.status = ad.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  dbStore.save();
  res.json({ success: true, data: { ad } });
};
