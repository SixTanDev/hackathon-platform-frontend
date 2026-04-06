import json

file_path = r'C:\Users\JhonZapata\.gemini\antigravity\brain\9211c442-88c7-4172-b3c7-b1359d06e47b\.system_generated\steps\374\content.md'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    json_start = content.find('{"openapi"')
    if json_start != -1:
        data = json.loads(content[json_start:])
        status_schema = data.get('components', {}).get('schemas', {}).get('HackathonStatus', {})
        print(json.dumps(status_schema, indent=2))
    else:
        print("JSON not found")
