/** Per-route document metadata (title, description, robots). */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://aicodeoptimizerpromax.com';

export const ROUTE_META = {
  '/': {
    title: 'AI Code Optimizer — Analyze, Optimize & Verify Code with AI',
    description:
      'AI Code Optimizer analyzes complexity, finds bugs, optimizes performance, and verifies results in a sandboxed runner. Free to start.',
  },
  '/auth': {
    title: 'Sign in — AI Code Optimizer',
    description: 'Sign in or create a free AI Code Optimizer account.',
    robots: 'noindex',
  },
  '/forgot-password': { title: 'Forgot password — AI Code Optimizer', description: 'Reset your password.', robots: 'noindex' },
  '/reset-password': { title: 'Reset password — AI Code Optimizer', description: 'Choose a new password.', robots: 'noindex' },
  '/profile': { title: 'Profile — AI Code Optimizer', description: 'Manage your profile.', robots: 'noindex' },
  '/settings': { title: 'Settings — AI Code Optimizer', description: 'Manage settings and API keys.', robots: 'noindex' },
  '/workspace': { title: 'Workspace — AI Code Optimizer', description: 'Your optimization workspace.', robots: 'noindex' },
  '/optimize': { title: 'Optimize code — AI Code Optimizer', description: 'Optimize code with AI and verify the result.', robots: 'noindex' },
  '/optimization': { title: 'Optimization — AI Code Optimizer', description: 'AI code optimization.', robots: 'noindex' },
  '/analysis': { title: 'Code analysis — AI Code Optimizer', description: 'Static code analysis and quality scoring.', robots: 'noindex' },
  '/bug-detection': { title: 'Bug detection — AI Code Optimizer', description: 'Detect bugs before production.', robots: 'noindex' },
  '/documentation': { title: 'Auto-documentation — AI Code Optimizer', description: 'Generate docs from code.', robots: 'noindex' },
  '/refactoring': { title: 'Refactoring — AI Code Optimizer', description: 'Structural refactoring assistance.', robots: 'noindex' },
  '/debugging': { title: 'Debugging — AI Code Optimizer', description: 'AI root-cause analysis.', robots: 'noindex' },
  '/privacy': {
    title: 'Privacy Policy — AI Code Optimizer',
    description: 'How AI Code Optimizer collects, uses, and protects your data.',
  },
  '/terms': {
    title: 'Terms & Conditions — AI Code Optimizer',
    description: 'Terms governing use of AI Code Optimizer.',
  },
};

const DEFAULT_META = ROUTE_META['/'];

function upsertMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

const NOT_FOUND_META = {
  title: 'Page not found — AI Code Optimizer',
  description: 'The page you requested does not exist.',
  robots: 'noindex',
};

/** Syncs <title>, description, canonical and robots from the current route. */
export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    import('@/lib/analytics').then(({ trackPageview }) => trackPageview());
    const meta = ROUTE_META[pathname] || (pathname === '/' ? DEFAULT_META : NOT_FOUND_META);
    document.title = meta.title;
    upsertMetaTag('name', 'description', meta.description);
    upsertMetaTag('name', 'robots', meta.robots || 'index, follow');
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `${SITE}${pathname === '/' ? '/' : pathname}`);
  }, [pathname]);
  return null;
}
