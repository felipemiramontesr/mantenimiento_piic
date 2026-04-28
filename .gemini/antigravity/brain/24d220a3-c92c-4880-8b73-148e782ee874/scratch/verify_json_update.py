import json
with open('packages/database/recent/u701509674_Mant_piic.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

results = []
for table in db:
    for i, row in enumerate(table.get('data', [])):
        for key, value in row.items():
            if value == "Maquinaria":
                results.append(f"Table: {table['name']} | Row: {i} | Column: {key} | ID: {row.get('id')}")

print("--- HALLAZGOS DE MAQUINARIA ---")
for r in results:
    print(r)
