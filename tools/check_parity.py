"""Check the browser engine against Python/SciPy, and refresh a portable fixture."""
import importlib.util
import itertools
import json
import subprocess
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wizlandia',root/'python/wizlandia_election_simulator.py')
m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
scenarios=list(itertools.product([-1,0,1],[-1,0,1],[.5,1,2]))
scenarios += [(e.economic,e.cultural,e.variance) for e in m.simulate_elections(30)[1:]]
scenarios += [(0,.5,1)]
records=[]
for e,c,v in scenarios:
    result=m.evaluate(e,c,v)
    records.append(dict(economic=e,cultural=c,variance=v,seats=result.seats.tolist(),votes=result.votes.tolist()))
fixture=dict(centres=m.INDIVIDUAL_CENTRES.tolist(),scenarios=records,
             shocks=[dict(economic=e.economic,cultural=e.cultural,variance=e.variance)
                     for e in m.simulate_elections(10)[1:]])
(root/'tests/python-reference.json').write_text(json.dumps(fixture,separators=(',',':'))+'\n')
subprocess.run(['node',str(root/'tests/model.test.js')],check=True)
print('Python/SciPy parity passed across',len(records),'scenarios.')
