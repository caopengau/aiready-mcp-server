import {
  OrganizationsClient,
  CreatePolicyCommand,
  AttachPolicyCommand,
  ListPoliciesCommand,
} from '@aws-sdk/client-organizations';

const orgClient = new OrganizationsClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

const SERVERLESS_SCP_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DenyExpensiveResources',
      Effect: 'Deny',
      Action: [
        'ec2:RunInstances',
        'ec2:CreateNatGateway',
        'rds:CreateDBInstance',
        'rds:CreateDBCluster',
        'sagemaker:CreateDomain',
        'sagemaker:CreateNotebookInstance',
        'redshift:CreateCluster',
        'kafka:CreateCluster',
        'es:CreateElasticsearchDomain',
        'es:CreateDomain',
      ],
      Resource: '*',
    },
    {
      Sid: 'DenyLargeLambdaDeployments',
      Effect: 'Deny',
      Action: 'lambda:CreateFunction',
      Resource: '*',
      Condition: {
        NumericGreaterThan: {
          'lambda:MemorySize': 1024,
        },
      },
    },
    {
      Sid: 'DenyCloudFrontCreation',
      Effect: 'Deny',
      Action: ['cloudfront:CreateDistribution'],
      Resource: '*',
    },
    {
      Sid: 'DenyLeavingOrganization',
      Effect: 'Deny',
      Action: 'organizations:LeaveOrganization',
      Resource: '*',
    },
  ],
};

const QUARANTINE_SCP_DOCUMENT = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'QuarantineAccount',
      Effect: 'Deny',
      Action: '*',
      Resource: '*',
    },
  ],
};

void QUARANTINE_SCP_DOCUMENT;

/**
 * Ensures the Serverless-only SCP exists.
 * Returns the Policy ID.
 */
export async function createServerlessSCP(): Promise<string> {
  const policyName = 'ClawMore-Managed-Serverless-Only';

  // Check if it already exists
  const listCommand = new ListPoliciesCommand({
    Filter: 'SERVICE_CONTROL_POLICY',
  });

  const policies = await orgClient.send(listCommand);
  const existing = policies.Policies?.find((p) => p.Name === policyName);

  if (existing?.Id) {
    return existing.Id;
  }

  const command = new CreatePolicyCommand({
    Content: JSON.stringify(SERVERLESS_SCP_DOCUMENT),
    Description:
      'Restricts ClawMore Managed nodes to Serverless services only, preventing expensive EC2/RDS usage.',
    Name: policyName,
    Type: 'SERVICE_CONTROL_POLICY',
  });

  try {
    const response = await orgClient.send(command);
    return response.Policy?.PolicySummary?.Id ?? '';
  } catch (error: any) {
    if (error.name === 'DuplicatePolicyException') {
      // Re-fetch if we raced
      const reList = await orgClient.send(listCommand);
      return reList.Policies?.find((p) => p.Name === policyName)?.Id ?? '';
    }
    console.error('Error creating SCP:', error);
    throw error;
  }
}

/**
 * Attaches an SCP to a specific account.
 */
export async function attachSCPToAccount(policyId: string, accountId: string) {
  const command = new AttachPolicyCommand({
    PolicyId: policyId,
    TargetId: accountId,
  });

  await orgClient.send(command);
}
