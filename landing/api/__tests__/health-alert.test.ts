import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: function () {
    return { send: mockSend };
  },
  PublishCommand: function (args: any) {
    return args;
  },
}));

describe('health-alert handler', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes to SNS with valid topic ARN', async () => {
    process.env.HEALTH_ALERTS_TOPIC_ARN =
      'arn:aws:sns:ap-southeast-2:123456789:HealthAlerts';
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-alert');
    const result = await handler({
      body: JSON.stringify({
        subject: 'TestApp Outage',
        message: 'Health check failed',
        failedUrls: ['https://example.com'],
      }),
    });

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('handles parsed body object directly', async () => {
    process.env.HEALTH_ALERTS_TOPIC_ARN =
      'arn:aws:sns:ap-southeast-2:123456789:HealthAlerts';
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-alert');
    const result = await handler({
      body: {
        subject: 'TestApp Outage',
        message: 'Health check failed',
        failedUrls: ['https://example.com'],
      },
    });

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when HEALTH_ALERTS_TOPIC_ARN is not set', async () => {
    delete process.env.HEALTH_ALERTS_TOPIC_ARN;

    const { handler } = await import('../health-alert');
    const result = await handler({
      body: JSON.stringify({
        subject: 'TestApp Outage',
        message: 'Health check failed',
      }),
    });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe(
      'HEALTH_ALERTS_TOPIC_ARN not configured'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns 500 when SNS publish fails', async () => {
    process.env.HEALTH_ALERTS_TOPIC_ARN =
      'arn:aws:sns:ap-southeast-2:123456789:HealthAlerts';
    mockSend.mockRejectedValue(new Error('SNS unavailable'));

    const { handler } = await import('../health-alert');
    const result = await handler({
      body: JSON.stringify({
        subject: 'TestApp Outage',
        message: 'Health check failed',
      }),
    });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Failed to publish alert');
  });

  it('handles malformed JSON body gracefully', async () => {
    process.env.HEALTH_ALERTS_TOPIC_ARN =
      'arn:aws:sns:ap-southeast-2:123456789:HealthAlerts';
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-alert');
    const result = await handler({ body: 'not-json' });

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
