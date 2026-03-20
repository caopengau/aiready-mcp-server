import { auth } from '../../../auth';
import { ProvisioningOrchestrator } from '../../../lib/onboarding/provision-node';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = (await auth()) as any;

  // 1. Strict Authorization (Only Admin)
  if (!session || session.user?.email !== 'caopengau@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Extract GitHub Access Token from session
  const githubToken = session.accessToken;
  if (!githubToken) {
    return NextResponse.json(
      { error: 'Missing GitHub Access Token' },
      { status: 400 }
    );
  }

  try {
    const { userEmail, userName, repoName, coEvolutionOptIn } =
      await req.json();

    if (!userEmail || !userName || !repoName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const orchestrator = new ProvisioningOrchestrator(githubToken);

    // 3. Perform the provision loop
    const result = await orchestrator.provisionNode({
      userEmail,
      userName,
      repoName,
      githubToken,
      coEvolutionOptIn: !!coEvolutionOptIn,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[ProvisionAPI] Critical Failure:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
