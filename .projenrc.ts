import { awscdk } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Estian Yssel',
  authorAddress: 'estianyssel@gmail.com',
  cdkVersion: '2.121.1',
  defaultReleaseBranch: 'master',
  jsiiVersion: '~5.3.0',
  name: 'sqs-dlq-monitoring',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/EYssel/sqs-dlq-monitoring.git',
  docgen: true,
  docgenFilePath: 'API.md',
  jestOptions: {
    jestConfig: {
      testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
    },
  },
  // deps: [],                    /* Runtime dependencies of this module. */,
  // description: undefined,      /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    'esbuild',
  ] /* Build dependencies for this module. */,
  // packageName: undefined,      /* The "name" in package.json. */
  bundledDeps: ['axios'],
  // exclude lambda code in favour of custom esbuild compiling
  excludeTypescript: ['src/lambda/**/*', 'playground/**/*'],
});
project.npmignore!.exclude('scripts/');
project.npmignore!.exclude('playground/');
project.gitignore!.exclude('playground/');
project.compileTask.exec('ts-node ./scripts/buildLambdas.ts');
project.synth();
