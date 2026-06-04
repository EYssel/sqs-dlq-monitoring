# Implementation Plan - Issue #57: Direct Lambda Invocation from CloudWatch Alarm

## Problem Analysis and Context
Currently, the construct publishes events to an intermediate Amazon SNS Topic when an alarm changes state. The internal Lambda function (`SlackListenerLambda`) is subscribed to this topic. This triggers additional AWS SNS costs and adds complexity for direct alert-to-destination pipelines.
CloudWatch Alarms natively support invoking AWS Lambda functions directly using `LambdaAction` from the `aws-cdk-lib/aws-cloudwatch-actions` package.
To implement this:
1. Update `MonitoredQueue` to register the Slack Lambda directly using `LambdaAction`.
2. Update the internal Lambda handler code (`src/lambda/slackListener/index.ts`) to recognize and parse the direct CloudWatch Alarm event structure in addition to the standard SNS event message.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`
- `src/lambda/slackListener/index.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts`:
Update the alarm actions attachment code:
```typescript
import { LambdaAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

// Inside deploySharedSlackProvider:
  alarm.addAlarmAction(new LambdaAction(slackListener));
  alarm.addOkAction(new LambdaAction(slackListener));
```

#### 2. In `src/lambda/slackListener/index.ts`:
Modify the event parsing logic to handle both SNS event structures and direct CloudWatch Alarm event configurations:
```typescript
export const handler = async (event: any) => {
  try {
    let message: AlarmMessage;

    // Detect format (SNS vs Direct CloudWatch Alarm)
    if (event.Records && event.Records[0] && event.Records[0].EventSource === 'aws:sns') {
      message = JSON.parse(event.Records[0].Sns.Message);
    } else if (event.source === 'aws.cloudwatch' && event.alarmData) {
      message = {
        AlarmName: event.alarmData.alarmName,
        AlarmDescription: event.alarmData.configuration?.description || '',
        AWSAccountId: event.accountId,
        AlarmConfigurationUpdatedTimestamp: event.time,
        NewStateValue: event.alarmData.state.value,
        NewStateReason: event.alarmData.state.reason,
        StateChangeTime: event.alarmData.state.timestamp,
        Region: event.region,
        AlarmArn: event.alarmArn,
        OldStateValue: event.alarmData.previousState?.value || 'INSUFFICIENT_DATA',
        OKActions: [],
        AlarmActions: [],
        InsufficientDataActions: [],
        Trigger: {
          MetricName: '',
          Namespace: '',
          StatisticType: '',
          Statistic: '',
          Period: 0,
          EvaluationPeriods: 0,
          ComparisonOperator: '',
          Threshold: 0,
          TreatMissingData: '',
          EvaluateLowSampleCountPercentile: '',
        },
      };
    } else {
      console.error('Unsupported event format:', JSON.stringify(event));
      return;
    }

    // Process and send message to providers...
  } catch (error) {
    console.error('Handler error:', error);
  }
};
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts` and import `LambdaAction` from `aws-cdk-lib/aws-cloudwatch-actions`.
2. Update the helper lambda integration to register the Lambda resource directly to the alarm actions.
3. Open `src/lambda/slackListener/index.ts` and adjust the handler to check for `event.alarmData` or `event.Records` to handle direct invokers.
4. Add a unit test in `test/monitoredQueue.test.ts` verifying that:
   - The CloudWatch Alarm contains `AlarmActions` and `OKActions` referencing the Lambda function directly.
   - The intermediate SNS topic subscriptions count for the Slack listener is 0.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile`.
2. **Unit Tests**: Run `npm test` or `yarn test` to verify the alarm actions template output.
