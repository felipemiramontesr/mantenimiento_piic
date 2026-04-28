import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

catalogs = [t['data'] for t in db if t.get('name') == 'common_catalogs'][0]
asset_types = [c for c in catalogs if c['category'] == 'ASSET_TYPE']

print("--- CATALOGO DE TIPOS DE ACTIVO ---")
for at in asset_types:
    print(f"ID: {at['id']} | Code: {at['code']} | Label: {at['label']}")
