import json
d=json.loads(open(r'C:\Users\JhonZapata\.gemini\antigravity\brain\ac294ff7-25ee-46ef-b0e1-de0c02aa8e37\.system_generated\steps\113\content.md', encoding='utf-8').readlines()[4])
for k, m in d['paths'].items():
  for _, v in m.items():
    if 'superadmin' in k.lower() or 'superadmin' in str(v).lower():
      print(f'{k}: {v.get("summary", "")} - {v.get("description", "")}')
