import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  // Placeholder data for the managed platform status
  // In a real implementation, we'd fetch this from DynamoDB
  const statusData = {
    awsSpendCents: 1250, // $12.50
    awsInclusionCents: 1500, // $15.00
    aiTokenBalanceCents: 450, // $4.50
    aiRefillThresholdCents: 100, // $1.00
    mutationCount: 12,
  };

  return <DashboardClient user={session.user} status={statusData} />;
}
