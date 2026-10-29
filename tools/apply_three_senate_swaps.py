"""Apply the three authorized swaps to permutation version 10 exactly once."""
from pathlib import Path
import csv,hashlib,json,struct
root=Path(__file__).resolve().parents[1]
h=json.loads((root/'district-geography.json').read_text())
audit=json.loads((root/'district_permutations.json').read_text())
assert audit['version']==h['compassPermutationVersion']==10
pairs=[['NX-43','AX-49'],['NX-95','ET-32'],['QL-10','WT-10']]
by_id={d['id']:d for d in h['districts']};fields=audit['politicalFields']
profile=lambda d:{k:d[k] for k in fields}
original={i:profile(d) for i,d in by_id.items()}
original.update({c['district']:c['before'] for c in audit['changes']})
sources={i:audit['effectiveReceives'].get(i,i) for i in by_id}
before={i:profile(by_id[i]) for pair in pairs for i in pair}
receives={}
for a,b in pairs:
    by_id[a].update(before[b]);by_id[b].update(before[a])
    sources[a],sources[b]=sources[b],sources[a]
    receives[a]=b;receives[b]=a
audit['effectiveReceives']={i:s for i,s in sources.items() if i!=s}
audit['changes']=[dict(district=i,receivesFrom=s,before=original[i],after=profile(by_id[i])) for i,s in sorted(audit['effectiveReceives'].items())]
for c in audit['changes']:assert c['after']==original[c['receivesFrom']]
latest=dict(version=11,orderedSwaps=pairs,simultaneousReceives=receives,changes=[dict(district=i,receivesFrom=s,before=before[i],after=profile(by_id[i])) for i,s in receives.items()])
audit['latestPermutation']=latest;audit['permutationHistory'].append(latest);audit['orderedSwaps'].extend(pairs)
audit['version']=h['compassPermutationVersion']=11
def digest(rows,keys):
    result=hashlib.sha256()
    for row in sorted(rows,key=lambda d:d['id']):
        for key in keys:
            v=row[key];result.update(b'n'+struct.pack('>d',v) if isinstance(v,(int,float)) else b's'+v.encode()+b'\0')
    return result.hexdigest()
assert digest(h['districts'],audit['identityFields'])==audit['identityHash']
audit['unaffectedPoliticalHash']=digest([d for d in h['districts'] if d['id'] not in audit['effectiveReceives']],['id']+fields)
(root/'district-geography.json').write_text(json.dumps(h,ensure_ascii=False,indent=2)+'\n')
(root/'district-geography.js').write_text('/* Proposed geographic identities; original model indices remain stable. */\n(function(root){const data='+json.dumps(h,ensure_ascii=False,separators=(',',':'))+';\nif(typeof module!=="undefined"&&module.exports)module.exports=data;else root.WizlandiaGeography=data;\n})(typeof window!=="undefined"?window:globalThis);\n')
(root/'district_permutations.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
with (root/'district_register.csv').open(newline='') as f:columns=next(csv.reader(f))
with (root/'district_register.csv').open('w',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=columns);writer.writeheader();writer.writerows(h['districts'])
with (root/'district_permutation_changes.csv').open('w',newline='') as f:
    writer=csv.writer(f);writer.writerow(['district','receives_from','locality','old_type_id','old_type','new_type_id','new_type','old_legacy_id','new_legacy_id','old_economy','old_culture','new_economy','new_culture'])
    for c in audit['changes']:
        b,a=c['before'],c['after'];writer.writerow([c['district'],c['receivesFrom'],by_id[c['district']]['locality'],b['type'],b['typeName'],a['type'],a['typeName'],b['legacyId'],a['legacyId'],b['x'],b['y'],a['x'],a['y']])
print('Applied all three swaps, composed with earlier permutations. Total affected districts:',len(audit['changes']))
