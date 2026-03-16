import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://clawmore.getaiready.dev';

  const blogPosts = [
    'bridge-pattern-ephemeral-persistent',
    'cdk-monorepo-mastery',
    'death-of-the-transient-agent',
    'eventbridge-the-neural-spine',
    'ironclad-autonomy-safety-vpc',
    'omni-channel-ai-gateway',
    'one-dollar-ai-agent',
    'sst-ion-coder-loop',
    'surviving-void-ephemeral-persistence',
    'the-reflector-self-critique',
  ];

  const routes = ['', '/blog', '/pricing', '/evolution'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const blogRoutes = blogPosts.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...routes, ...blogRoutes];
}
