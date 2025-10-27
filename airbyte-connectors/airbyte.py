import pathway as pw
from dotenv import load_dotenv
import os

load_dotenv()

dev = os.environ["ENV"] == "dev"

pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])



def process_env_vars_config(file):
    connections_dir = './__connections'
    with open(file,'r') as f:
        yaml_config = f.read()
        for key,item in os.environ.items():
            yaml_config = yaml_config.replace('${' + key + '}', f'"{item}"')
    os.makedirs(connections_dir, exist_ok=True)
    new_file = os.path.join(connections_dir,os.path.basename(file))
    with open(new_file,'w') as new_f:
        new_f.write(yaml_config)
    return new_file

market_news = pw.io.airbyte.read(
    process_env_vars_config('./connections/finnhub.yaml'),
    streams=["marketnews"],
    mode = "static" if dev else "streaming"
)


pw.debug.compute_and_print(market_news)