# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### MonitoredQueue <a name="MonitoredQueue" id="sqs-dlq-monitoring.MonitoredQueue"></a>

#### Initializers <a name="Initializers" id="sqs-dlq-monitoring.MonitoredQueue.Initializer"></a>

```typescript
import { MonitoredQueue } from 'sqs-dlq-monitoring'

new MonitoredQueue(scope: Construct, id: string, props: IMonitoredQueueProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.props">props</a></code> | <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps">IMonitoredQueueProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="sqs-dlq-monitoring.MonitoredQueue.Initializer.parameter.props"></a>

- *Type:* <a href="#sqs-dlq-monitoring.IMonitoredQueueProps">IMonitoredQueueProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="sqs-dlq-monitoring.MonitoredQueue.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="sqs-dlq-monitoring.MonitoredQueue.isConstruct"></a>

```typescript
import { MonitoredQueue } from 'sqs-dlq-monitoring'

MonitoredQueue.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="sqs-dlq-monitoring.MonitoredQueue.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#sqs-dlq-monitoring.MonitoredQueue.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="sqs-dlq-monitoring.MonitoredQueue.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### SlackProps <a name="SlackProps" id="sqs-dlq-monitoring.SlackProps"></a>

#### Initializer <a name="Initializer" id="sqs-dlq-monitoring.SlackProps.Initializer"></a>

```typescript
import { SlackProps } from 'sqs-dlq-monitoring'

const slackProps: SlackProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#sqs-dlq-monitoring.SlackProps.property.slackChannel">slackChannel</a></code> | <code>string</code> | Slack channel to post messages to. |
| <code><a href="#sqs-dlq-monitoring.SlackProps.property.slackToken">slackToken</a></code> | <code>string</code> | Slack bot token for providing access to the Lambda function to write messages to Slack. |

---

##### `slackChannel`<sup>Required</sup> <a name="slackChannel" id="sqs-dlq-monitoring.SlackProps.property.slackChannel"></a>

```typescript
public readonly slackChannel: string;
```

- *Type:* string

Slack channel to post messages to.

---

##### `slackToken`<sup>Required</sup> <a name="slackToken" id="sqs-dlq-monitoring.SlackProps.property.slackToken"></a>

```typescript
public readonly slackToken: string;
```

- *Type:* string

Slack bot token for providing access to the Lambda function to write messages to Slack.

---


## Protocols <a name="Protocols" id="Protocols"></a>

### IMonitoredQueueProps <a name="IMonitoredQueueProps" id="sqs-dlq-monitoring.IMonitoredQueueProps"></a>

- *Implemented By:* <a href="#sqs-dlq-monitoring.IMonitoredQueueProps">IMonitoredQueueProps</a>


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.queueProps">queueProps</a></code> | <code>aws-cdk-lib.aws_sqs.QueueProps</code> | The standard properties of the SQS Queue Construct. |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.emails">emails</a></code> | <code>string[]</code> | The emails to which the messages should be sent. |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.evaluationThreshold">evaluationThreshold</a></code> | <code>number</code> | The number of periods over which data is compared to the specified threshold. |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.maxReceiveCount">maxReceiveCount</a></code> | <code>number</code> | The number of times a message can be unsuccesfully dequeued before being moved to the dead-letter queue. |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.messageThreshold">messageThreshold</a></code> | <code>number</code> | The threshold for the amount of messages that are in the DLQ which trigger the alarm. |
| <code><a href="#sqs-dlq-monitoring.IMonitoredQueueProps.property.slackProps">slackProps</a></code> | <code><a href="#sqs-dlq-monitoring.SlackProps">SlackProps</a></code> | Properties for setting up Slack Messaging For info on setting this up see: https://github.com/EYssel/sqs-dlq-monitoring/blob/master/README.md#setting-up-slack-notifications. |

---

##### `queueProps`<sup>Required</sup> <a name="queueProps" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.queueProps"></a>

```typescript
public readonly queueProps: QueueProps;
```

- *Type:* aws-cdk-lib.aws_sqs.QueueProps

The standard properties of the SQS Queue Construct.

---

##### `emails`<sup>Optional</sup> <a name="emails" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.emails"></a>

```typescript
public readonly emails: string[];
```

- *Type:* string[]

The emails to which the messages should be sent.

---

##### `evaluationThreshold`<sup>Optional</sup> <a name="evaluationThreshold" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.evaluationThreshold"></a>

```typescript
public readonly evaluationThreshold: number;
```

- *Type:* number
- *Default:* 1

The number of periods over which data is compared to the specified threshold.

---

##### `maxReceiveCount`<sup>Optional</sup> <a name="maxReceiveCount" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.maxReceiveCount"></a>

```typescript
public readonly maxReceiveCount: number;
```

- *Type:* number
- *Default:* 3

The number of times a message can be unsuccesfully dequeued before being moved to the dead-letter queue.

---

##### `messageThreshold`<sup>Optional</sup> <a name="messageThreshold" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.messageThreshold"></a>

```typescript
public readonly messageThreshold: number;
```

- *Type:* number
- *Default:* 5

The threshold for the amount of messages that are in the DLQ which trigger the alarm.

---

##### `slackProps`<sup>Optional</sup> <a name="slackProps" id="sqs-dlq-monitoring.IMonitoredQueueProps.property.slackProps"></a>

```typescript
public readonly slackProps: SlackProps;
```

- *Type:* <a href="#sqs-dlq-monitoring.SlackProps">SlackProps</a>

Properties for setting up Slack Messaging For info on setting this up see: https://github.com/EYssel/sqs-dlq-monitoring/blob/master/README.md#setting-up-slack-notifications.

---

