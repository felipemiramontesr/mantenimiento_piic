import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

catalogs = [t['data'] for t in db if t.get('name') == 'common_catalogs'][0]
freqs = [c for c in catalogs if c['category'] in ['FREQ_TIME', 'FREQ_USAGE']]

print("--- REGISTROS DE FRECUENCIA ENCONTRADOS ---")
for f in freqs:
    print(f"ID: {f['id']} | Category: {f['category']} | Label: {f['label']}")
