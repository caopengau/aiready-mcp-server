import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Deep dives into the serverlessclaw philosophy, autonomous infrastructure, and agentic engineering on AWS.',
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
