import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

catalogs = [t['data'] for t in db if t.get('name') == 'common_catalogs'][0]
bad_freqs = [c for c in catalogs if c['label'] == 'Maquinaria' and c['category'] in ['MAINTENANCE_TIME_FREQ', 'MAINTENANCE_USAGE_FREQ']]

print("--- FRECUENCIAS CORRUPTAS EN CATALOGO ---")
for f in bad_freqs:
    print(f"ID: {f['id']} | Category: {f['category']} | Code: {f['code']}")
