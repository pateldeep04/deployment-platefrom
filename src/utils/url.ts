export interface ProjectUrlLike {
  slug: string;
  customDomain?: string | null;
  assignedSubdomain?: string | null;
}

/**
 * Resolves the dynamic public or internal edge URL for a project.
 * Supports custom domains, assigned subdomains (*.pateldeeep.me),
 * and falls back to edge proxy paths (/sites/:slug/) on the active host.
 */
export const getLiveProjectUrl = (project?: ProjectUrlLike | null): string => {
  if (!project) return '';

  if (project.customDomain && project.customDomain.trim()) {
    const domain = project.customDomain.trim();
    return domain.startsWith('http://') || domain.startsWith('https://')
      ? domain
      : `http://${domain}/`;
  }

  if (project.assignedSubdomain && project.assignedSubdomain.trim()) {
    const defaultPlatformDomain =
      (import.meta.env.VITE_PLATFORM_DOMAIN as string) ||
      (typeof window !== 'undefined'
        ? window.location.hostname.replace(/^(app|api|www)\./, '')
        : 'deployeai.duckdns.org');
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    return `${protocol}//${project.assignedSubdomain.trim()}.${defaultPlatformDomain}/`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/sites/${project.slug}/`;
  }

  return `/sites/${project.slug}/`;
};
