import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: function () {
    return { send: mockSend };
  },
  SendEmailCommand: function (args: any) {
    return args;
  },
}));

function makeSnsEvent(payload: Record<string, unknown>) {
  return {
    Records: [
      {
        Sns: {
          Message: JSON.stringify(payload),
        },
      },
    ],
  };
}

describe('health-email handler', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    process.env.SES_FROM_EMAIL = 'alerts@example.com';
    process.env.SES_TO_EMAIL = 'admin@example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends alert email for unhealthy status', async () => {
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-email');
    const result = await handler(
      makeSnsEvent({
        site: 'Landing',
        status: 'unhealthy',
        message: 'Health check failed: 500',
        timestamp: '2025-01-01T00:00:00.000Z',
      })
    );

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const emailArgs = mockSend.mock.calls[0][0];
    expect(emailArgs.Source).toBe('alerts@example.com');
    expect(emailArgs.Destination.ToAddresses).toEqual(['admin@example.com']);
    expect(emailArgs.Message.Subject.Data).toContain('ALERT');
    expect(emailArgs.Message.Subject.Data).toContain('Landing');
    expect(emailArgs.Message.Body.Text.Data).toContain('UNHEALTHY');
    expect(emailArgs.Message.Body.Text.Data).toContain('Landing');
  });

  it('sends recovery email for healthy status', async () => {
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-email');
    const result = await handler(
      makeSnsEvent({
        site: 'Platform',
        status: 'healthy',
        message: 'Service recovered',
        timestamp: '2025-01-01T00:05:00.000Z',
      })
    );

    expect(result.statusCode).toBe(200);

    const emailArgs = mockSend.mock.calls[0][0];
    expect(emailArgs.Message.Subject.Data).toContain('RECOVERY');
    expect(emailArgs.Message.Subject.Data).toContain('Platform');
    expect(emailArgs.Message.Body.Text.Data).toContain('HEALTHY');
  });

  it('processes multiple SNS records', async () => {
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-email');
    const event = {
      Records: [
        {
          Sns: {
            Message: JSON.stringify({
              site: 'Landing',
              status: 'unhealthy',
              message: 'Down',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
          },
        },
        {
          Sns: {
            Message: JSON.stringify({
              site: 'Platform',
              status: 'unhealthy',
              message: 'Down',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
          },
        },
      ],
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('throws when SES send fails', async () => {
    mockSend.mockRejectedValue(new Error('SES unavailable'));

    const { handler } = await import('../health-email');

    await expect(
      handler(
        makeSnsEvent({
          site: 'Landing',
          status: 'unhealthy',
          message: 'Down',
          timestamp: '2025-01-01T00:00:00.000Z',
        })
      )
    ).rejects.toThrow('SES unavailable');
  });

  it('uses empty string for missing SES_TO_EMAIL', async () => {
    delete process.env.SES_TO_EMAIL;
    mockSend.mockResolvedValue({});

    const { handler } = await import('../health-email');
    await handler(
      makeSnsEvent({
        site: 'Landing',
        status: 'unhealthy',
        message: 'Down',
        timestamp: '2025-01-01T00:00:00.000Z',
      })
    );

    const emailArgs = mockSend.mock.calls[0][0];
    expect(emailArgs.Destination.ToAddresses).toEqual(['']);
  });
});
