import slack
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path('./api/') / '.env'
load_dotenv(dotenv_path=env_path)

client = slack.WebClient(token=os.environ['SLACK_TOKEN'])


def text_channel(channel_id, message):
    response = client.chat_postMessage(
        channel=channel_id,
        text=message
    )
    return response


def dm_user(user_id, message):
    response = client.chat_postMessage(
        channel=user_id,
        text=message
    )
    return response

