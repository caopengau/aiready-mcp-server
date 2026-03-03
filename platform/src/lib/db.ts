/**
 * DynamoDB Single-Table Design for AIReady Platform
 *
 * Table: aiready-platform
 *
 * PK Patterns:
 *   USER#<userId>           - User record
 *   TEAM#<teamId>           - Team record
 *   REPO#<repoId>           - Repository record
 *   ANALYSIS#<repoId>       - Analysis records for a repo
 *   REMEDIATION#<remId>     - Remediation request
 *
 * SK Patterns:
 *   #METADATA               - Entity metadata
 *   #MEMBER#<userId>        - Team membership
 *   <timestamp>             - Analysis/remediation timestamp (sorted)
 *
 * GSI1: List all repos for a user / List members for a team
 *   GSI1PK: USER#<userId> | TEAM#<teamId>
 *   GSI1SK: REPO#<repoId> | MEMBER#<userId>
 *
 * GSI2: List all analyses for a repo / List remediations
 *   GSI2PK: ANALYSIS#<repoId> | REMEDIATION#<repoId>
 *   GSI2SK: <timestamp>
 *
 * GSI3: List all teams for a user
 *   GSI3PK: USER#<userId>
 *   GSI3SK: TEAM#<teamId>
 */

import { createHash, randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

const TABLE_NAME = process.env.DYNAMO_TABLE || 'aiready-platform';

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  githubId?: string;
  googleId?: string;
  passwordHash?: string;
  emailVerified?: string;
  teamId?: string;
  role?: 'owner' | 'admin' | 'member';
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  githubInstallationId?: string;
  githubOrgName?: string;
  memberCount: number;
  repoLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Repository {
  id: string;
  teamId?: string;
  userId: string;
  name: string;
  url: string;
  description?: string;
  defaultBranch: string;
  lastAnalysisAt?: string;
  aiScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  repoId: string;
  userId: string;
  timestamp: string;
  aiScore: number;
  breakdown: {
    semanticDuplicates: number;
    contextFragmentation: number;
    namingConsistency: number;
    documentationHealth: number;
    dependencyHealth: number;
    aiSignalClarity: number;
    agentGrounding: number;
    testabilityIndex: number;
    changeAmplification: number;
  };
  rawKey: string; // S3 key for raw JSON
  summary: {
    totalFiles: number;
    totalIssues: number;
    criticalIssues: number;
    warnings: number;
  };
  details?: any[];
  createdAt: string;
}

export interface RemediationRequest {
  id: string;
  repoId: string;
  teamId?: string;
  userId: string;
  type: 'consolidation' | 'rename' | 'restructure' | 'refactor';
  risk: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedSavings: number; // tokens
  assignedTo?: string; // expert ID
  createdAt: string;
  updatedAt: string;
}

export interface MagicLinkToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string; // Internal ID
  userId: string;
  name: string; // e.g., "GitHub Actions"
  keyHash: string; // SHA-256 hash of the full key
  prefix: string; // e.g., "ar_1234..."
  createdAt: string;
  lastUsedAt?: string;
}

// User operations
export async function createUser(user: User): Promise<User> {
  const now = new Date().toISOString();
  const item = {
    PK: `USER#${user.id}`,
    SK: '#METADATA',
    GSI1PK: 'USERS',
    GSI1SK: user.email,
    ...user,
    createdAt: user.createdAt || now,
    updatedAt: now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: '#METADATA' },
    })
  );

  return result.Item ? (result.Item as User) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :email',
      ExpressionAttributeValues: {
        ':pk': 'USERS',
        ':email': email,
      },
    })
  );

  return result.Items?.[0] as User | null;
}

export async function updateUser(
  userId: string,
  updates: Partial<User>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  if (updateExpressions.length === 0) return;

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: '#METADATA' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Team operations
export async function createTeam(team: Team, ownerId: string): Promise<Team> {
  const now = new Date().toISOString();

  // Create team record
  const teamItem = {
    PK: `TEAM#${team.id}`,
    SK: '#METADATA',
    GSI1PK: 'TEAMS',
    GSI1SK: team.slug,
    ...team,
    createdAt: team.createdAt || now,
    updatedAt: now,
  };

  // Create owner membership
  const memberItem = {
    PK: `TEAM#${team.id}`,
    SK: `#MEMBER#${ownerId}`,
    GSI1PK: `TEAM#${team.id}`,
    GSI1SK: `MEMBER#${ownerId}`,
    GSI3PK: `USER#${ownerId}`,
    GSI3SK: `TEAM#${team.id}`,
    teamId: team.id,
    userId: ownerId,
    role: 'owner',
    joinedAt: now,
  };

  await doc.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: [
          { PutRequest: { Item: teamItem } },
          { PutRequest: { Item: memberItem } },
        ],
      },
    })
  );

  // Update user with teamId
  await updateUser(ownerId, { teamId: team.id, role: 'owner' });

  return team;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TEAM#${teamId}`, SK: '#METADATA' },
    })
  );

  return result.Item ? (result.Item as Team) : null;
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :slug',
      ExpressionAttributeValues: {
        ':pk': 'TEAMS',
        ':slug': slug,
      },
    })
  );

  return result.Items?.[0] as Team | null;
}

export async function listUserTeams(
  userId: string
): Promise<(TeamMember & { team: Team })[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'TEAM#',
      },
    })
  );

  const memberships = result.Items || [];
  const enrichedTeams = await Promise.all(
    memberships.map(async (membership) => {
      const team = await getTeam(membership.teamId);
      return { ...membership, team } as TeamMember & { team: Team };
    })
  );

  return enrichedTeams;
}

export async function listTeamMembers(
  teamId: string
): Promise<(TeamMember & { user: User })[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `TEAM#${teamId}`,
        ':prefix': '#MEMBER#',
      },
    })
  );

  // Fetch user details for each member
  const members = result.Items || [];
  const enrichedMembers = await Promise.all(
    members.map(async (member) => {
      const user = await getUser(member.userId);
      return { ...member, user } as TeamMember & { user: User };
    })
  );

  return enrichedMembers;
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const now = new Date().toISOString();

  const memberItem = {
    PK: `TEAM#${teamId}`,
    SK: `#MEMBER#${userId}`,
    GSI1PK: `TEAM#${teamId}`,
    GSI1SK: `MEMBER#${userId}`,
    GSI3PK: `USER#${userId}`,
    GSI3SK: `TEAM#${teamId}`,
    teamId,
    userId,
    role,
    joinedAt: now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: memberItem }));
  await updateUser(userId, { teamId, role });
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TEAM#${teamId}`, SK: `#MEMBER#${userId}` },
    })
  );
  await updateUser(userId, { teamId: undefined, role: undefined });
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Team>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  if (updateExpressions.length === 0) return;

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `TEAM#${teamId}`, SK: '#METADATA' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Repository operations
export async function createRepository(repo: Repository): Promise<Repository> {
  const now = new Date().toISOString();
  const item = {
    PK: `REPO#${repo.id}`,
    SK: '#METADATA',
    GSI1PK: repo.teamId ? `TEAM#${repo.teamId}` : `USER#${repo.userId}`,
    GSI1SK: `REPO#${repo.id}`,
    ...repo,
    createdAt: repo.createdAt || now,
    updatedAt: now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return repo;
}

export async function getRepository(
  repoId: string
): Promise<Repository | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REPO#${repoId}`, SK: '#METADATA' },
    })
  );

  return result.Item ? (result.Item as Repository) : null;
}

export async function listUserRepositories(
  userId: string
): Promise<Repository[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'REPO#',
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items || []) as Repository[];
}

export async function listTeamRepositories(
  teamId: string
): Promise<Repository[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `TEAM#${teamId}`,
        ':prefix': 'REPO#',
      },
      ScanIndexForward: false,
    })
  );

  return (result.Items || []) as Repository[];
}

export async function updateRepository(
  repoId: string,
  updates: Partial<Repository>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'userId') continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  if (updateExpressions.length === 0) return;

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REPO#${repoId}`, SK: '#METADATA' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

export async function deleteRepository(repoId: string): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REPO#${repoId}`, SK: '#METADATA' },
    })
  );
}

// Analysis operations
export async function createAnalysis(analysis: Analysis): Promise<Analysis> {
  const now = new Date().toISOString();

  // Calculate TTL for Free tier (7 days retention)
  const retentionDays = 7; // Free tier retention
  const ttlTimestamp =
    Math.floor(Date.now() / 1000) + retentionDays * 24 * 60 * 60;

  const item = {
    PK: `ANALYSIS#${analysis.repoId}`,
    SK: analysis.timestamp,
    GSI1PK: `USER#${analysis.userId}`,
    GSI1SK: `ANALYSIS#${analysis.timestamp}`,
    GSI2PK: `ANALYSIS#${analysis.repoId}`,
    GSI2SK: analysis.timestamp,
    ...analysis,
    ttl: ttlTimestamp, // TTL for automatic expiration
    createdAt: analysis.createdAt || now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

  // Update repo's lastAnalysisAt and aiScore
  await updateRepository(analysis.repoId, {
    lastAnalysisAt: analysis.timestamp,
    aiScore: analysis.aiScore,
  });

  return analysis;
}

export async function getAnalysis(
  repoId: string,
  timestamp: string
): Promise<Analysis | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ANALYSIS#${repoId}`, SK: timestamp },
    })
  );

  return result.Item ? (result.Item as Analysis) : null;
}

export async function listRepositoryAnalyses(
  repoId: string,
  limit = 10
): Promise<Analysis[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ANALYSIS#${repoId}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return (result.Items || []) as Analysis[];
}

export async function getLatestAnalysis(
  repoId: string
): Promise<Analysis | null> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ANALYSIS#${repoId}`,
      },
      Limit: 1,
      ScanIndexForward: false,
    })
  );

  return result.Items?.[0] as Analysis | null;
}

// Remediation operations
export async function createRemediation(
  remediation: RemediationRequest
): Promise<RemediationRequest> {
  const now = new Date().toISOString();
  const item = {
    PK: `REMEDIATION#${remediation.id}`,
    SK: '#METADATA',
    GSI1PK: remediation.teamId
      ? `TEAM#${remediation.teamId}`
      : `USER#${remediation.userId}`,
    GSI1SK: `REMEDIATION#${remediation.id}`,
    GSI2PK: `REMEDIATION#${remediation.repoId}`,
    GSI2SK: remediation.createdAt,
    ...remediation,
    createdAt: remediation.createdAt || now,
    updatedAt: now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return remediation;
}

export async function getRemediation(
  remediationId: string
): Promise<RemediationRequest | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REMEDIATION#${remediationId}`, SK: '#METADATA' },
    })
  );

  return result.Item ? (result.Item as RemediationRequest) : null;
}

export async function listRemediations(
  repoId: string,
  limit = 20
): Promise<RemediationRequest[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `REMEDIATION#${repoId}`,
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return (result.Items || []) as RemediationRequest[];
}

export async function listTeamRemediations(
  teamId: string,
  limit = 50
): Promise<RemediationRequest[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `TEAM#${teamId}`,
        ':prefix': 'REMEDIATION#',
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return (result.Items || []) as RemediationRequest[];
}

export async function updateRemediation(
  remediationId: string,
  updates: Partial<RemediationRequest>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  if (updateExpressions.length === 0) return;

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  await doc.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `REMEDIATION#${remediationId}`, SK: '#METADATA' },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

// Magic Link Token operations
export async function createMagicLinkToken(
  token: MagicLinkToken
): Promise<MagicLinkToken> {
  const now = new Date().toISOString();
  const item = {
    PK: `MAGICLINK#${token.token}`,
    SK: '#METADATA',
    email: token.email,
    expiresAt: token.expiresAt,
    used: false,
    createdAt: now,
  };

  await doc.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return token;
}

export async function getMagicLinkToken(
  token: string
): Promise<MagicLinkToken | null> {
  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `MAGICLINK#${token}`, SK: '#METADATA' },
    })
  );

  return result.Item ? (result.Item as MagicLinkToken) : null;
}

export async function markMagicLinkUsed(token: string): Promise<void> {
  await doc.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `MAGICLINK#${token}`, SK: '#METADATA' },
      UpdateExpression: 'SET #used = :used',
      ExpressionAttributeNames: { '#used': 'used' },
      ExpressionAttributeValues: { ':used': true },
    })
  );
}

export { doc, TABLE_NAME };
// API Key operations

/**
 * Generate a new API key and store its hash
 * Returns the plain text key. THIS IS THE ONLY TIME THE PLAIN TEXT KEY IS AVAILABLE.
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ id: string; key: string }> {
  const id = crypto.randomUUID();
  const keyBody = randomBytes(24).toString('hex');
  const plainKey = `ar_${keyBody}`;
  const keyHash = createHash('sha256').update(plainKey).digest('hex');
  const prefix = `${plainKey.substring(0, 7)}...`;

  const apiKey: ApiKey = {
    id,
    userId,
    name,
    keyHash,
    prefix,
    createdAt: new Date().toISOString(),
  };

  // Store two items:
  // 1. For user management (list/delete): PK=USER#<userId>, SK=APIKEY#<id>
  // 2. For validation (lookup): PK=APIKEY#<hash>, SK=#METADATA
  await doc.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                PK: `USER#${userId}`,
                SK: `APIKEY#${id}`,
                GSI1PK: `USER#${userId}`,
                GSI1SK: `APIKEY#${id}`,
                type: 'APIKEY',
                ...apiKey,
              },
            },
          },
          {
            PutRequest: {
              Item: {
                PK: `APIKEY#${keyHash}`,
                SK: '#METADATA',
                type: 'APIKEY_HASH',
                apiKeyId: id,
                userId: userId,
              },
            },
          },
        ],
      },
    })
  );

  return { id, key: plainKey };
}

export async function listUserApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'APIKEY#',
      },
    })
  );

  return (result.Items || []) as ApiKey[];
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  // We need the hash to delete both records. Get the item first.
  const item = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `APIKEY#${id}` },
    })
  );

  if (!item.Item) return;

  const keyHash = (item.Item as ApiKey).keyHash;

  await doc.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: [
          {
            DeleteRequest: {
              Key: { PK: `USER#${userId}`, SK: `APIKEY#${id}` },
            },
          },
          {
            DeleteRequest: {
              Key: { PK: `APIKEY#${keyHash}`, SK: '#METADATA' },
            },
          },
        ],
      },
    })
  );
}

/**
 * Validate an API key and return the associated user ID
 */
export async function validateApiKey(
  plainKey: string
): Promise<{ userId: string; apiKeyId: string } | null> {
  const keyHash = createHash('sha256').update(plainKey).digest('hex');

  const result = await doc.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `APIKEY#${keyHash}`, SK: '#METADATA' },
    })
  );

  if (!result.Item) return null;

  // Update lastUsedAt asynchronously
  const userId = result.Item.userId;
  const apiKeyId = result.Item.apiKeyId;

  doc
    .send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: `APIKEY#${apiKeyId}` },
        UpdateExpression: 'SET lastUsedAt = :t',
        ExpressionAttributeValues: { ':t': new Date().toISOString() },
      })
    )
    .catch((err) => console.error('Error updating lastUsedAt:', err));

  return { userId, apiKeyId };
}
