# sqs-dlq-monitoring

- [sqs-dlq-monitoring](#sqs-dlq-monitoring)
- [Getting Started](#getting-started)
  - [Example](#example)
    - [Install the package:](#install-the-package)
    - [Import the construct into your stack:](#import-the-construct-into-your-stack)
  - [API](#api)
- [Why?](#why)
- [Deployed Infrastructure](#deployed-infrastructure)
- [Setting up Email notifications](#setting-up-email-notifications)
  - [`emails`](#emails)
  - [Example](#example-1)
- [Setting up Slack notifications](#setting-up-slack-notifications)
  - [Slack App](#slack-app)
  - [`slackToken`](#slacktoken)
  - [`slackChannel`](#slackchannel)
  - [Example](#example-2)
- [Contributing](#contributing)
  - [How to get started with local development?](#how-to-get-started-with-local-development)
    - [Tips](#tips)
      - [Create a "Playground" environment](#create-a-playground-environment)
- [Credits](#credits)

This is an AWS CDK construct which creates an AWS Simple-Queue Service (SQS) queue with an appropriately monitored Dead-Letter Queue (DLQ).

Based on the configuration, this so called `MonitoredQueue` construct will send messages to the specified locations to notify you if messages in the DLQ cross a certain threshold.

The following messaging locations are available:

- Email
- Slack

___

# Getting Started

## Example

Here is an example for how to use this construct in your AWS CDK TypeScript project.

After setting up your AWS CDK app.

### Install the package:

```npm install sqs-dlq-monitoring```

### Import the construct into your stack:

```ts
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MonitoredQueue } from "sqs-dlq-monitoring";

export class ShowcaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    ...

    new MonitoredQueue(this, 'MonitoredQueue', {
      queueProps: {
        queueName: 'ShowcaseQueue',
        visibilityTimeout: cdk.Duration.seconds(300),
      },
      emails: [
        `email@coolstuff.com`,
        `support@coolstuff.com`,
      ],
      slackProps: {
        slackToken: '...',
        slackChannel: '...',
      },
    });
  }
}

```

## API

For detailed API documentation refer to:

![API Documentation](./API.md)
___

# Why?

SQS is a common part of most AWS infrastructures, and it is recommended to deploy a DLQ alongside it to catch any failed messages.

The problem is that a DLQ can only keep messages for a time of up to 14 days, and if this DLQ is not monitored, developers may not know that any messages have failed.

These messages would then be deleted at the end of the retention period.

This package aims to solve this problem by granting developers an easy way to deploy a solution to monitor and notify them if messages have failed.

Sources:
- https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html#sqs-dead-letter-queues-benefits
- https://medium.com/lumigo/sqs-and-lambda-the-missing-guide-on-failure-modes-7e31644d8722#:~:text=SQS%20with%20Lambda.-,No%20DLQs,-The%20most%20common

___

# Deployed Infrastructure

To support this construct the following infrastucture is deployed:

- SQS Queue
- SQS DLQ
- SNS Topic
- CloudWatch Alarm
- Lambda Function

A representation of the infrastructure can be seen below.

![Infrastructure Diagram](./documentation/infrastructure_diagram.png)

___

# Setting up Email notifications
When using the construct the following parameter is available for setting up a Email notifications:

- `emails`

## `emails`
A list of emails can be provided to the `emails` parameter. 

Please note that a subscription request will be sent out to each email which needs to be accepted.

Be sure to check your Spam folder!

## Example
```ts
{
  ...
  emails: [
    `email@coolstuff.com`,
    `support@coolstuff.com`,
    ...
  ],
}
```

___

# Setting up Slack notifications
When using the construct the following parameters are available for setting up a Slack notification:

In the `slackProps` property:

- `slackToken`
- `slackChannel`

After being set up successfully you will receive messages that look like this when the alarm is triggered:

![Slack Example Messages](./documentation/slack-messages-example.png)

## Slack App
To setup this feature, a Slack App needs to be created and added to the desired workspace which will provide the method for generating a token and providing the correct access for the Lambda Function.

A guide to do so can be found here https://api.slack.com/start/quickstart


## `slackToken`
A Bot User token which will be provided to the `slackToken` parameter. 

The token requires the following scopes: 
  - `chat.write`
  - `chat.write.public`

## `slackChannel`
A channel that the bot will send messages to. 

The channel ID needs to be used as the `slackChannel` parameter.

## Example

```ts
{
  ...
  slackProps: {
    slackToken: "...",
    slackChannel: "..."
  }
  ...
}
```

___

# Contributing

Feel free to create Issues and PR's if you want to contribute to the project!

## How to get started with local development?

1. Clone the project onto your local machine.

2. Run `yarn` to install dependencies

3. Run `yarn build` to compile the project

4. Implement your changes

5. Ensure your changes are tested with `yarn test`

6. Create an Issue and associate your PR with the issue

7. Be sure to document your changes appropriately

### Tips

#### Create a "Playground" environment

1. Create a folder in the root called `playground`

2. Initialise your preffered CDK app

3. Import the package from the `lib/` path in the root.

4. Deploy to your personal AWS account to test


# Credits

Special thanks to the following persons / organisations who helped out directly and indirectly throughout the process.

- Symbiotics Application Services (https://symbiotics.co.za/)
  - Provided the environment and support for the initial development of the idea, and kindly allowed me to recreate this publicly.
- @rehanvdm (https://github.com/rehanvdm)
  - Provided initial inspiration indirectly, and then later helped directly by doing some code review.
- @geekmidas (https://github.com/geekmidas)
  - Motivating me to do this, and mentoring in general.
  - Provided code-review.
- Side-Project Society Discord Server members
  - A discord server set up to motivate each other to work on side-projects like this.
  - It is invaluable to keep me motivated during the process, and to get things done.