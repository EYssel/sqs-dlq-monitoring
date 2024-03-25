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
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::Lambda::Function', 0);
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
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::Lambda::Function', 0);
    template.resourceCountIs('AWS::SNS::Subscription', 0);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with a custom DLQ using `dlqProps`', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      dlqProps: {
        queueName: 'custom-dlq-name',
        enforceSSL: true,
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::Lambda::Function', 0);
    template.resourceCountIs('AWS::SNS::Subscription', 0);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with a custom Topic using `topicProps`', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      topicProps: {
        fifo: true,
        topicName: 'test-topic-name',
        contentBasedDeduplication: true,
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::Lambda::Function', 0);
    template.resourceCountIs('AWS::SNS::Subscription', 0);
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
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::Lambda::Function', 0);
    template.resourceCountIs('AWS::SNS::Subscription', 1);
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
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::SNS::Subscription', 2);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('should create a monitored queue with a lambda SNS listeners and Lambda Subscriptions, and email subscriptions', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      messagingProviders: [
        new SlackProvider('test_token', 'test_channel', 'test1'),
        new SlackProvider('test_token2', 'test_channel2', 'test2'),
        new EmailProvider(['testemail@test.com']),
      ],
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 2);
    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 1);
    template.resourceCountIs('AWS::SNS::Subscription', 3);
    expect(template.toJSON()).toMatchSnapshot();
  });

});
