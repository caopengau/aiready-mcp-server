import { createFuelPackCheckout } from '../lib/billing';

export const handler = async (event: any) => {
  const { userId, successUrl, cancelUrl } = JSON.parse(event.body || '{}');

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing userId' }),
    };
  }

  try {
    // In a real implementation, we'd fetch the stripeCustomerId from DynamoDB
    const session = await createFuelPackCheckout(
      userId, // Using userId as a placeholder for customerId or mapping it
      successUrl || 'https://clawmore.getaiready.dev/billing/success',
      cancelUrl || 'https://clawmore.getaiready.dev/billing'
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
