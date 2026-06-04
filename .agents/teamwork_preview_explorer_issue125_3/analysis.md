# Analysis and Recommendations - Issue #125: alarmProps override drops all defaults

## 1. Problem Analysis & Observations

### 1.1 `src/monitoredQueue.ts` Investigation
In `src/monitoredQueue.ts` (lines 169–180), the `Alarm` construct is instantiated as follows:
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

**Observation:**
- When `props.alarmProps` is defined (i.e. not falsy), the fallback object literal is completely bypassed.
- As a result, critical defaults (such as `treatMissingData: TreatMissingData.NOT_BREACHING`, the automatically generated `alarmName`, and the pre-configured `metric`) are completely dropped, unless the caller explicitly redefines them in `props.alarmProps`.

### 1.2 `test/monitoredQueue.test.ts` Investigation
- Currently, there are no unit tests in `test/monitoredQueue.test.ts` that pass or verify custom `alarmProps`.
- This confirms that adding custom `alarmProps` is currently untested and needs test coverage to prevent regression.

---

## 2. Proposed Merge Plan

To resolve this issue, the construct should merge the default properties with any user-provided `props.alarmProps` using the object spread operator.

### 2.1 Code Modification in `src/monitoredQueue.ts`
Replace the constructor call for the `Alarm` with:
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

### 2.2 Adding Unit Tests in `test/monitoredQueue.test.ts`
Add a new unit test suite that configures a subset of `alarmProps` (e.g. custom name and threshold) and verifies that:
1. The custom name and threshold are applied.
2. Default settings like `TreatMissingData: 'notBreaching'` are preserved.

Example Test Code:
```typescript
  describe('should create a monitored queue with custom alarmProps merging with defaults', () => {
    const stack = new Stack();
    new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
      alarmProps: {
        alarmName: 'custom-alarm-name',
        threshold: 10,
      } as any,
    });

    const template = Template.fromStack(stack);

    test('should create a CloudWatch Alarm with custom properties merged with default properties', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'custom-alarm-name',
        Threshold: 10,
        EvaluationPeriods: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        MetricName: 'ApproximateNumberOfMessagesVisible',
        TreatMissingData: 'notBreaching',
      });
    });

    test('should match the snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
```

---

## 3. Recommendations & Caveats

- **TypeScript Type Casting (`as any`)**: Since `AlarmProps` has several required properties (`metric`, `threshold`, and `evaluationPeriods`), users in TypeScript might be forced to supply these properties or cast the object using `as any` or `as AlarmProps` to override a subset of fields. The implementation of the merge logic fully supports partial properties via JS object spreading.
- **Other Props Fallbacks**: A similar pattern exists in `src/monitoredQueue.ts` for `dlqProps` (line 153) and `topicProps` (line 189). However, those fallbacks are outside the scope of Issue-125 and should not be modified to avoid unintended side-effects.
