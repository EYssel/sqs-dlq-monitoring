import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MonitoredQueue } from '../src/index';

describe('MonitoredDLQueue', () => {
  test('should create a monitored queue', () => {
    const stack = new Stack();
    const queue = new MonitoredQueue(stack, 'test', {
      queueProps: {
        queueName: 'test',
      },
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
