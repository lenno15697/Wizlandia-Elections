"""Regenerate browser constants after editing the Python model: python tools/export_data.py."""
import importlib.util
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('wizlandia', root / 'python/wizlandia_election_simulator.py')
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)
summaries = [
    'Market liberal; classical liberal and national liberal factions. Strong defence and national sovereignty.',
    'Centrist and moderately pro-market. Families, public services, social cohesion and work-linked welfare.',
    'Social democracy, stronger labour institutions, redistribution and expanded public services.',
    'Social conservatism, religious school choice, rural communities, farmers and fishermen.',
    'Cosmopolitan green liberalism, low-carbon energy, civil liberties and international cooperation.',
    'National conservatism, immigration restriction, protectionism and fewer overseas commitments.',
    'Private property, personal freedom, fiscal restraint and a substantially smaller state.',
    'Democratic socialism, redistribution, social liberalism and Violetist minority interests.',
    'Communism and a fundamental transformation of economic ownership and political institutions.',
]
data = dict(
    parties=[dict(code=c, name=n, color=k, x=float(p[0]), y=float(p[1]), description=d)
             for c,n,k,p,d in zip(m.CODES,m.NAMES,m.COLORS,m.POINTS,summaries)],
    types=[dict(id=i,name=n,count=c,x=x,y=y) for i,n,c,x,y in m.DISTRICT_ROWS],
    center=m.CENTER.tolist(), weights=m.WEIGHTS.tolist(), means=m.MEANS.tolist(),
    covariances=m.COVARIANCES.tolist(), gaussNodes=m.GAUSS_NODES.tolist(),
    gaussWeights=m.GAUSS_WEIGHTS.tolist(), baseline=m.BASELINE_SEATS.tolist(),
    targets=m.TARGETS.tolist(), spread=m.DISTRICT_SPREAD,
    prSeatCount=m.PR_SEAT_COUNT, displayOrder=m.DISPLAY_ORDER,
    baselinePr=m.BASELINE_PR_SEATS.tolist(), baselineCombined=m.BASELINE_COMBINED_SEATS.tolist(),
)
(root / 'data.js').write_text('/* Model constants exported from python/wizlandia_election_simulator.py. */\n(function(root){\nconst data = '+json.dumps(data,ensure_ascii=False,indent=2)+';\nif(typeof module!=="undefined" && module.exports) module.exports=data;\nelse root.WizlandiaData=data;\n})(typeof window!=="undefined"?window:globalThis);\n')
print('Exported data.js')
