import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Estian Yssel',
  authorAddress: 'estianyssel@gmail.com',
  description: 'An AWS CDK construct which creates an AWS Simple-Queue Service (SQS) queue with an appropriately monitored Dead-Letter Queue (DLQ). This so called MonitoredQueue construct will send messages to the specified locations to notify you if messages in the DLQ cross a certain threshold',
  cdkVersion: '2.60.0',
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
});
project.npmignore!.exclude('scripts/');
project.npmignore!.exclude('playground/');
project.gitignore!.exclude('playground/');
project.compileTask.exec('ts-node ./scripts/buildLambdas.ts');
project.synth();
