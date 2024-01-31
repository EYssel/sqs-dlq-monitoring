import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { MonitoredQueue } from '../src/index';
import { EmailProvider, SlackProvider } from '../src/monitoredQueue';

describe('MonitoredQueue', () => {
  test('should create a monitored queue', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with a custom DLQ', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
        deadLetterQueue: {
          queue: new Queue(stack, 'DLQ', {
            queueName: 'custom-dlq',
          }),
          maxReceiveCount: 3,
        },
      },
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with an email subscription', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      messagingProviders: [
        new EmailProvider(['testemail@test.com']),
      ],
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with a lambda SNS listener and Lambda Subscription', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      messagingProviders: [
        new SlackProvider('test_token', 'test_channel'),
      ],
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
