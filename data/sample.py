import json
import random

k = 1000
sample = []

with open("documents.jsonl", "r") as f:
    for i, line in enumerate(f, 1):
        obj = json.loads(line)
        if i <= k:
            sample.append(obj)
        else:
            j = random.randint(1, i)
            if j <= k:
                sample[j - 1] = obj

with open("sample.jsonl", "w") as f:
    for obj in sample:
        f.write(json.dumps(obj) + "\n")