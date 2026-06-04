import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Stack } from 'aws-cdk-lib';
import { MonitoredQueue } from '../src/monitoredQueue';

const app = new App();
const stack = new Stack(app, 'IntegMonitoredQueueStack');

new MonitoredQueue(stack, 'MonitoredQueue', {
  queueProps: {
    queueName: 'integ-test-queue',
  },
  messageThreshold: 3,
});

new IntegTest(app, 'MonitoredQueueInteg', {
  testCases: [stack],
});
