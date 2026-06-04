# Handoff Report: SQS DLQ Monitoring Enhancement Plans

## 1. Observation

Direct observations of the codebase:
- `src/index.ts`: Exports classes and interfaces from `monitoredQueue`.
  ```typescript
  1: export { EmailProvider, IMessagingProvider, IMonitoredQueueProps, MonitoredQueue, SlackProvider } from './monitoredQueue';
  ```
- `src/monitoredQueue.ts`: Defines `IMessagingProvider`, `SlackProvider`, `EmailProvider`, and the main `MonitoredQueue` construct.
  - The `SlackProvider` (lines 21-53) uses custom Lambda subscription code:
    ```typescript
    44:   deployProvider(scope: Construct, topic: Topic) {
    45:     addSlackNotificationDestination(
    46:       scope,
    47:       topic,
    48:       this.slackToken,
    49:       this.slackChannel,
    50:       this.name,
    51:     );
    52:   }
    ```
  - Lambda creation helper `addSlackNotificationDestination` (lines 215-235) points to the bundled code inside `lib/lambda/slackListener`:
    ```typescript
    225:     code: Code.fromAsset(path.join(__dirname, '../lib/lambda/slackListener')),
    ```
- `scripts/buildLambdas.ts`: Uses `esbuild` to compile lambda handlers list:
  ```typescript
  4: const lambdaPaths = ['lambda/slackListener/'];
  ```
- `test/monitoredQueue.test.ts`: Defines unit tests for standard and custom queues, topics, and providers using `aws-cdk-lib/assertions` to verify generated CloudFormation constructs (lines 1-426).

---

## 2. Logic Chain

From the observations:
1. **Issue #91 (AWS Chatbot)**:
   - AWS CDK v2 includes native support for `aws-chatbot.SlackChannelConfiguration` as part of `aws-cdk-lib`.
   - Rather than creating a custom Lambda to call Slack APIs, Chatbot can listen to the SNS topic directly.
   - We can implement a new class `ChatBotSlackProvider` that implements `IMessagingProvider` and uses `chatbot.SlackChannelConfiguration` without deploying custom Lambdas.

2. **Issue #8 (Teams Integration) & Issue #20 (Google Chat Integration)**:
   - The current `SlackProvider` model works by writing a custom Node.js Lambda, compiling it using the `buildLambdas.ts` script, and subscribing it to the construct's SNS Topic.
   - We can replicate this exact model for Microsoft Teams (`TeamsProvider`) and Google Chat (`GoogleChatProvider`).
   - We will write new Lambda functions (`src/lambda/teamsListener/index.ts` and `src/lambda/googleChatListener/index.ts`) that send formatted webhook payloads using the already-configured `axios` library.
   - We will register these handlers in `scripts/buildLambdas.ts` so they are bundled with `esbuild`.

3. **Issue #26 (Slack CLI)**:
   - Slack CLI compiles and deploys next-gen Slack Apps running on Deno.
   - A CDK construct library is distributed via standard package managers (NPM, etc.) and should have minimal client-side runtime requirements.
   - Requiring Deno and the Slack CLI (with authentication token) to run during a CDK deployment or synthesis process is impractical and error-prone.
   - We conclude that integrating the Slack CLI into the CDK codebase is not recommended. We recommend providing a template Slack App Manifest in the repository's documentation instead.

4. **Issue #77 (Async Lambda DLQs)**:
   - Currently, `MonitoredQueue` creates both a main queue and a DLQ, which is restrictive. Lambda functions configured with async DLQs or On-Failure Destinations only require monitoring an *existing* queue.
   - By creating a new construct `MonitoredDLQ` that accepts an existing `IQueue`, we decouple queue creation from the monitoring setup.
   - Refactoring `MonitoredQueue` to extend or compose `MonitoredDLQ` maintains 100% backward compatibility while enabling monitoring for any queue (including Lambda DLQs).

---

## 3. Caveats

- **AWS Chatbot manual authorization**: In AWS, Slack workspace authorization with AWS Chatbot must be done manually in the AWS Console for the target AWS account before CDK can deploy the configuration. This cannot be automated within CDK due to Slack OAuth requirements.
- **Teams Webhook Deprecation**: Microsoft Teams is transitioning to Power Automate webhook URLs. The custom Teams Lambda payload is designed to be compatible with Adaptive Cards, which is the standard format for modern Microsoft Teams webhook integrations.
- **Node.js Runtime**: The CDK Lambdas are configured to use `Runtime.NODEJS_22_X`. Ensure that the deployment environment supports Node.js 22.

---

## 4. Conclusion

We propose the following implementation plans for the active GitHub issues:

### A. AWS Chatbot Integration (Issue #91)
We will introduce `ChatBotSlackProvider` to configure native AWS Chatbot Slack channels.

#### Code Changes:
- **`src/monitoredQueue.ts`**:
  ```typescript
  import * as chatbot from 'aws-cdk-lib/aws-chatbot';
  import * as iam from 'aws-cdk-lib/aws-iam';

  export interface IChatBotSlackProviderProps {
    readonly slackWorkspaceId: string;
    readonly slackChannelId: string;
    readonly configurationName?: string;
    readonly role?: iam.IRole;
    readonly guardrailPolicies?: iam.IManagedPolicy[];
  }

  export class ChatBotSlackProvider implements IMessagingProvider {
    readonly props: IChatBotSlackProviderProps;
    constructor(props: IChatBotSlackProviderProps) {
      this.props = props;
    }
    deployProvider(scope: Construct, topic: Topic): void {
      new chatbot.SlackChannelConfiguration(scope, `ChatBotSlack-${this.props.slackChannelId}`, {
        slackChannelConfigurationName: this.props.configurationName || `${scope.node.id}-chatbot-slack`,
        slackWorkspaceId: this.props.slackWorkspaceId,
        slackChannelId: this.props.slackChannelId,
        notificationTopics: [topic],
        role: this.props.role,
        guardrailPolicies: this.props.guardrailPolicies,
      });
    }
  }
  ```

---

### B. Microsoft Teams Integration (Issue #8)
We will introduce a Lambda-based `TeamsProvider` sending Adaptive Cards to a MS Teams webhook URL.

#### Code Changes:
- **`src/lambda/teamsListener/index.ts`**:
  ```typescript
  import axios from 'axios';
  import { AlarmMessage } from '../alarmMessage';

  export const handler = async (event: { Records: { Sns: { Message: string } }[] }) => {
    try {
      const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);
      const teamsMessage = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.2',
              body: [
                {
                  type: 'TextBlock',
                  text: `${message.AlarmName} has been triggered!`,
                  weight: 'Bolder',
                  size: 'Medium',
                  color: message.NewStateValue === 'ALARM' ? 'Attention' : 'Good',
                },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'State:', value: `${message.OldStateValue} -> ${message.NewStateValue}` },
                    { title: 'Reason:', value: message.NewStateReason },
                    { title: 'Account:', value: message.AWSAccountId },
                  ],
                },
              ],
            },
          },
        ],
      };
      await axios.post(process.env.TEAMS_WEBHOOK_URL!, teamsMessage, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error sending message to Microsoft Teams:', error);
    }
  };
  ```
- **`scripts/buildLambdas.ts`**: Add `'lambda/teamsListener/'` to `lambdaPaths`.
- **`src/monitoredQueue.ts`**: Add `TeamsProvider` class and `addTeamsNotificationDestination` helper.

---

### C. Google Chat Integration (Issue #20)
We will introduce a Lambda-based `GoogleChatProvider` sending CardV2 messages to a Google Chat webhook URL.

#### Code Changes:
- **`src/lambda/googleChatListener/index.ts`**:
  ```typescript
  import axios from 'axios';
  import { AlarmMessage } from '../alarmMessage';

  export const handler = async (event: { Records: { Sns: { Message: string } }[] }) => {
    try {
      const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);
      const googleChatMessage = {
        cardsV2: [
          {
            cardId: 'alarmCard',
            card: {
              header: {
                title: `${message.AlarmName} has been triggered!`,
                subtitle: `Account: ${message.AWSAccountId} | Region: ${message.Region}`,
                imageUrl: message.NewStateValue === 'ALARM'
                  ? 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/warning/default/24px.svg'
                  : 'https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/check_circle/default/24px.svg',
              },
              sections: [
                {
                  widgets: [
                    {
                      textParagraph: {
                        text: `<b>State change:</b><br>${message.OldStateValue} &rarr; <b>${message.NewStateValue}</b><br><br><b>Reason:</b><br>${message.NewStateReason}`,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };
      await axios.post(process.env.GOOGLE_CHAT_WEBHOOK_URL!, googleChatMessage, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error sending message to Google Chat:', error);
    }
  };
  ```
- **`scripts/buildLambdas.ts`**: Add `'lambda/googleChatListener/'` to `lambdaPaths`.
- **`src/monitoredQueue.ts`**: Add `GoogleChatProvider` class and `addGoogleChatNotificationDestination` helper.

---

### D. Slack CLI Investigation (Issue #26)
We recommend **against** integrating Slack CLI into the CDK construct due to Deno environment dependencies and scope mismatch. Instead, we propose writing a template **Slack App Manifest** in `documentation/slack-app-manifest.yaml` so developers can create their Slack App with one click.

---

### E. Async Lambda DLQs Variant (Issue #77)
We will extract the alarm, topic, and provider logic into a reusable `MonitoredDLQ` construct. `MonitoredQueue` will wrap `MonitoredDLQ` internally, maintaining API backwards compatibility.

#### Code Changes:
- **`src/monitoredQueue.ts`**:
  ```typescript
  import { IQueue } from 'aws-cdk-lib/aws-sqs';

  export interface IMonitoredDLQProps {
    readonly deadLetterQueue: IQueue;
    readonly messageThreshold?: number;
    readonly evaluationThreshold?: number;
    readonly messagingProviders?: IMessagingProvider[];
    readonly alarmProps?: AlarmProps;
    readonly topic?: Topic;
    readonly topicProps?: TopicProps;
  }

  export class MonitoredDLQ extends Construct {
    public readonly deadLetterQueue: IQueue;
    public readonly topic: Topic;
    public readonly alarm: Alarm;

    constructor(scope: Construct, id: string, props: IMonitoredDLQProps) {
      super(scope, id);
      this.deadLetterQueue = props.deadLetterQueue;

      const alarm = new Alarm(this, 'DLQ-Alarm', props.alarmProps || {
        alarmName: `${this.deadLetterQueue.queueName}-alarm`,
        metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
      this.alarm = alarm;

      const topic = props.topic || new Topic(this, 'Topic', props.topicProps || {
        topicName: `${this.deadLetterQueue.queueName}-alarm-topic`,
      });
      this.topic = topic;

      const snsAction = new SnsAction(topic);
      alarm.addAlarmAction(snsAction);
      alarm.addOkAction(snsAction);

      for (const messageProvider of props.messagingProviders || []) {
        messageProvider.deployProvider(this, topic);
      }
    }
  }
  ```
- **Refactoring `MonitoredQueue`**:
  ```typescript
  export class MonitoredQueue extends Construct {
    public readonly queue: Queue;
    public readonly deadLetterQueue: DeadLetterQueue;
    public readonly monitor: MonitoredDLQ;

    constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
      super(scope, id);

      const deadLetterQueue = props.queueProps.deadLetterQueue || {
        queue: new Queue(this, 'DeadLetterQueue', props.dlqProps || {
          queueName: `${props.queueProps.queueName}-dlq`,
        }),
        maxReceiveCount: props.maxReceiveCount || 3,
      };
      this.deadLetterQueue = deadLetterQueue;

      this.queue = new Queue(this, 'Queue', {
        ...props.queueProps,
        deadLetterQueue,
      });

      this.monitor = new MonitoredDLQ(this, 'Monitor', {
        deadLetterQueue: deadLetterQueue.queue,
        messageThreshold: props.messageThreshold,
        evaluationThreshold: props.evaluationThreshold,
        messagingProviders: props.messagingProviders,
        alarmProps: props.alarmProps,
        topic: props.topic,
        topicProps: props.topicProps,
      });
    }

    public get alarm(): Alarm { return this.monitor.alarm; }
    public get topic(): Topic { return this.monitor.topic; }
  }
  ```

---

## 5. Verification Method

To independently verify the implementation, execute the following commands in the workspace root:

1. **Compilation Check**:
   ```bash
   yarn run compile
   ```
   *Expected outcome*: esbuild compiles the new lambda handlers (`lib/lambda/teamsListener/index.js` and `lib/lambda/googleChatListener/index.js`) and the TypeScript compiler compiles the CDK constructs into `lib/` without errors.

2. **Run Tests**:
   ```bash
   yarn test
   ```
   *Expected outcome*: All existing and new tests execute successfully.

3. **Verify Created CloudFormation Resources**:
   Ensure the following new unit tests in `test/monitoredQueue.test.ts` pass, matching the expected CloudFormation resources:
   - **AWS Chatbot**: Test that `AWS::ChatBot::SlackChannelConfiguration` is synthesized with `SlackWorkspaceId: 'T12345678'` and `SlackChannelId: 'C12345678'`.
   - **Teams & Google Chat**: Test that Lambda Functions are created with the correct environment variables `TEAMS_WEBHOOK_URL` and `GOOGLE_CHAT_WEBHOOK_URL` respectively.
   - **MonitoredDLQ**: Test that a separate queue passed to `MonitoredDLQ` creates the alarm on it, but does not create an additional SQS Queue.
