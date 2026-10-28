"""Matched LIB outcomes and a continuous-domain upper bound for the shrink."""
from pathlib import Path
import json
import subprocess
import sys
import numpy as np
from scipy.optimize import linprog

root = Path(__file__).resolve().parents[1]
snapshot = json.loads((root / 'analysis/economic_compression_before.json').read_text())
samples = int(sys.argv[1]) if len(sys.argv) > 1 else 100000
seed = int(sys.argv[2]) if len(sys.argv) > 2 else 20261028
assert 0 < samples and 0 <= seed <= 4294967295
node = """const E=require(process.argv[1]),n=Number(process.argv[2]),rng=new E.Mulberry32(Number(process.argv[3]));
const shocks=Array.from({length:n},()=>{const s=E.drawShocks(rng);return[s.economic,s.cultural,s.variance]});
const checks=shocks.slice(0,200).map(s=>E.evaluate(...s).districtSeats[6]);process.stdout.write(JSON.stringify({shocks,checks}));"""
generated = json.loads(subprocess.run(['node', '-e', node, str(root/'engine.js'), str(samples), str(seed)], check=True, text=True, capture_output=True).stdout)
shocks = np.array(generated['shocks'])
parties = np.array([[p['x'], p['y']] for p in snapshot['beforeData']['parties']])
centre = np.array(snapshot['beforeData']['center'])
lib = 6
results = {}
for label, key in [('before', 'beforePoints'), ('after', 'afterPoints')]:
    points = snapshot[key]
    candidates, advantages = [], {}
    for point in points:
        z = np.array([point['x'], point['y']])
        matrix, bounds = [], []
        for j, other in enumerate(parties):
            if j == lib:
                continue
            delta = 2 * (other - parties[lib])
            matrix.append([delta[0], delta[1], delta @ (z-centre), 1])
            bounds.append(other @ other - parties[lib] @ parties[lib] - delta @ centre)
        opt = linprog([0, 0, 0, -1], A_ub=matrix, b_ub=bounds,
                      bounds=[(-1, 1), (-1, 1), (np.sqrt(.5), np.sqrt(2)), (None, None)], method='highs')
        assert opt.success
        advantages[point['id']] = float(opt.x[3])
        if opt.x[3] >= -1e-8:
            candidates.append(point)

    def counts(scenarios):
        outcome = np.zeros(len(scenarios), dtype=int)
        wins = np.zeros(len(candidates), dtype=int)
        if not candidates:
            return outcome, wins
        coordinates = np.array([[d['x'], d['y']] for d in candidates])
        for start in range(0, len(scenarios), 5000):
            chunk = scenarios[start:start+5000]
            scale = np.sqrt(chunk[:, 2, None])
            x = centre[0] + chunk[:, 0, None] + scale * (coordinates[None, :, 0] - centre[0])
            y = centre[1] + chunk[:, 1, None] + scale * (coordinates[None, :, 1] - centre[1])
            distance = (x-parties[lib, 0])**2 + (y-parties[lib, 1])**2
            valid = np.ones(distance.shape, dtype=bool)
            ties = np.full(distance.shape, 1 << lib, dtype=np.uint16)
            for j, party in enumerate(parties):
                if j == lib:
                    continue
                gap = (x-party[0])**2 + (y-party[1])**2 - distance
                valid &= gap >= -1e-9
                ties |= np.where(np.abs(gap) < 1e-9, 1 << j, 0).astype(np.uint16)
            for r, c in np.argwhere(valid & (ties != 1 << lib)):
                tied = [j for j in range(9) if ties[r, c] & (1 << j)]
                valid[r, c] = tied[candidates[c]['index'] % len(tied)] == lib
            outcome[start:start+len(chunk)] = valid.sum(axis=1)
            wins += valid.sum(axis=0)
        return outcome, wins

    outcomes, victories = counts(shocks)
    corner, _ = counts(np.array([[1., -1., 2.]]))
    results[label] = {
        'meanSeats': float(outcomes.mean()), 'probabilityAnySeat': float(np.mean(outcomes > 0)),
        'probabilityFiveOrMore': float(np.mean(outcomes >= 5)), 'probabilityTenOrMore': float(np.mean(outcomes >= 10)),
        'quantiles': {str(q): float(np.quantile(outcomes, q)) for q in [.5, .9, .95, .99, .999]},
        'maximumObserved': int(outcomes.max()), 'bestCornerSeats': int(corner[0]),
        'feasibleDistricts': len(candidates), 'maximumCertified': bool(corner[0] == len(candidates)),
        'histogram': {str(int(k)): int(v) for k, v in zip(*np.unique(outcomes, return_counts=True))},
        'districtWinProbabilities': {d['id']: float(v/samples) for d, v in zip(candidates, victories)},
        'maximumSquaredDistanceAdvantages': advantages}
    if label == 'after':
        assert outcomes[:len(generated['checks'])].tolist() == generated['checks']
        assert np.all(outcomes <= old_outcomes), 'A leftward-only shift cannot improve LIB against parties to its left'
    else:
        old_outcomes = outcomes

report = {'samples': samples, 'seed': seed, 'compression': snapshot['config'], **results,
          'meanSeatReduction': results['before']['meanSeats']-results['after']['meanSeats'],
          'scenariosLosingLIBSeats': int(np.sum(old_outcomes > outcomes)),
          'prVotesAndSeatsUnchanged': True,
          'boundMethod': 'For each district, maximize its nearest-party advantage for LIB over economic/cultural shifts in [-1,1] and sqrt(variance) in [sqrt(.5),sqrt(2)]. Count feasible districts. If the shared corner (1,-1,2) wins them all, this upper bound is attained and certifies the exact maximum.'}
output = root / 'analysis/economic_compression_results.json'
stage = output.with_name(output.name+'.partial')
stage.write_text(json.dumps(report, indent=2)+'\n')
stage.replace(output)
print(json.dumps({key: {k:v for k,v in value.items() if k in ['meanSeats','probabilityAnySeat','maximumObserved','bestCornerSeats','feasibleDistricts','maximumCertified','quantiles']} for key,value in results.items()}))
