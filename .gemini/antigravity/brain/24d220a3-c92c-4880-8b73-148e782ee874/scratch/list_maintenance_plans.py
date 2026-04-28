import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

catalogs = [t['data'] for t in db if t.get('name') == 'common_catalogs'][0]
plans = [c for c in catalogs if 'MAINTENANCE' in c['category']]

print("--- PLANES DE MANTENIMIENTO ENCONTRADOS ---")
for p in plans:
    print(f"ID: {p['id']} | Category: {p['category']} | Label: {p['label']} | Code: {p['code']}")
