# Handoff Report: Detailed Implementation Plan for Issues #125, #127, and #122

## 1. Observation
In our investigation of `/home/estian/personal/sqs-dlq-monitoring`, we observed the following configuration and source files:
- **`src/monitoredQueue.ts` (lines 169-182)**:
  ```typescript
  const alarm = new Alarm(
    this,
    'DLQ-Alarm',
    props.alarmProps || {
      alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
      metric:
        deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
      threshold: props.messageThreshold || 5,
      evaluationPeriods: props.evaluationThreshold || 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    },
  );
  ```
- **`src/index.ts` (lines 1-3)**:
  ```typescript
  export { EmailProvider, IMessagingProvider, IMonitoredQueueProps, MonitoredQueue, SlackProvider } from './monitoredQueue';
  ```
- **`.npmignore` (line 12)**:
  ```
  /src/
  ```
- **`.projenrc.ts` (lines 18-29)**:
  ```typescript
  devDeps: [
    'esbuild',
  ],
  // exclude lambda code in favour of custom esbuild compiling
  excludeTypescript: ['src/lambda/**/*', 'playground/**/*'],
  ...
  project.compileTask.exec('ts-node ./scripts/buildLambdas.ts');
  ```
- **`scripts/buildLambdas.ts`**: Runs `esbuild` during compile time to output compiled lambda JavaScript code under `lib/lambda/slackListener/index.js`.
- **`test/monitoredQueue.test.ts` (line 6)**:
  ```typescript
  import { EmailProvider, SlackProvider } from '../src/monitoredQueue';
  ```

---

## 2. Logic Chain
1. **Issue #125 (Bug)**: In `src/monitoredQueue.ts`, `Alarm` constructor options fallback to the default object only if `props.alarmProps` is falsy (`props.alarmProps || { ... }`). Consequently, if `props.alarmProps` is supplied, it completely overrides the defaults, dropping settings like `treatMissingData` or `metric`. Spreading the defaults first and then applying `props.alarmProps` (`{ ...defaults, ...props.alarmProps }`) allows overriding specific keys while retaining other defaults.
2. **Issue #127 (Refactor)**: Moving provider classes (`SlackProvider`, `EmailProvider`) into separate files in `src/providers/` requires adjusting import statements and relative asset paths. Specifically, since `SlackProvider` is moved into `src/providers/slack.ts` (which compiles to `lib/providers/slack.js`), any relative paths referencing `lib/lambda/` or `src/lambda/` must be adjusted because they are one directory level deeper than before. Re-exporting all submodules at the package root (`src/index.ts`) preserves backward compatibility for downstream construct consumers.
3. **Issue #122 (Enhancement)**:
   - Replacing standard `Function` and `Code.fromAsset` with `NodejsFunction` means the Lambda bundle is packaged at synthesis time using `esbuild`.
   - Because `src/` is excluded from the package in `.npmignore` by default, any consumer of the library would lack access to the `.ts` files inside `src/lambda` during synthesis, leading to `File not found` errors.
   - To fix this, we must configure Projen to include `src/lambda/**/*` in the generated `.npmignore` using `project.npmignore!.include('src/lambda/**/*')`.
   - Alternatively, pointing `NodejsFunction` to `lib/lambda/slackListener/index.js` is possible, but it is redundant since `NodejsFunction` will run `esbuild` at synth-time anyway. Packaging the TypeScript source files and letting `NodejsFunction` compile them directly is the standard approach for synth-time bundling.
   - Consumers using non-JS languages (Python, Java, C#) will need `esbuild` or Docker installed on their machines for `NodejsFunction` to successfully bundle the lambda at `cdk synth` time.

---

## 3. Caveats
- **Consumer Dependencies**: Upgrading to `NodejsFunction` requires construct consumers to have either `esbuild` installed locally/globally, or Docker running to synthesize the CDK templates. This is a standard trade-off with `NodejsFunction` in published construct libraries.
- **JSII Restrictions**: We cannot use TypeScript utility types like `Omit` or `Partial` on public construct props interfaces (e.g. `alarmProps?: Partial<AlarmProps>`) because JSII does not support them. The type for `alarmProps` must remain standard `AlarmProps`.

---

## 4. Conclusion
We can resolve the bugs, improve structural maintainability, and modernize bundling by:
1. Merging alarm properties via object spreading.
2. Reorganizing the folder structure, correcting relative paths, and keeping the public exports unchanged.
3. Migrating to `NodejsFunction`, adjusting projen settings to include source lambda folders in the package, and deleting the custom build script.

---

## 5. Implementation Plan

### Issue #125: `alarmProps override drops all defaults including TreatMissingData`

#### Proposed Code Changes
In `src/monitoredQueue.ts` (or `src/monitoredQueue.ts` post-refactor), change:
```typescript
    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      props.alarmProps || {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      },
    );
```
to:
```typescript
    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        ...props.alarmProps,
      },
    );
```

#### Step-by-Step Implementation Guide
1. Open the file containing the `MonitoredQueue` class (`src/monitoredQueue.ts`).
2. Replace the `alarmProps` configuration inside the `Alarm` constructor call as shown above.
3. In `test/monitoredQueue.test.ts`, add a test suite verifying that custom `alarmProps` are correctly merged with defaults:
   ```typescript
   describe('should create a monitored queue with custom alarm props', () => {
     const stack = new Stack();
     new MonitoredQueue(stack, 'test', {
       queueProps: {
         queueName: 'test',
       },
       alarmProps: {
         alarmName: 'custom-alarm-name',
         threshold: 10,
         // metric is a required property in AlarmProps type
         metric: new Queue(stack, 'DummyQueue').metricApproximateNumberOfMessagesVisible(),
       },
     });

     const template = Template.fromStack(stack);

     test('should create a CloudWatch Alarm with merged properties', () => {
       template.hasResourceProperties('AWS::CloudWatch::Alarm', {
         AlarmName: 'custom-alarm-name',
         ComparisonOperator: 'GreaterThanOrEqualToThreshold',
         Threshold: 10,
         // Verify the default value is retained if not provided in alarmProps
         TreatMissingData: 'notBreaching',
       });
     });
   });
   ```

---

### Issue #127: `Split monitoredQueue.ts into separate files as providers grow`

#### Target Directory Layout
```
src/
├── index.ts
├── monitoredQueue.ts
├── interfaces.ts
├── providers/
│   ├── index.ts
│   ├── email.ts
│   └── slack.ts
└── lambda/
    ├── alarmMessage.ts
    └── slackListener/
        └── index.ts
```

#### Proposed Code Changes

##### 1. `src/interfaces.ts` (New File)
```typescript
import { AlarmProps } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface IMessagingProvider {
  deployProvider(scope: Construct, topic: Topic): void;
}

export interface IMonitoredQueueProps {
  readonly queueProps: QueueProps;
  readonly maxReceiveCount?: number;
  readonly messageThreshold?: number;
  readonly evaluationThreshold?: number;
  readonly messagingProviders?: IMessagingProvider[];
  readonly dlqProps?: QueueProps;
  readonly alarmProps?: AlarmProps;
  readonly topic?: Topic;
  readonly topicProps?: TopicProps;
}
```

##### 2. `src/providers/email.ts` (New File)
```typescript
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from '../interfaces';

export class EmailProvider implements IMessagingProvider {
  readonly emails: string[];

  constructor(emails: string[]) {
    this.emails = emails;
  }

  deployProvider(_scope: Construct, topic: Topic): void {
    addEmailNotificationDestination(topic, this.emails);
  }
}

function addEmailNotificationDestination(topic: Topic, emails: string[]) {
  for (const email of emails) {
    topic.addSubscription(new EmailSubscription(email));
  }
}
```

##### 3. `src/providers/slack.ts` (New File - using standard Function & Code.fromAsset)
*Note: If migrated to NodejsFunction in Issue #122, refer to that section instead.*
```typescript
import * as path from 'path';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from '../interfaces';

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;

  constructor(slackToken: string, slackChannel: string, name: string) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
  }

  deployProvider(scope: Construct, topic: Topic) {
    addSlackNotificationDestination(
      scope,
      topic,
      this.slackToken,
      this.slackChannel,
      this.name,
    );
  }
}

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
) {
  const slackListener = new Function(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    code: Code.fromAsset(path.join(__dirname, '../lambda/slackListener')),
    handler: 'index.handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logRetention: 7,
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

##### 4. `src/providers/index.ts` (New File)
```typescript
export * from './email';
export * from './slack';
```

##### 5. `src/monitoredQueue.ts` (Replaced/Cleaned Content)
```typescript
import {
  Alarm,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { DeadLetterQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { IMonitoredQueueProps } from './interfaces';

export class MonitoredQueue extends Construct {
  public readonly queue: Queue;
  public readonly deadLetterQueue: DeadLetterQueue;
  public readonly topic: Topic;
  public readonly alarm: Alarm;

  constructor(scope: Construct, id: string, props: IMonitoredQueueProps) {
    super(scope, id);

    const deadLetterQueue = props.queueProps.deadLetterQueue || {
      queue: new Queue(
        this,
        'DeadLetterQueue',
        props.dlqProps || {
          queueName: `${props.queueProps.queueName}-dlq`,
        },
      ),
      maxReceiveCount: props.maxReceiveCount || 3,
    };

    this.deadLetterQueue = deadLetterQueue;

    const queue = new Queue(this, 'Queue', {
      ...props.queueProps,
      deadLetterQueue,
    });

    this.queue = queue;

    const alarm = new Alarm(
      this,
      'DLQ-Alarm',
      {
        alarmName: `${deadLetterQueue.queue.queueName}-alarm`,
        metric:
          deadLetterQueue.queue.metricApproximateNumberOfMessagesVisible(),
        threshold: props.messageThreshold || 5,
        evaluationPeriods: props.evaluationThreshold || 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        ...props.alarmProps,
      },
    );

    this.alarm = alarm;

    const topic =
      props.topic ||
      new Topic(
        this,
        'Topic',
        props.topicProps || {
          topicName: `${deadLetterQueue.queue.queueName}-alarm-topic`,
        },
      );

    this.topic = topic;

    const snsAction = new SnsAction(topic);

    alarm.addAlarmAction(snsAction);
    alarm.addOkAction(snsAction);

    for (const messageProvider of props.messagingProviders
      ? props.messagingProviders
      : []) {
      messageProvider.deployProvider(this, topic);
    }
  }
}
```

##### 6. `src/index.ts` (Modified File)
```typescript
export { IMonitoredQueueProps, IMessagingProvider } from './interfaces';
export { EmailProvider, SlackProvider } from './providers';
export { MonitoredQueue } from './monitoredQueue';
```

##### 7. `test/monitoredQueue.test.ts` (Modified Import)
Change line 6:
```typescript
import { EmailProvider, SlackProvider } from '../src/monitoredQueue';
```
to:
```typescript
import { EmailProvider, SlackProvider } from '../src/index';
```

#### Step-by-Step Implementation Guide
1. Create `src/interfaces.ts`, `src/providers/email.ts`, `src/providers/slack.ts`, and `src/providers/index.ts` and fill them with the above configurations.
2. Edit `src/monitoredQueue.ts` to replace its entire content with the cleaned-up version.
3. Edit `src/index.ts` to expose the new files.
4. Edit `test/monitoredQueue.test.ts` to import `SlackProvider` and `EmailProvider` from `../src/index` instead of `../src/monitoredQueue`.

---

### Issue #122: `Replace Code.fromAsset with NodejsFunction for Lambda bundling`

#### Proposed Code Changes

##### 1. `src/providers/slack.ts` (or `src/monitoredQueue.ts` if not yet refactored)
Replace `Function` with `NodejsFunction`:
```typescript
import * as path from 'path';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { IMessagingProvider } from '../interfaces';

export class SlackProvider implements IMessagingProvider {
  readonly slackToken: string;
  readonly slackChannel: string;
  readonly name: string;

  constructor(slackToken: string, slackChannel: string, name: string) {
    this.slackToken = slackToken;
    this.slackChannel = slackChannel;
    this.name = name;
  }

  deployProvider(scope: Construct, topic: Topic) {
    addSlackNotificationDestination(
      scope,
      topic,
      this.slackToken,
      this.slackChannel,
      this.name,
    );
  }
}

function addSlackNotificationDestination(
  scope: Construct,
  topic: Topic,
  slackToken: string,
  slackChannel: string,
  name: string,
) {
  const slackListener = new NodejsFunction(scope, 'SlackListenerLambda' + name, {
    runtime: Runtime.NODEJS_22_X,
    architecture: Architecture.ARM_64,
    entry: path.join(__dirname, '../../src/lambda/slackListener/index.ts'),
    handler: 'handler',
    environment: {
      SLACK_BOT_TOKEN: slackToken,
      SLACK_CHANNEL: slackChannel,
    },
    logRetention: 7,
    bundling: {
      minify: true,
      target: 'esnext',
      keepNames: true,
      sourceMap: true,
    },
  });

  topic.addSubscription(new LambdaSubscription(slackListener));
}
```

##### 2. `.projenrc.ts`
Modify `.projenrc.ts` to include the Lambda typescript sources in the published npm package and remove the pre-compile command:
```typescript
import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Estian Yssel',
  authorAddress: 'estianyssel@gmail.com',
  description: 'An AWS CDK construct which creates an AWS Simple-Queue Service (SQS) queue with an appropriately monitored Dead-Letter Queue (DLQ). This so called MonitoredQueue construct will send messages to the specified locations to notify you if messages in the DLQ cross a certain threshold',
  cdkVersion: '2.168.0',
  defaultReleaseBranch: 'master',
  jsiiVersion: '~5.3.8',
  name: 'sqs-dlq-monitoring',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/EYssel/sqs-dlq-monitoring.git',
  docgen: false,
  jestOptions: {
    jestConfig: {
      testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
    },
  },
  devDeps: [
    'esbuild',
  ],
  bundledDeps: ['axios'],
  // exclude lambda code in favour of custom esbuild compiling
  excludeTypescript: ['src/lambda/**/*', 'playground/**/*'],
  majorVersion: 2,
});
project.npmignore!.exclude('scripts/');
project.npmignore!.exclude('playground/');
project.gitignore!.exclude('playground/');
project.npmignore!.include('src/lambda/**/*'); // Add this line to include Lambda sources in package
// Remove this line: project.compileTask.exec('ts-node ./scripts/buildLambdas.ts');
project.synth();
```

#### Step-by-Step Implementation Guide
1. Replace `Function` with `NodejsFunction` in `src/providers/slack.ts` and import it.
2. Edit `.projenrc.ts` as described above (remove the compile task execution, add the `npmignore` include statement).
3. Run `npx projen` in the terminal to regenerate configuration files like `.npmignore`.
4. Delete the custom build script file: `scripts/buildLambdas.ts`.

---

## 6. Verification Method

To verify the changes, run the following steps in order:

1. **Build and Code Compilation**:
   Run the build process to verify the TypeScript/JSII compiler checks pass and the new files compile cleanly:
   ```bash
   npm run build
   ```
   Or run the individual components:
   ```bash
   npx projen compile
   ```
2. **Unit Tests**:
   Run the unit test suite:
   ```bash
   npm test
   ```
   Since we transitioned to `NodejsFunction`, the asset hash generated for the lambda function will change. The snapshot tests in `test/monitoredQueue.test.ts` will fail due to these snapshot discrepancies.
   Re-run the tests updating snapshots to confirm all structural resource properties remain correct:
   ```bash
   npm test -- -u
   ```
3. **Inspect Output Files**:
   Verify that the `.npmignore` file in the project root correctly includes the lambda source directory:
   - Check that `!/src/lambda/**/*` or similar inclusion patterns exist.
   - Confirm that the `scripts/buildLambdas.ts` file has been deleted.
