import { WebClient } from '@slack/web-api';
import { SNSHandler } from 'aws-lambda';

const slackWebClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export const handler: SNSHandler = async (event) => {
  try {
    const message = JSON.parse(event.Records[0].Sns.Message);
    await slackWebClient.chat.postMessage({
      text: message.Message,
      channel: process.env.SLACK_CHANNEL as string,
    });
  } catch (error) {
    console.error(error);
  }
};
