import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

fleet = [t['data'] for t in db if t.get('name') == 'fleet_units'][0]
print("--- REVISION DE IDS EN UNIDADES ---")
for unit in fleet[:10]:
    print(f"Unidad: {unit['id']} | Usage Freq ID: {unit.get('maintenance_usage_freq_id')} | Time Freq ID: {unit.get('maintenance_time_freq_id')}")
