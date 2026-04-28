import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

fleet = [t['data'] for t in db if t.get('name') == 'fleet_units'][0]
missing = [u for u in fleet if float(u.get('monthly_lease_payment', 0)) == 0]

print("--- UNIDADES SIN COSTO ASIGNADO ---")
if not missing:
    print("¡Todas las unidades tienen costo!")
else:
    for u in missing:
        print(f"ID: {u['id']} | Modelo: {u.get('modelo', 'N/A')}")
