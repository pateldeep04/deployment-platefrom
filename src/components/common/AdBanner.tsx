import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { IAdvertisement } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ExternalLink, Tag } from 'lucide-react';

interface AdBannerProps {
  placement?: 'DASHBOARD' | 'PROJECT_PAGE' | 'DOCUMENTATION' | 'PUBLIC_WEBSITE';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ placement = 'DASHBOARD', className = '' }) => {
  const { user } = useAuth();
  const [ad, setAd] = useState<IAdvertisement | null>(null);

  // If user is on a paid plan (DEVELOPER or PRO), do not render ads
  if (user && (user.plan === 'DEVELOPER' || user.plan === 'PRO')) {
    return null;
  }

  useEffect(() => {
    let isMounted = true;
    api.get(`/ads?placement=${placement}`)
      .then((res) => {
        if (isMounted && res.data.success && res.data.data.ad) {
          setAd(res.data.data.ad);
          // Record impression
          api.post(`/ads/${res.data.data.ad._id}/impression`).catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [placement]);

  if (!ad) return null;

  const handleClick = () => {
    api.post(`/ads/${ad._id}/click`).catch(() => {});
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden bg-card/80 hover:bg-card border border-deployBorder hover:border-primary/50 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-12 h-12 object-cover rounded-lg border border-deployBorder shrink-0"
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-deployBorder text-deployText-secondary flex items-center">
                <Tag className="w-2.5 h-2.5 mr-1" /> Sponsored
              </span>
              <h4 className="text-sm font-semibold text-white group-hover:text-primary-light transition-colors line-clamp-1">
                {ad.title}
              </h4>
            </div>
            <p className="text-xs text-deployText-secondary mt-0.5 line-clamp-1">
              {ad.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-deployText-secondary group-hover:text-primary-light text-xs font-medium shrink-0">
          <span>Learn More</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
