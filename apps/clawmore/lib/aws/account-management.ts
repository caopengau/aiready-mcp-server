import {
  OrganizationsClient,
  CreateAccountCommand,
  DescribeCreateAccountStatusCommand,
  ListAccountsCommand,
  ListTagsForResourceCommand,
  TagResourceCommand,
} from '@aws-sdk/client-organizations';

const orgClient = new OrganizationsClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

/**
 * Initiates the creation of a new AWS account specialized for a ClawMore Managed node.
 */
export async function createManagedAccount(
  userEmail: string,
  userName: string,
  userId?: string,
  isWarmPool: boolean = false
): Promise<{ requestId: string; estimatedTimeSeconds: number }> {
  const sanitizedEmail = isWarmPool
    ? userEmail.replace('@', `+clawpool-${Date.now().toString(36)}@`)
    : userEmail.replace('@', '+clawmore@');

  const shortId = userId ? userId.substring(0, 8).toUpperCase() : 'WARM';
  const accountName = isWarmPool
    ? `Claw-WarmPool-${Date.now().toString(36)}`
    : `Claw-${shortId} (${userName})`;

  const tags = [
    { Key: 'Project', Value: 'ClawMore' },
    { Key: 'Type', Value: 'ManagedNode' },
    { Key: 'Status', Value: isWarmPool ? 'Available' : 'Active' },
    { Key: 'CreatedAt', Value: new Date().toISOString() },
  ];

  if (!isWarmPool) {
    tags.push({ Key: 'Owner', Value: userEmail });
    if (userId) tags.push({ Key: 'UserId', Value: userId });
  }

  const command = new CreateAccountCommand({
    Email: sanitizedEmail,
    AccountName: accountName,
    RoleName: 'OrganizationAccountAccessRole',
    Tags: tags,
  });

  const response = await orgClient.send(command);

  if (!response.CreateAccountStatus?.Id) {
    throw new Error('Failed to initiate account creation');
  }

  // AWS account creation typically takes 2-5 minutes
  const estimatedTimeSeconds = isWarmPool ? 30 : 180; // Warm pool accounts are faster

  return {
    requestId: response.CreateAccountStatus.Id,
    estimatedTimeSeconds,
  };
}

/**
 * Polls AWS until the account creation is complete and returns the new Account ID.
 */
export async function waitForAccountCreation(
  requestId: string,
  maxRetries = 20,
  onProgress?: (progress: { attempt: number; status: string }) => void
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const command = new DescribeCreateAccountStatusCommand({
      CreateAccountRequestId: requestId,
    });

    const response = await orgClient.send(command);
    const status = response.CreateAccountStatus?.State;

    if (onProgress) {
      onProgress({
        attempt: i + 1,
        status: status || 'UNKNOWN',
      });
    }

    if (status === 'SUCCEEDED' && response.CreateAccountStatus?.AccountId) {
      return response.CreateAccountStatus.AccountId;
    }

    if (status === 'FAILED') {
      throw new Error(
        `Account creation failed: ${response.CreateAccountStatus?.FailureReason}`
      );
    }

    // Wait 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error('Timeout waiting for account creation');
}

/**
 * Scans the AWS Organization for an account tagged as available for vending.
 */
export async function findAvailableAccountInPool(): Promise<string | null> {
  const listCommand = new ListAccountsCommand({});
  const response = await orgClient.send(listCommand);

  if (!response.Accounts) return null;

  for (const account of response.Accounts) {
    if (account.Status !== 'ACTIVE') continue;

    try {
      const tagsCommand = new ListTagsForResourceCommand({
        ResourceId: account.Id!,
      });
      const tagsResponse = await orgClient.send(tagsCommand);

      const statusTag = tagsResponse.Tags?.find((t) => t.Key === 'Status');
      if (statusTag?.Value === 'Available') {
        return account.Id!;
      }
    } catch (_e) {
      // Skip accounts where we can't read tags (e.g. Master account)
      continue;
    }
  }

  return null;
}

/**
 * Re-tags an account from the pool to a specific owner and project.
 */
export async function assignAccountToOwner(
  accountId: string,
  email: string,
  repo: string
) {
  const tagCommand = new TagResourceCommand({
    ResourceId: accountId,
    Tags: [
      { Key: 'Status', Value: 'Active' },
      { Key: 'Owner', Value: email },
      { Key: 'Project', Value: repo },
      { Key: 'VendedAt', Value: new Date().toISOString() },
    ],
  });

  await orgClient.send(tagCommand);
}
