import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { MonitoredQueue } from '../src/index';
import { EmailProvider, SlackProvider } from '../src/monitoredQueue';

describe('MonitoredQueue', () => {
  describe('should create a basic monitored queue', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
    });

    const template = Template.fromStack(stack);

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
        AlarmActions: [Match.anyValue()],
        OKActions: [Match.anyValue()],
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a custom DLQ', () => {
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

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
        AlarmActions: [Match.anyValue()],
        OKActions: [Match.anyValue()],
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should not create a SNS Subscription', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 0);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a custom DLQ using `dlqProps`', () => {
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

    test('should create an SQS Queue and a Dead-Letter Queue with a SSL policy', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);

      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });

      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'custom-dlq-name',
      });

      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        PolicyDocument: Match.objectLike({
          Statement: [
            {
              Action: 'sqs:*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
              Effect: 'Deny',
              Principal: {
                AWS: '*',
              },
            },
          ],
        }),
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
        AlarmActions: [Match.anyValue()],
        OKActions: [Match.anyValue()],
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should not create a SNS Subscription', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 0);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a custom Topic using `topic`', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      topic: new Topic(stack, 'test-topic', {
        topicName: 'test',
      }),
    });

    const template = Template.fromStack(stack);

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
      });
    });

    test('should create a topic with provided custom properties', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: Match.anyValue(),
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should not create a SNS Subscription', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 0);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a custom Topic using `topicProps`', () => {
    const stack = new Stack();
    const topicProps = {
      fifo: true,
      topicName: 'test-topic-name',
      contentBasedDeduplication: true,
    };

    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      topicProps,
    });

    const template = Template.fromStack(stack);
    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
      });
    });

    test('should create a topic with provided custom properties', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.hasResourceProperties('AWS::SNS::Topic', {
        ContentBasedDeduplication: true,
        FifoTopic: true,
        TopicName: `${topicProps.topicName}.fifo`,
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should not create a SNS Subscription', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 0);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with an email subscription', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      messagingProviders: [new EmailProvider(['testemail@test.com'])],
    });
    const template = Template.fromStack(stack);

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
      });
    });

    test('should create a default topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: Match.anyValue(),
      });
    });

    test('should not create a Lambda Function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 0);
    });

    test('should create a single SNS Subscription', () => {
      template.resourceCountIs('AWS::SNS::Subscription', 1);
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a Lambda SNS listener and Lambda Subscription', () => {
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

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    template.resourceCountIs('AWS::Lambda::Function', 1);

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
      });
    });

    test('should create a default topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: Match.anyValue(),
      });
    });

    template.resourceCountIs('AWS::SNS::Subscription', 1);

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should create a monitored queue with a Lambda SNS listeners and Lambda Subscriptions, and email subscriptions', () => {
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

    test('should create an SQS Queue and a Dead-Letter Queue', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test',
        RedrivePolicy: {
          deadLetterTargetArn: Match.anyValue(),
          maxReceiveCount: 3,
        },
      });
    });

    test('should create a default topic', () => {
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: Match.anyValue(),
      });
    });

    template.resourceCountIs('AWS::Lambda::Function', 1);

    test('should create a CloudWatch Alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 5,
      });
    });

    template.resourceCountIs('AWS::SNS::Subscription', 2);

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('should merge custom alarmProps with defaults', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test-queue',
      },
      alarmProps: {
        alarmName: 'custom-alarm-name',
        threshold: 10,
      } as any,
    });

    const template = Template.fromStack(stack);

    test('should override custom provided alarmProps and retain non-overridden defaults', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'custom-alarm-name',
        Threshold: 10,
        TreatMissingData: 'notBreaching',
        EvaluationPeriods: 1,
      });
    });
  });

  describe('should support custom log retention days and deduplicate slack lambda', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test-custom-retention', {
      queueProps: {
        queueName: 'test-custom-retention',
      },
      logRetentionDays: RetentionDays.TWO_WEEKS,
      messagingProviders: [
        new SlackProvider('token1', 'channel1', 'slack1'),
        new SlackProvider('token2', 'channel2', 'slack2'),
      ],
    });
    const template = Template.fromStack(stack);

    test('should only synthesize a single Lambda function', () => {
      template.resourceCountIs('AWS::Lambda::Function', 1);
    });

    test('should configure the CloudWatch Log Group RetentionInDays to 14', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 14,
      });
    });
  });
});

