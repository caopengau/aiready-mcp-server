import {
  createManagedAccount,
  waitForAccountCreation,
  bootstrapManagedAccount,
} from '../lib/aws/vending';
import { createServerlessSCP, attachSCPToAccount } from '../lib/aws/governance';

export const handler = async (event: any) => {
  const { userEmail, userName } = JSON.parse(event.body || '{}');

  if (!userEmail || !userName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userEmail or userName' }),
    };
  }

  try {
    console.log(`Initiating account creation for ${userEmail}...`);
    const requestId = await createManagedAccount(userEmail, userName);

    console.log(`Waiting for account creation (RequestID: ${requestId})...`);
    const accountId = await waitForAccountCreation(requestId);

    console.log(`Account created: ${accountId}. Attaching Serverless SCP...`);
    const scpId = await createServerlessSCP();
    await attachSCPToAccount(scpId, accountId);

    console.log(
      `SCP attached successfully. Bootstrapping account ${accountId}...`
    );
    const bootstrapRoleArn = await bootstrapManagedAccount(accountId);
    console.log(`Account bootstrapped with role: ${bootstrapRoleArn}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Account created and secured successfully',
        accountId,
      }),
    };
  } catch (error: any) {
    console.error('Error in create-managed-account handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create or secure managed account',
        details: error.message,
      }),
    };
  }
};
