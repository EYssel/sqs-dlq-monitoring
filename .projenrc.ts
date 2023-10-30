import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Estian Yssel',
  authorAddress: 'estianyssel@gmail.com',
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'master',
  jsiiVersion: '~5.0.0',
  name: 'sqs-dlq-monitoring',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/EYssel/sqs-dlq-monitoring.git',
  docgen: false,
  jestOptions: {
    jestConfig: {
      testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
    },
  },
  // deps: [],                    /* Runtime dependencies of this module. */,
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    '@types/aws-lambda',
  ] /* Build dependencies for this module. */,
  // packageName: undefined,      /* The "name" in package.json. */
  bundledDeps: [
    'aws-lambda',
    '@slack/web-api',
  ],
});
project.synth();
