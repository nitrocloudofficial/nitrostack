import os, glob, re

for f in glob.glob('nitro/agents/**/__init__.py', recursive=True):
    with open(f, 'r') as file:
        content = file.read()
    if 'description=' in content:
        content = re.sub(r',\s*description="[^"]*"', '', content)
        with open(f, 'w') as file:
            file.write(content)
        print(f"Fixed {f}")
