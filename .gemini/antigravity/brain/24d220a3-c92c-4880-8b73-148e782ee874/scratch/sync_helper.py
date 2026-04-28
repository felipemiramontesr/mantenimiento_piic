import csv
import re

def clean_num(val):
    if not val: return 0
    clean = str(val).replace(',', '').replace('"', '').strip()
    try: return float(clean)
    except: return 0

def format_date(d):
    if not d: return 'NULL'
    parts = d.split('/')
    if len(parts) != 3: return 'NULL'
    month = parts[0].zfill(2)
    day = parts[1].zfill(2)
    year = '20' + parts[2]
    return f"'{year}-{month}-{day}'"

with open('tablaCliente/temp_flotilla.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    lines = list(reader)
    
sql = "-- 🔱 ARCHON MASTER SYNC v.39.9.3.2\n"
sql += "SET FOREIGN_KEY_CHECKS = 0;\n\n"
sql += "INSERT IGNORE INTO common_catalogs (category, parent_id, code, label, is_active) VALUES ('MODEL', 33, 'M_RAM_4000', 'RAM 4000', '1');\n\n"

for row in lines:
    if not row: continue
    found_id = None
    for col in row:
        match = re.search(r'(ASM-\d{3})', str(col))
        if match:
            found_id = match.group(1)
            break
    if not found_id: continue
    
    try:
        # Col 11: Int Dias, Col 12: Int KM, Col 13: Prom Diario, Col 14: Actual, Col 15: Ultimo, Col 16: Fecha
        int_days = clean_num(row[11])
        int_km = clean_num(row[12])
        avg_usage = clean_num(row[13])
        curr_km = clean_num(row[14])
        last_km = clean_num(row[15])
        last_date = format_date(row[16])
        
        sql += f"UPDATE fleet_units SET "
        sql += f"odometer = {curr_km}, current_reading = {curr_km}, last_service_reading = {last_km}, "
        sql += f"last_service_date = {last_date}, daily_usage_avg = {avg_usage}, "
        sql += f"maint_interval_days = {int_days}, maint_interval_km = {int_km}, asset_type_id = 1 "
        
        if found_id == 'ASM-011':
            sql += ", model_id = (SELECT id FROM common_catalogs WHERE code = 'M_RAM_4000' LIMIT 1), modelo = '4000' "
            
        sql += f"WHERE id = '{found_id}';\n"
    except: continue

sql += "\nSET FOREIGN_KEY_CHECKS = 1;"
with open('.gemini/antigravity/brain/24d220a3-c92c-4880-8b73-148e782ee874/scratch/final_sync.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
print("SQL GENERATED SUCCESSFULLY")
