# Analysis and Recommendation Report — Issue-125

## Executive Summary
This report analyzes Issue-125 where providing custom `alarmProps` to the `MonitoredQueue` construct completely overrides and drops default alarm configurations (e.g., `treatMissingData: TreatMissingData.NOT_BREACHING`, threshold, evaluation periods, and metric). We confirm that the current implementation is using a simple logical-OR fallback pattern (`props.alarmProps || { ... }`) which causes this loss of defaults. We propose a safe, backward-compatible object-merging strategy to preserve default properties while allowing selective overrides.

---

## 1. Code Examination & Confirmation of the Bug

### Current Implementation in `src/monitoredQueue.ts`
At lines 169–180 of `src/monitoredQueue.ts`, the `Alarm` construct is instantiated as follows:

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

### Confirmation
If `props.alarmProps` is defined by the construct caller (even if only to customize a single property like `alarmName`), `props.alarmProps` evaluates to truthy. Consequently, the fallback object containing the defaults is ignored entirely. The construct user is then forced to manually redefine all other settings, such as the `metric` (which is a required property for `AlarmProps` in AWS CDK), the `threshold`, the `evaluationPeriods`, and `treatMissingData`. If they fail to do so, compilation will fail (due to missing `metric`) or the CloudWatch alarm will be deployed without proper defaults like `TreatMissingData.NOT_BREACHING`.

---

## 2. Proposed Changes & Implementation Plan

### 2.1 Changes to `src/monitoredQueue.ts`
We recommend updating the `Alarm` instantiation to use object spreading to merge the defaults with the caller-provided `alarmProps`.

**Proposed Diff:**
```typescript
<<<<
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
====
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
>>>>
```

### 2.2 Changes to `test/monitoredQueue.test.ts`
We should add a test suite specifically targeting custom `alarmProps` behavior.

**Proposed Test Cases:**
```typescript
  describe('should create a monitored queue with custom alarmProps merged with defaults', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      alarmProps: {
        alarmName: 'custom-alarm-name',
        threshold: 10,
      },
    });

    const template = Template.fromStack(stack);

    test('should override specified alarm props', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'custom-alarm-name',
        Threshold: 10,
      });
    });

    test('should retain default alarm props that were not overridden', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        EvaluationPeriods: 1,
        TreatMissingData: 'notBreaching',
      });
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
```

---

## 3. Side Observations
A similar pattern exists for `dlqProps` and `topicProps` where providing the custom props object overrides default name naming conventions. However, for those properties:
- The underlying AWS CDK construct (`Queue` or `Topic`) has its own internal defaults, so omitting them does not drop critical operational behavior (like missing metric or missing treat-missing-data settings).
- Thus, they do not present the same critical bugs as `alarmProps` does. Resolving `alarmProps` is the primary and direct target of this issue.

---

## 4. Verification and Build Plan
1. Run `npx projen compile` to compile TS files.
2. Run `npm test` or `npx projen test` to execute Jest tests and generate/verify snapshots.
