import json
import csv
import re
from datetime import datetime, timedelta

def clean_num(val):
    if not val: return 0
    try: return float(str(val).replace(',', '').replace('"', '').strip())
    except: return 0

def parse_csv_date(d):
    if not d: return None
    try:
        parts = d.split('/')
        return datetime(2000 + int(parts[2]), int(parts[0]), int(parts[1]))
    except: return None

# Load CSV
with open('tablaCliente/temp_flotilla.csv', 'r', encoding='utf-8') as f:
    csv_lines = list(csv.reader(f))

csv_data = {}
for row in csv_lines[11:]:
    if not row: continue
    match = re.search(r'(ASM-\d{3})', row[0])
    if not match: continue
    uid = match.group(1)
    csv_data[uid] = {
        'int_days': clean_num(row[11]),
        'int_km': clean_num(row[12]),
        'avg_usage': clean_num(row[13]),
        'curr_km': clean_num(row[14]),
        'last_km': clean_num(row[15]),
        'last_date': parse_csv_date(row[16])
    }

# Load JSON
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)
    units = [t['data'] for t in db if t.get('name') == 'fleet_units'][0]

print("--- AUDITORÍA DE PARIDAD (CSV vs JSON) ---")
mismatches = 0
today = datetime.now()
vencidas = []

for uid, csv_v in csv_data.items():
    db_unit = next((u for u in units if u['id'] == uid), None)
    if not db_unit:
        print(f"[!] {uid} no encontrada en la base de datos.")
        continue
    
    # Check parity
    diffs = []
    if abs(clean_num(db_unit['odometer']) - csv_v['curr_km']) > 0.1: diffs.append(f"KM Actual: {db_unit['odometer']} vs {csv_v['curr_km']}")
    if abs(clean_num(db_unit['last_service_reading']) - csv_v['last_km']) > 0.1: diffs.append(f"KM Último: {db_unit['last_service_reading']} vs {csv_v['last_km']}")
    if abs(clean_num(db_unit['daily_usage_avg']) - csv_v['avg_usage']) > 0.1: diffs.append(f"Uso Diario: {db_unit['daily_usage_avg']} vs {csv_v['avg_usage']}")
    
    if diffs:
        print(f"[X] {uid} tiene discrepancias: {', '.join(diffs)}")
        mismatches += 1
    
    # Predict Overdue (Logic: Earliest of KM or Date)
    next_service_km = csv_v['last_km'] + csv_v['int_km']
    next_service_date = csv_v['last_date'] + timedelta(days=csv_v['int_days']) if csv_v['last_date'] else None
    
    is_overdue_km = csv_v['curr_km'] >= (next_service_km - 0.1)
    is_overdue_date = next_service_date <= today if next_service_date else False
    
    if is_overdue_km or is_overdue_date:
        reason = "KM" if is_overdue_km else "FECHA"
        if is_overdue_km and is_overdue_date: reason = "AMBAS"
        vencidas.append(f"{uid} ({reason})")

if mismatches == 0:
    print("--- PARIDAD CERTIFICADA AL 100% ---")
else:
    print(f"--- SE ENCONTRARON {mismatches} DISCREPANCIAS ---")

print(f"Total Vencidas: {len(vencidas)}")
print("Unidades Vencidas: " + ", ".join(vencidas))
