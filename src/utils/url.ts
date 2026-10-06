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
    return domain.startsWith('http://') || domain.startsWith('https://')
      ? domain
      : `https://${domain}/`;
  }

  const sub = (project.assignedSubdomain || project.slug || '').trim();

  // If project has an explicit platformDomain assigned
  if (project.platformDomain && project.platformDomain.trim()) {
    const base = project.platformDomain.trim();
    const isHttps = base.includes('pateldeeep.me') || (typeof window !== 'undefined' && window.location.protocol === 'https:');
    const proto = isHttps ? 'https:' : 'http:';
    return `${proto}//${sub}.${base}/`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const protocol = window.location.protocol;

    if (hostname.includes('deployeai.duckdns.org')) {
      return `${protocol}//${sub}.deployeai.duckdns.org/`;
    }
    if (hostname.includes('deploye-ai.duckdns.org')) {
      return `${protocol}//${sub}.deploye-ai.duckdns.org/`;
    }
    if (hostname.includes('ml-ai.duckdns.org')) {
      return `${protocol}//${sub}.ml-ai.duckdns.org/`;
    }
    if (hostname.includes('mooo.com')) {
      return `${protocol}//${sub}.ai-ml.mooo.com/`;
    }
    if (hostname.includes('chickenkiller.com')) {
      return `${protocol}//${sub}.ai-ml.chickenkiller.com/`;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${sub}.localhost:5000/`;
    }
  }

  const defaultPlatformDomain =
    (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'deployeai.duckdns.org';
  return `http://${sub}.${defaultPlatformDomain}/`;
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

