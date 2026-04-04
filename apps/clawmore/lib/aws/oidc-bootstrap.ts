import {
  IAMClient,
  CreateRoleCommand,
  CreateOpenIDConnectProviderCommand,
  GetOpenIDConnectProviderCommand,
} from '@aws-sdk/client-iam';
import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from '@aws-sdk/client-sts';

const stsClient = new STSClient({});

/**
 * Assumes the OrganizationAccountAccessRole in the sub-account and returns temporary credentials.
 */
export async function assumeSubAccountRole(accountId: string) {
  const roleArn = `arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole`;
  const maxRetries = 10;
  const delayMs = 15000; // 15 seconds between retries

  for (let i = 0; i < maxRetries; i++) {
    try {
      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: 'ClawMoreBootstrapSession',
        DurationSeconds: 3600, // 1 hour
      });

      const response = await stsClient.send(command);

      if (!response.Credentials) {
        throw new Error('Failed to assume sub-account role: No credentials');
      }

      return {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
      };
    } catch (error: any) {
      if (
        error.name === 'AccessDenied' ||
        error.name === 'InvalidIdentityToken'
      ) {
        console.log(
          `[AWS] Role ${roleArn} not yet assume-able (attempt ${i + 1}/${maxRetries}). Waiting...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to assume sub-account role ${roleArn} after ${maxRetries} attempts`
  );
}

/**
 * Bootstraps a newly created managed account with OIDC trust for GitHub Actions.
 */
export async function bootstrapManagedAccount(
  accountId: string,
  githubOrg: string = 'clawmost',
  repoName?: string
) {
  const credentials = await assumeSubAccountRole(accountId);
  const iamClient = new IAMClient({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials,
  });

  const stsClientMain = new STSClient({});
  const identity = await stsClientMain.send(new GetCallerIdentityCommand({}));
  const mainAccountId = identity.Account!;

  // 1. Create OIDC Provider for GitHub if it doesn't exist
  const providerArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;
  try {
    await iamClient.send(
      new GetOpenIDConnectProviderCommand({
        OpenIDConnectProviderArn: providerArn,
      })
    );
  } catch (error: any) {
    if (
      error.name === 'NoSuchEntity' ||
      error.name === 'NoSuchEntityException'
    ) {
      try {
        await iamClient.send(
          new CreateOpenIDConnectProviderCommand({
            Url: 'https://token.actions.githubusercontent.com',
            ClientIDList: ['sts.amazonaws.com'],
            ThumbprintList: [
              '6938fd4d98bab03faadb97b34396831e3780aea1',
              '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
            ],
          })
        );
      } catch (createErr: any) {
        if (createErr.name !== 'EntityAlreadyExists') throw createErr;
      }
    } else {
      throw error;
    }
  }

  const roleName = 'ClawMore-GitHub-Actions-Role';

  const sub = repoName
    ? `repo:${githubOrg}/${repoName}:*`
    : `repo:${githubOrg}/*:*`;

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Federated: providerArn,
        },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringLike: {
            'token.actions.githubusercontent.com:sub': sub,
          },
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
        },
      },
      {
        Effect: 'Allow',
        Principal: {
          AWS: `arn:aws:iam::${mainAccountId}:root`,
        },
        Action: 'sts:AssumeRole',
      },
    ],
  };

  try {
    await iamClient.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
        Description: 'OIDC role for GitHub Actions to deploy and evolve code.',
      })
    );
  } catch (error: any) {
    if (error.name === 'EntityAlreadyExists') {
      const { UpdateAssumeRolePolicyCommand } =
        await import('@aws-sdk/client-iam');
      await iamClient.send(
        new UpdateAssumeRolePolicyCommand({
          RoleName: roleName,
          PolicyDocument: JSON.stringify(trustPolicy),
        })
      );
    } else {
      throw error;
    }
  }

  const deploymentPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'LambdaFullAccess',
        Effect: 'Allow',
        Action: ['lambda:*'],
        Resource: '*',
      },
      {
        Sid: 'APIGatewayAccess',
        Effect: 'Allow',
        Action: ['apigateway:*'],
        Resource: '*',
      },
      {
        Sid: 'DynamoDBAccess',
        Effect: 'Allow',
        Action: ['dynamodb:*'],
        Resource: '*',
      },
      {
        Sid: 'S3Access',
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: '*',
      },
      {
        Sid: 'CloudFormationAccess',
        Effect: 'Allow',
        Action: ['cloudformation:*'],
        Resource: '*',
      },
      {
        Sid: 'IAMPassRoleAndManageRoles',
        Effect: 'Allow',
        Action: [
          'iam:PassRole',
          'iam:GetRole',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:GetRolePolicy',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies',
          'iam:ListInstanceProfilesForRole',
          'iam:CreateServiceLinkedRole',
        ],
        Resource: '*',
      },
      {
        Sid: 'CloudFrontAccess',
        Effect: 'Allow',
        Action: ['cloudfront:*'],
        Resource: '*',
      },
      {
        Sid: 'EventBridgeAccess',
        Effect: 'Allow',
        Action: ['events:*'],
        Resource: '*',
      },
      {
        Sid: 'SQSAccess',
        Effect: 'Allow',
        Action: ['sqs:*'],
        Resource: '*',
      },
      {
        Sid: 'SNSAccess',
        Effect: 'Allow',
        Action: ['sns:*'],
        Resource: '*',
      },
      {
        Sid: 'CloudWatchLogsAccess',
        Effect: 'Allow',
        Action: ['logs:*'],
        Resource: '*',
      },
      {
        Sid: 'STSAccess',
        Effect: 'Allow',
        Action: ['sts:GetCallerIdentity'],
        Resource: '*',
      },
      {
        Sid: 'DeniedServices',
        Effect: 'Deny',
        Action: [
          'organizations:*',
          'account:*',
          'billing:*',
          'ce:*',
          'savingsplans:*',
          'cur:*',
          'iam:DeleteUser',
          'iam:CreateUser',
          'iam:AttachUserPolicy',
          'iam:PutUserPolicy',
        ],
        Resource: '*',
      },
    ],
  };

  const { PutRolePolicyCommand } = await import('@aws-sdk/client-iam');
  await iamClient.send(
    new PutRolePolicyCommand({
      RoleName: roleName,
      PolicyName: 'ClawMore-Serverless-Deploy-Policy',
      PolicyDocument: JSON.stringify(deploymentPolicy),
    })
  );

  return `arn:aws:iam::${accountId}:role/${roleName}`;
}
