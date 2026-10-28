"""Check possible university winners over the complete allowed shift domain.

Squared nearest-party distance differences are affine in economic shift,
cultural shift and sqrt(variance). Linear programming therefore checks the
continuous domain, rather than only a grid or Monte Carlo sample. A positive
maximum advantage means the party can be the unique nearest party.
"""
from pathlib import Path
import json
import numpy as np
from scipy.optimize import linprog

root = Path(__file__).resolve().parents[1]
snapshot = json.loads((root / 'analysis/university_shift_before.json').read_text())
parties = snapshot['beforeData']['parties']
centre = np.array(snapshot['beforeData']['center'])
report = {}
for label, key in [('before', 'oldDistricts'), ('after', 'newDistricts')]:
    report[label] = {}
    for district in snapshot[key]:
        point = np.array([district['x'], district['y']])
        results = {}
        for party in parties:
            p = np.array([party['x'], party['y']])
            matrix, bounds = [], []
            for opponent in parties:
                if opponent['code'] == party['code']:
                    continue
                q = np.array([opponent['x'], opponent['y']])
                delta = 2 * (q - p)
                matrix.append([delta[0], delta[1], delta @ (point - centre), 1])
                bounds.append(q @ q - p @ p - delta @ centre)
            solution = linprog(
                [0, 0, 0, -1], A_ub=matrix, b_ub=bounds,
                bounds=[(-1, 1), (-1, 1), (np.sqrt(.5), np.sqrt(2)), (None, None)],
                method='highs')
            assert solution.success, solution.message
            results[party['code']] = {
                'maximumSquaredDistanceAdvantage': float(solution.x[3]),
                'possibleUniqueWinner': bool(solution.x[3] > 1e-8),
                'witness': {'economic': float(solution.x[0]),
                            'cultural': float(solution.x[1]),
                            'variance': float(solution.x[2] ** 2)}}
        report[label][district['id']] = results
output = root / 'analysis/university_feasible_winners.json'
stage = output.with_name(output.name + '.partial')
stage.write_text(json.dumps(report, indent=2) + '\n')
stage.replace(output)
for label, districts in report.items():
    print(label, {key: [code for code, item in value.items() if item['possibleUniqueWinner']]
                  for key, value in districts.items()})
