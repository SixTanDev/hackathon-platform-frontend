import json

file_path = r'C:\Users\JhonZapata\.gemini\antigravity\brain\9211c442-88c7-4172-b3c7-b1359d06e47b\.system_generated\steps\374\content.md'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
    # Find the JSON part (it starts at line 5 according to view_file)
    json_start = content.find('{"openapi"')
    if json_start != -1:
        data = json.loads(content[json_start:])
        
        print("--- Paths ---")
        for path, methods in data.get('paths', {}).items():
            for method, details in methods.items():
                summary = details.get('summary', 'No summary')
                description = details.get('description', '')
                tags = details.get('tags', [])
                print(f"{method.upper()} {path} - {summary}")
                if description:
                    print(f"  Description: {description}")
                if tags:
                    print(f"  Tags: {tags}")
        
        print("\n--- Components Search ---")
        # Search for any mention of 'tutor' in schemas
        schemas = data.get('components', {}).get('schemas', {})
        for name, schema in schemas.items():
            if 'tutor' in str(schema).lower() or 'tutor' in name.lower():
                print(f"Found 'tutor' in schema: {name}")

    else:
        print("JSON not found in content.")
