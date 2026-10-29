"""Apply the authorized LQ-13/EW-24 profile permutation to version 9 metadata."""
from pathlib import Path
import csv, hashlib, json, struct

root=Path(__file__).resolve().parents[1]
h=json.loads((root/'district-geography.json').read_text())
audit=json.loads((root/'district_permutations.json').read_text())
assert h['compassPermutationVersion']==audit['version']==9
by_id={d['id']:d for d in h['districts']}
fields=audit['politicalFields']
ids=['LQ-13','EW-24']
before={i:{k:by_id[i][k] for k in fields} for i in ids}
assert before['LQ-13']['type']==20 and before['EW-24']['type']==14
for a,b in [ids,ids[::-1]]:
    by_id[a].update(before[b])
    audit['effectiveReceives'][a]=b
    audit['changes'].append(dict(district=a,receivesFrom=b,before=before[a],after=before[b]))
audit['changes'].sort(key=lambda d:d['district'])
audit['version']=h['compassPermutationVersion']=10
audit['orderedSwaps'].append(ids)
latest=dict(version=10,orderedSwaps=[ids],simultaneousReceives={ids[0]:ids[1],ids[1]:ids[0]},changes=[dict(district=a,receivesFrom=b,before=before[a],after=before[b]) for a,b in [ids,ids[::-1]]])
audit['latestPermutation']=latest
audit['permutationHistory'].append(latest)
def digest(rows,keys):
    m=hashlib.sha256()
    for row in sorted(rows,key=lambda d:d['id']):
        for k in keys:
            v=row[k]
            m.update(b'n'+struct.pack('>d',v) if isinstance(v,(int,float)) else b's'+v.encode()+b'\0')
    return m.hexdigest()
assert digest(h['districts'],audit['identityFields'])==audit['identityHash']
audit['unaffectedPoliticalHash']=digest([d for d in h['districts'] if d['id'] not in audit['effectiveReceives']],['id']+fields)
(root/'district-geography.json').write_text(json.dumps(h,ensure_ascii=False,indent=2)+'\n')
(root/'district-geography.js').write_text('/* Proposed geographic identities; original model indices remain stable. */\n(function(root){const data='+json.dumps(h,ensure_ascii=False,separators=(',',':'))+';\nif(typeof module!=="undefined"&&module.exports)module.exports=data;else root.WizlandiaGeography=data;\n})(typeof window!=="undefined"?window:globalThis);\n')
(root/'district_permutations.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
with (root/'district_register.csv').open(newline='') as f:
    columns=next(csv.reader(f))
with (root/'district_register.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=columns);writer.writeheader();writer.writerows(h['districts'])
columns=['district','receives_from','locality','old_type_id','old_type','new_type_id','new_type','old_legacy_id','new_legacy_id','old_economy','old_culture','new_economy','new_culture']
with (root/'district_permutation_changes.csv').open('w',newline='') as f:
    writer=csv.writer(f);writer.writerow(columns)
    for c in audit['changes']:
        b,a=c['before'],c['after']
        writer.writerow([c['district'],c['receivesFrom'],by_id[c['district']]['locality'],b['type'],b['typeName'],a['type'],a['typeName'],b['legacyId'],a['legacyId'],b['x'],b['y'],a['x'],a['y']])
print('Applied LQ-13/EW-24; 40 retained transfers, unchanged identity hash and type counts.')
