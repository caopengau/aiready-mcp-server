import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { LeadSubmissionSchema, LeadSource } from '@aiready/core/client';

const s3 = new S3Client({});
const sns = new SNSClient({});

const bucketName = process.env.LEADS_BUCKET;
const topicArn = process.env.TOPIC_ARN;

export const handler = async (event: any) => {
  const method = event.requestContext?.http?.method || 'POST';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '',
    };
  }

  try {
    if (!event.body) {
      throw new Error('Missing body');
    }

    const body = JSON.parse(event.body);

    // Validate using @aiready/core schema
    const validationResult = LeadSubmissionSchema.safeParse(body);

    if (!validationResult.success) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.format(),
        }),
      };
    }

    const { email, name, interest, notes, source } = validationResult.data;

    const leadId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    const leadData = {
      id: leadId,
      email,
      name,
      interest,
      notes,
      timestamp,
      source: source || LeadSource.ClawMoreHero,
      status: 'new',
    };

    // Save to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `leads/${interest.toLowerCase()}/${leadId}.json`,
        Body: JSON.stringify(leadData, null, 2),
        ContentType: 'application/json',
      })
    );

    // Send SNS Notification
    if (topicArn) {
      const message = `
New Lead from ClawMore!

Type: ${interest}
Name: ${name || 'N/A'}
Email: ${email}
Notes: ${notes || 'N/A'}
Timestamp: ${timestamp}

Check S3 bucket ${bucketName} for details.
      `.trim();

      await sns.send(
        new PublishCommand({
          TopicArn: topicArn,
          Subject: `🎯 New ClawMore Lead: ${interest}`,
          Message: message,
        })
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, message: 'Lead captured' }),
    };
  } catch (error: any) {
    console.error('Error capturing lead:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
      }),
    };
  }
};
