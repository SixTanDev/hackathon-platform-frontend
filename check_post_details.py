import json

file_path = r'C:\Users\JhonZapata\.gemini\antigravity\brain\9211c442-88c7-4172-b3c7-b1359d06e47b\.system_generated\steps\374\content.md'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    json_start = content.find('{"openapi"')
    if json_start != -1:
        data = json.loads(content[json_start:])
        post_hackathon = data.get('paths', {}).get('/api/v1/hackathons', {}).get('post', {})
        print(json.dumps(post_hackathon, indent=2))
        
        # Also check if there are other hackathon paths I missed
        for path in data.get('paths', {}):
            if 'hackathon' in path.lower() and ('post' in data['paths'][path] or 'put' in data['paths'][path]):
                 print(f"Path: {path}")
    else:
        print("JSON not found")
