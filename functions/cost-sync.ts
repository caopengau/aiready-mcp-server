import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import { format, startOfMonth } from 'date-fns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { reportOverageCharge } from '../lib/billing';

const ceClient = new CostExplorerClient({ region: 'us-east-1' });
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const COMPUTE_INCLUSION_CENTS = 1500; // $15.00

export const handler = async (event: any) => {
  console.log('Starting Managed Account Cost Sync...');

  const today = new Date();
  const start = format(startOfMonth(today), 'yyyy-MM-dd');
  const end = format(today, 'yyyy-MM-dd'); // AWS requires exclusive end date or today for MTD

  if (start === end) {
    console.log(
      'First day of month, skipping sync until tomorrow to avoid AWS CE errors.'
    );
    return;
  }

  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: start, End: end },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [{ Type: 'DIMENSION', Key: 'LINKED_ACCOUNT' }],
  });

  try {
    const response = await ceClient.send(command);
    const results = response.ResultsByTime?.[0]?.Groups || [];

    // 1. Fetch all ManagedAccounts from DynamoDB
    const accountsScan = await docClient.send(
      new ScanCommand({
        TableName: process.env.DYNAMO_TABLE,
        FilterExpression: 'begins_with(PK, :pk_prefix) AND EntityType = :type',
        ExpressionAttributeValues: {
          ':pk_prefix': 'ACCOUNT#',
          ':type': 'ManagedAccount',
        },
      })
    );

    const managedAccounts = accountsScan.Items || [];

    for (const res of results) {
      const awsAccountId = res.Keys?.[0];
      const costCents = Math.floor(
        parseFloat(res.Metrics?.UnblendedCost?.Amount || '0') * 100
      );

      const account = managedAccounts.find(
        (a) => a.awsAccountId === awsAccountId
      );
      if (!account) continue;

      console.log(
        `Account ${awsAccountId} spent $${(costCents / 100).toFixed(2)} MTD`
      );

      // Update DynamoDB with latest spend
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.DYNAMO_TABLE,
          Key: { PK: account.PK, SK: account.SK },
          UpdateExpression:
            'SET currentMonthlySpendCents = :spend, lastCostSync = :now',
          ExpressionAttributeValues: {
            ':spend': costCents,
            ':now': new Date().toISOString(),
          },
        })
      );

      // 2. Check for overage
      if (costCents > COMPUTE_INCLUSION_CENTS && account.stripeCustomerId) {
        const totalOverage = costCents - COMPUTE_INCLUSION_CENTS;
        const previouslyReportedOverage = account.reportedOverageCents || 0;

        if (totalOverage > previouslyReportedOverage) {
          const delta = totalOverage - previouslyReportedOverage;
          console.log(
            `Reporting $${(delta / 100).toFixed(2)} compute overage for customer ${account.stripeCustomerId}`
          );

          await reportOverageCharge(
            account.stripeCustomerId,
            delta,
            `AWS Compute Overage (MTD: $${(costCents / 100).toFixed(2)})`
          );

          // Update reported status
          await docClient.send(
            new UpdateCommand({
              TableName: process.env.DYNAMO_TABLE,
              Key: { PK: account.PK, SK: account.SK },
              UpdateExpression: 'SET reportedOverageCents = :reported',
              ExpressionAttributeValues: {
                ':reported': totalOverage,
              },
            })
          );
        }
      }
    }

    console.log(
      'Cost sync completed successfully.',
      results.length,
      'accounts processed.'
    );
  } catch (error) {
    console.error('Error during cost sync:', error);
    throw error;
  }
};
