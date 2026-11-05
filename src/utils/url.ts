export interface ProjectUrlLike {
  slug: string;
  customDomain?: string | null;
  assignedSubdomain?: string | null;
  platformDomain?: string | null;
}

/**
 * Resolves the primary live public URL for a project.
 * Automatically respects the project's selected platform domain or detects current host.
 */
export const getLiveProjectUrl = (project?: ProjectUrlLike | null): string => {
  if (!project) return '';

  if (project.customDomain && project.customDomain.trim()) {
    const domain = project.customDomain.trim();
    if (domain.startsWith('https://')) return domain;
    if (domain.startsWith('http://')) return domain.replace('http://', 'https://');
    return `https://${domain}/`;
  }

  const sub = (project.assignedSubdomain || project.slug || '').trim();

  // If project has an explicit platformDomain assigned - ALWAYS represent HTTPS (SSL)
  if (project.platformDomain && project.platformDomain.trim()) {
    const base = project.platformDomain.trim();
    return `https://${sub}.${base}/`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('deployeai.duckdns.org')) {
      return `https://${sub}.deployeai.duckdns.org/`;
    }
    if (hostname.includes('deploye-ai.duckdns.org')) {
      return `https://${sub}.deploye-ai.duckdns.org/`;
    }
    if (hostname.includes('ml-ai.duckdns.org')) {
      return `https://${sub}.ml-ai.duckdns.org/`;
    }
    if (hostname.includes('mooo.com')) {
      return `https://${sub}.ai-ml.mooo.com/`;
    }
    if (hostname.includes('chickenkiller.com')) {
      return `https://${sub}.ai-ml.chickenkiller.com/`;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.origin}/sites/${sub}/`;
    }
  }

  const defaultPlatformDomain =
    (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'deployeai.duckdns.org';
  return `https://${sub}.${defaultPlatformDomain}/`;
};

/**
 * Returns the direct edge proxy path on the current origin (e.g. https://pateldeeep.me/sites/test/)
 */
export const getDirectProxyUrl = (project?: ProjectUrlLike | null): string => {
  if (!project) return '';
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/sites/${project.slug}/`;
  }
  return `/sites/${project.slug}/`;
};

