import axios from 'axios';
import { AlarmMessage } from '../alarmMessage';

const SLACK_CHAT_POST_MESSAGE_ENDPOINT =
  'https://slack.com/api/chat.postMessage';

export const handler = async (event) => {
  try {
    const message: AlarmMessage = JSON.parse(event.Records[0].Sns.Message);

    await axios.post(
      SLACK_CHAT_POST_MESSAGE_ENDPOINT,
      {
        channel: process.env.SLACK_CHANNEL,
        text: getTextMessage(message),
      },
      {
        headers: {
          ContentType: 'application/json',
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        },
      },
    );

  } catch (error) {
    console.error(error);
  }
};

function getTextMessage(message: AlarmMessage) {
  return `${message.AlarmName} state is now ${message.NewStateValue} at ${message.StateChangeTime}`;
}
