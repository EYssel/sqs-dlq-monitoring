import { WebClient } from '@slack/web-api';
import { SNSEvent, SNSHandler } from 'aws-lambda';
import { AlarmMessage } from '../alarmMessage';

const slackWebClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export const handler: SNSHandler = async (event: SNSEvent) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);

    await slackWebClient.chat.postMessage({
      text: getTextMessage(message),
      channel: process.env.SLACK_CHANNEL as string,
    });
  } catch (error) {
    console.error(error);
  }
};

function getTextMessage(message: AlarmMessage) {
  return `${message.AlarmName} state is now ${message.NewStateValue} at ${message.StateChangeTime}`;
}
