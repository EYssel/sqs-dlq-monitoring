# Implementation Plan - Issue #126: Deduplicate Lambdas / Slack Providers

## Problem Analysis and Context
Currently, each `SlackProvider` instance deploys its own Lambda function helper (`SlackListenerLambda`). If a user configures multiple Slack channels or targets, they end up with multiple Lambda functions deployed, each running identical code.
To solve this, we should combine the configuration of multiple Slack providers into a single environment variable (`SLACK_PROVIDERS`) represented as a JSON array of configuration objects.
The `MonitoredQueue` construct can filter the list of `messagingProviders` to extract all `SlackProvider` instances. A single shared Lambda function is then created, and configured with the `SLACK_PROVIDERS` list serialized to a JSON string.
Also, we need to adapt the Slack Lambda function to loop through and execute parallel posts to each endpoint configured in this JSON array.

## Proposed Implementation Details

### Files to Change:
- `src/monitoredQueue.ts`
- `src/lambda/slackListener/index.ts`

### Code Changes / Diffs:

#### 1. In `src/monitoredQueue.ts` (or `src/providers/slack.ts`):
Update the construct to identify and bundle the Slack providers.
```typescript
// Filter Slack providers inside MonitoredQueue constructor:
    const slackProviders = (props.messagingProviders || []).filter(
      (p): p is SlackProvider => p instanceof SlackProvider
    );

    if (slackProviders.length > 0) {
      deploySharedSlackProvider(this, alarm, slackProviders);
    }

    // Deploy other messaging providers
    for (const messageProvider of props.messagingProviders || []) {
      if (!(messageProvider instanceof SlackProvider)) {
        messageProvider.deployProvider(this, topic);
      }
    }
```

Add the `deploySharedSlackProvider` function helper:
```typescript
function deploySharedSlackProvider(
  scope: MonitoredQueue,
  alarm: Alarm,
  slackProviders: SlackProvider[],
) {
  const providersConfig = slackProviders.map(p => ({
    token: p.slackToken,
    channel: p.slackChannel,
  }));

  const slackListener = new Function(scope, 'SlackListenerLambda', {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_PROVIDERS: Stack.of(scope).toJsonString(providersConfig),
    },
    logRetention: 7,
  });

  alarm.addAlarmAction(new LambdaAction(slackListener));
  alarm.addOkAction(new LambdaAction(slackListener));
}
```

#### 2. In `src/lambda/slackListener/index.ts`:
Update the handler to parse the multiple configurations and send HTTP requests to all targets in parallel:
```typescript
import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

const SLACK_CHAT_POST_MESSAGE_ENDPOINT =
  'https://slack.com/api/chat.postMessage';

interface SlackProviderConfig {
  token: string;
  channel: string;
}

export const handler = async (event: any) => {
  try {
    let message: AlarmMessage;

    if (event.Records && event.Records[0] && event.Records[0].EventSource === 'aws:sns') {
      message = JSON.parse(event.Records[0].Sns.Message);
    } else {
      message = event; // Fallback or direct invocation structure
    }

    let providers: SlackProviderConfig[] = [];
    if (process.env.SLACK_PROVIDERS) {
      providers = JSON.parse(process.env.SLACK_PROVIDERS);
    } else if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL) {
      providers = [{
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
      }];
    }

    await Promise.all(
      providers.map(async (provider) => {
        try {
          await axios.post(
            SLACK_CHAT_POST_MESSAGE_ENDPOINT,
            {
              channel: provider.channel,
              attachments: [
                {
                  color: message.NewStateValue === 'ALARM' ? '#ff0000' : '#36a64f',
                  blocks: [
                    {
                      type: 'header',
                      text: {
                        type: 'plain_text',
                        text: `${message.AlarmName} has been triggered!`,
                      },
                    },
                    {
                      type: 'section',
                      text: {
                        type: 'mrkdwn',
                        text: `*State changed:*\n\n*_${message.OldStateValue}_* :arrow_right: *_${message.NewStateValue}_*\n\n*Reason:*\n\n${message.NewStateReason}`,
                      },
                    },
                  ],
                },
              ],
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.token}`,
              },
            },
          );
        } catch (err) {
          console.error(`Failed to send alert to channel ${provider.channel}:`, err);
        }
      })
    );
  } catch (error) {
    console.error('Handler error:', error);
  }
};
```

## Step-by-Step Implementation Guide
1. Open `src/monitoredQueue.ts`. Modify the constructor of `MonitoredQueue` to filter `SlackProvider` instances.
2. Implement the `deploySharedSlackProvider` helper to create a single Lambda.
3. Edit `src/lambda/slackListener/index.ts` to parse the `SLACK_PROVIDERS` array and execute `axios` posts concurrently.
4. Modify `test/monitoredQueue.test.ts` to add a test case where two `SlackProvider`s are configured. Verify that only a single AWS Lambda function is created, and that its `SLACK_PROVIDERS` env variable contains both targets.

## Verification Plan
1. **Compilation Check**: Run `npx projen compile` to compile all source changes.
2. **Unit Tests**: Run `yarn test -u` to update snapshots and ensure the test assertion verifying a single lambda deployment passes.
