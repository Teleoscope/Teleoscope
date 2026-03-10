import pandas as pd

name = "sample_1000"

df = pd.read_json(f"{name}.jsonl", lines=True)
df.to_csv(f"{name}.csv", index=False)