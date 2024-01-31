import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { MonitoredQueue } from '../src/index';
import {
  EmailProvider,
  SlackProvider,
  randomIdentifier,
} from '../src/monitoredQueue';

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
      messagingProviders: [new EmailProvider(['testemail@test.com'])],
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
        new SlackProvider('test_token', 'test_channel', 'test1'),
        new SlackProvider('test_token2', 'test_channel2', 'test2'),
      ],
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should generate a random identifier for usage in to create unique ids', () => {
    const randomIds: string[] = [];

    for (let id = 0; id < 10; id++) {
      const randomId = randomIdentifier();
      randomIds.push(randomId);
      expect(randomIds.filter((item) => item == randomId)).toHaveLength(1);
    }
  });
});
