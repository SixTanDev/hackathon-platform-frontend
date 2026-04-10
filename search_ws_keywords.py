import json

file_path = r'C:\Users\JhonZapata\.gemini\antigravity\brain\9211c442-88c7-4172-b3c7-b1359d06e47b\.system_generated\steps\374\content.md'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    json_start = content.find('{"openapi"')
    if json_start != -1:
        data = json.loads(content[json_start:])
        
        # Search for any mention of ws, live, real-time, notification
        keywords = ['ws', 'live', 'real-time', 'notification', 'websocket', 'event']
        found = False
        for path, methods in data.get('paths', {}).items():
            for method, details in methods.items():
                if any(k in str(details).lower() for k in keywords):
                    print(f"Match in {method.upper()} {path}")
                    found = True
        
        if not found:
            print("No keywords found in paths.")
    else:
        print("JSON not found")
