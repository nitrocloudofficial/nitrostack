import re
import json

def test_json_parsing():
    raw_text = """
    Here is the JSON you requested:
    ```json
    {
        "resources": ["vm", "sql"]
    }
    ```
    Hope this helps!
    """
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        json_str = match.group(0)
        data = json.loads(json_str)
        print(f"JSON Parsed: {data}")
    else:
        print("JSON Parse Failed")

def test_bicep_parsing():
    raw_text = """
    Sure, here is the bicep code:
    ```bicep
    resource vm 'Microsoft.Compute/virtualMachines@2021-03-01' = {
        name: 'test-vm'
    }
    ```
    """
    match = re.search(r'```bicep(.*?)```', raw_text, re.DOTALL)
    if match:
        print(f"Bicep Parsed: {match.group(1).strip()}")
    else:
        print("Bicep Parse Failed")

if __name__ == "__main__":
    test_json_parsing()
    test_bicep_parsing()
