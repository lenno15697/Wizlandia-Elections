#!/usr/bin/env python3
"""Interactive Wizlandia election simulator: 400 district + 400 parallel PR seats.

Install:
    python -m pip install numpy scipy matplotlib
Run:
    python wizlandia_election_simulator.py
Headless export:
    python wizlandia_election_simulator.py --no-show --output election.png --csv elections.csv
Model checks:
    python wizlandia_election_simulator.py --self-test

Controls: economic and cultural shifts in [-1.00, +1.00], variance multiplier
in [0.50, 2.00]. Click a history bar, use Previous/Next, or draw a new sequence.
Hover over the compass to inspect individual districts, or over a seat bar for votes.

Both voter coordinates and district centres transform according to
    z_t = CENTER + (economic_shift, cultural_shift)
          + sqrt(variance_multiplier) * (z_0 - CENTER).
Thus variance, not standard deviation, is multiplied by the variance slider.

The nationwide three-Gaussian mixture supplies national first-preference
vote shares. The separate, illustrative 50-type geographic model supplies
400 district seats by nearest party. The national mixture alone does not
determine district boundaries or the distribution inside each district.
The national marginal median is X=2.0; this is not the median of district
centres. Nearest-party district winners have the intended Condorcet/Ranked
Pairs interpretation under Euclidean preferences and centrally symmetric
within-district electorates.

District baseline seats: LDP 186, CA 170, SDP 18, CON 20, GRN 6, all others zero.
PR seats use nationwide largest remainder (Hare quota), without a threshold.
They are added to district seats: 800 total seats and a majority of 401.
National baseline votes: 31%, 25%, 11%, 10%, 8%, 7%, 4%, 3%, 1%.
Each district has its own fixed, tiny offset from its type centre (at most
0.20 compass units). Antithetic offsets preserve each type mean. The radius
is capped at 80% of the nearest baseline party boundary distance, preserving
the calibrated baseline. Offsets are generated once, never redrawn per election.
Exact individual ties use a deterministic district-ID rule.

Random elections are independent shocks around the SAME baseline, not a
cumulative random walk. Rejection sampling enforces the slider bounds.
Random shock SDs are illustrative: economic .35, cultural .25, and log
variance .20. Log variance has mean .20**2 = .04, so the continuous PDF
satisfies f(V) = f(1/V). The reciprocal bounds [.5, 2] preserve this property.
Economic and cultural shifts are rounded to two decimals; variance draws
remain continuous (display values may be rounded). The seeded generator is
reproducible. All data, including geographic district identities, are embedded.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from dataclasses import dataclass
from functools import lru_cache
import math

import numpy as np
from numpy.polynomial.legendre import leggauss
from scipy.special import ndtr


CODES = ["LDP", "CA", "SDP", "CON", "GRN", "NF", "LIB", "UPL", "SWP"]
DISPLAY_ORDER = [8, 7, 2, 4, 1, 0, 3, 6, 5]  # SWP, UPL, SDP, GRN, CA, LDP, CON, LIB, NF
PR_SEAT_COUNT = 400
NAMES = [
    "Liberal Democratic Party", "Civic Alliance", "Social Democratic Party",
    "Conservative Party", "Green Party", "National Front", "Libertarian Party",
    "United Progressive Left", "Socialist Workers Party",
]
COLORS = [
    "#000080", "#FF9000", "#C00040", "#60C0FF", "#20A020", "#404040",
    "#F0C000", "#E030C0", "#700000",
]
POINTS = np.array([
    [4.0, -0.5], [0.0, -0.5], [-3.5, -1.5], [2.0, 4.5], [0.0, -5.0],
    [0.0, 8.0], [8.0, -3.0], [-7.5, -8.0], [-9.5, -8.0],
])
TARGETS = np.array([.31, .25, .11, .10, .08, .07, .04, .03, .01])
WEIGHTS = np.array([0.41125786895728933, 0.2734878236831255, 0.31525430735958515])
MEANS = np.array([[3.4642267581522934, -0.20049498176725483], [-1.4020929437915204, -0.2661854623528666], [1.4642267581522932, 0.37867297676123957]])
COVARIANCES = np.array([[[1.833266341899672, 0.8127119119827984], [0.8127119119827984, 4.982604539787757]], [[1.0000000186116198, -8.587214192816174e-09], [-8.587214192816174e-09, 1.0000000039755008]], [[34.229109668897074, 17.724389068072174], [17.724389068072174, 85.24609948614636]]])
CENTER = np.array([2.0, -0.19681012304697498])  # National marginal medians.
STANDARD_DEVIATIONS = np.sqrt(np.diagonal(COVARIANCES, axis1=1, axis2=2))
CORRELATIONS = COVARIANCES[:, 0, 1] / np.prod(STANDARD_DEVIATIONS, axis=1)
SHIFT_RANGE = (-1.0, 1.0)
VARIANCE_RANGE = (.5, 2.0)
SHOCK_STANDARD_DEVIATIONS = (.35, .25, .20)
GAUSS_NODES, GAUSS_WEIGHTS = leggauss(20)
ROOT_TWO_PI = np.sqrt(2.0 * np.pi)


def _cell_pieces(index):
    """Exact cell as vertical slices (x_left, x_right, lower, upper).

    Each finite boundary is y = slope*x + intercept; None is an infinite
    boundary. Party i beats j when 2*(p_j-p_i).z <= |p_j|^2-|p_i|^2.
    """
    lower, upper = [], []
    x_left, x_right = -np.inf, np.inf
    p = POINTS[index]
    for j, q in enumerate(POINTS):
        if j == index:
            continue
        a, b = 2 * (q - p)
        c = q @ q - p @ p
        if abs(b) < 1e-14:
            if a > 0:
                x_right = min(x_right, c / a)
            else:
                x_left = max(x_left, c / a)
        else:
            (upper if b > 0 else lower).append((-a / b, c / b))
    lines = lower + upper
    cuts = [x_left, x_right]
    for k, (a, b) in enumerate(lines):
        for c, d in lines[k + 1:]:
            if abs(a - c) > 1e-14:
                crossing = (d - b) / (a - c)
                if x_left < crossing < x_right:
                    cuts.append(crossing)
    pieces = []
    cuts = sorted(set(cuts))
    for left, right in zip(cuts[:-1], cuts[1:]):
        if np.isneginf(left) and np.isposinf(right):
            test = 0.0
        elif np.isneginf(left):
            test = right - max(1.0, abs(right))
        elif np.isposinf(right):
            test = left + max(1.0, abs(left))
        else:
            test = (left + right) / 2.0
        lo = max(lower, key=lambda line: line[0] * test + line[1]) if lower else None
        hi = min(upper, key=lambda line: line[0] * test + line[1]) if upper else None
        lo_value = lo[0] * test + lo[1] if lo else -np.inf
        hi_value = hi[0] * test + hi[1] if hi else np.inf
        if lo_value < hi_value:
            if pieces and pieces[-1][2:] == (lo, hi) and pieces[-1][1] == left:
                pieces[-1] = (pieces[-1][0], right, lo, hi)
            else:
                pieces.append((left, right, lo, hi))
    return pieces


CELLS = [_cell_pieces(i) for i in range(len(POINTS))]


def transformed_components(economic_shift=0.0, cultural_shift=0.0, variance=1.0):
    """Return election component means and covariances; weights stay fixed."""
    if not np.isfinite(variance) or variance <= 0:
        raise ValueError("The variance multiplier must be positive and finite.")
    shift = np.array([economic_shift, cultural_shift], dtype=float)
    if not np.all(np.isfinite(shift)):
        raise ValueError("Shifts must be finite.")
    means = CENTER + shift + np.sqrt(variance) * (MEANS - CENTER)
    return means, variance * COVARIANCES


def _component_shares(mean, sd, rho):
    """Conditional-normal integration with subdivided Gauss-Legendre rules."""
    mx, my = mean
    sx, sy = sd
    d = np.sqrt(1.0 - rho * rho)
    result = []
    for cell in CELLS:
        total = 0.0
        for left, right, lower, upper in cell:
            lo, hi = max(-12.0, (left - mx) / sx), min(12.0, (right - mx) / sx)
            if lo >= hi:
                continue
            cuts = [lo, hi] + [x for x in [-8., -4., 0., 4., 8.] if lo < x < hi]
            bounds = []
            for line in (lower, upper):
                if line is None:
                    bounds.append(None)
                    continue
                alpha = (line[0] * mx + line[1] - my) / (sy * d)
                beta = (line[0] * sx / sy - rho) / d
                bounds.append((alpha, beta))
                if abs(beta) > 1e-14:
                    for z in [-10., -6., -3., 0., 3., 6., 10.]:
                        t = (z - alpha) / beta
                        if lo < t < hi:
                            cuts.append(t)
            cuts = np.unique(cuts)
            mid = (cuts[:-1] + cuts[1:]) / 2
            half = (cuts[1:] - cuts[:-1]) / 2
            t = mid[:, None] + half[:, None] * GAUSS_NODES
            low = 0.0 if bounds[0] is None else ndtr(bounds[0][0] + bounds[0][1] * t)
            high = 1.0 if bounds[1] is None else ndtr(bounds[1][0] + bounds[1][1] * t)
            integrand = np.exp(-.5 * t * t) / ROOT_TWO_PI * (high - low)
            total += np.sum(half[:, None] * GAUSS_WEIGHTS * integrand)
        result.append(total)
    return np.array(result)


@lru_cache(maxsize=512)
def vote_shares(economic_shift=0.0, cultural_shift=0.0, variance=1.0):
    """Return nine probabilities, not percentages; integrates the full plane."""
    means, _ = transformed_components(economic_shift, cultural_shift, variance)
    sd = np.sqrt(variance) * STANDARD_DEVIATIONS
    return sum(w * _component_shares(mu, s, r)
               for w, mu, s, r in zip(WEIGHTS, means, sd, CORRELATIONS))


def density(x, y, economic_shift=0.0, cultural_shift=0.0, variance=1.0):
    means, _ = transformed_components(economic_shift, cultural_shift, variance)
    sd = np.sqrt(variance) * STANDARD_DEVIATIONS
    total = np.zeros(np.broadcast_shapes(np.shape(x), np.shape(y)))
    for w, mu, s, rho in zip(WEIGHTS, means, sd, CORRELATIONS):
        zx, zy = (x - mu[0]) / s[0], (y - mu[1]) / s[1]
        d = 1 - rho * rho
        total += w * np.exp(-(zx*zx - 2*rho*zx*zy + zy*zy) / (2*d)) / (
            2*np.pi*s[0]*s[1]*np.sqrt(d))
    return total



# The final 50 district types, including the broader LDP spread and the
# two-seat reweighting from skilled-trade to professional-family suburbs.
# The 186--170 calibration places rural commuter belts (type 41) at X=2.60.
# Columns: type ID, name, number of districts, economic X, cultural Y.
DISTRICT_ROWS = [
    (1, "Financial and corporate centres", 8, 4.8, -1.7368101230469748),
    (2, "Affluent inner-city professional districts", 8, 3.65, -2.4368101230469748),
    (3, "Technology and startup districts", 6, 5, -2.576810123046975),
    (4, "Creative and gentrifying inner districts", 10, 0.51, -2.6468101230469747),
    (5, "Established working-class urban districts", 12, -2.17, -1.0368101230469748),
    (6, "Mixed urban service-worker districts", 10, -0.19, -0.756810123046975),
    (7, "Capital-city public-employment districts", 8, 2.1, -1.7368101230469748),
    (8, "Major university and student districts", 6, -1.94, -3.976810123046975),
    (9, "Cosmopolitan merchant and migrant districts", 8, 2.65, -1.876810123046975),
    (10, "Social-housing and old industrial cores", 4, -2.29, -0.05681012304697498),
    (11, "Affluent managerial suburbs", 16, 4.2, -1.0368101230469748),
    (12, "Business-owner and entrepreneurial suburbs", 12, 4.9, -0.19681012304697498),
    (13, "Educated professional family suburbs", 14, 3.3, -1.3168101230469749),
    (14, "Established middle-income homeowner suburbs", 16, 2.55, -0.19681012304697498),
    (15, "Mixed-income commuter suburbs", 16, 0.86, -0.40681012304697495),
    (16, "Skilled-trade and contractor suburbs", 12, 1.98, 0.643189876953025),
    (17, "Rapid-growth outer suburbs", 12, 2.85, 0.433189876953025),
    (18, "Diverse first-home buyer suburbs", 8, 1.96, -0.896810123046975),
    (19, "Environmentally minded garden suburbs", 8, 1.07, -2.6468101230469747),
    (20, "Older, settled middle-class suburbs", 6, 1.35, 0.923189876953025),
    (21, "Wealthy estate and executive exurbs", 4, 5, 1.2731898769530252),
    (22, "Construction-led family exurbs", 4, 3.25, 1.063189876953025),
    (23, "Diversified regional-city centres", 16, 0.93, -0.616810123046975),
    (24, "Regional retail and commercial hubs", 12, 2.4, 0.08318987695302502),
    (25, "Advanced-manufacturing cities", 10, 1.35, -0.19681012304697498),
    (26, "Manufacturing towns", 10, -0.75, -0.05681012304697498),
    (27, "Logistics and warehousing towns", 10, 0.58, 0.36318987695302507),
    (28, "Regional university and college towns", 8, -0.05, -2.4368101230469748),
    (29, "Healthcare and administrative centres", 8, 0.16, -0.896810123046975),
    (30, "Prosperous independent-business towns", 8, 3.5, 0.923189876953025),
    (31, "Declining former industrial towns", 8, -1.45, 1.343189876953025),
    (32, "Rail-connected commuter towns", 6, 0.37, -1.176810123046975),
    (33, "Productive commercial farming districts", 12, 3.75, 1.4831898769530252),
    (34, "Mixed farming and rural-service districts", 8, 3, 1.353189876953025),
    (35, "Export wine, orchard and specialty-crop districts", 8, 4, -0.19681012304697498),
    (36, "Traditional dairy and livestock districts", 8, 1.23, 1.973189876953025),
    (37, "Declining smallholder farming districts", 8, -0.19, 2.183189876953025),
    (38, "Forestry and timber communities", 6, 0.3, 1.623189876953025),
    (39, "Remote mining and extractive districts", 6, 1.07, 2.673189876953025),
    (40, "Scenic countryside and amenity-migration districts", 6, 0.93, -2.226810123046975),
    (41, "Rural commuter belts", 6, 2.60, 1.133189876953025),
    (42, "Strongly religious agricultural districts", 4, 1.23, 3.023189876953025),
    (43, "Naval dockyard and shipbuilding districts", 4, 3.2, 1.55),
    (44, "Officer-family and defence-contractor districts", 4, 4.1, 1.623189876953025),
    (45, "Port trading and import-export districts", 4, 1.9, 0.08318987695302502),
    (46, "Resort-business and tourism-owner districts", 4, 3.8, -1.456810123046975),
    (47, "Seasonal-worker and hospitality districts", 2, -1.92, -1.876810123046975),
    (48, "Wealthy retirement enclaves", 2, 3.9, 1.903189876953025),
    (49, "Remote island and fishing communities", 2, 0.02, 2.463189876953025),
    (50, "Freeport and digital-nomad enclaves", 2, 5.4, -2.016810123046975),
]

DISTRICT_IDS = np.array([row[0] for row in DISTRICT_ROWS], dtype=int)
DISTRICT_NAMES = [row[1] for row in DISTRICT_ROWS]
DISTRICT_COUNTS = np.array([row[2] for row in DISTRICT_ROWS], dtype=int)
DISTRICT_CENTRES = np.array([row[3:5] for row in DISTRICT_ROWS], dtype=float)
TOTAL_DISTRICTS = int(DISTRICT_COUNTS.sum())
BASELINE_SEATS = np.array([186, 170, 18, 20, 6, 0, 0, 0, 0], dtype=int)

# Edit this one line to change within-type heterogeneity. Zero restores the
# old shared-centre behaviour. Party-boundary caps preserve the baseline.
DISTRICT_SPREAD = 0.20
GOLDEN_ANGLE = math.pi * (3 - math.sqrt(5))


def individual_district_centres(spread=DISTRICT_SPREAD):
    """Deterministic paired offsets, zero type means and unchanged baseline."""
    if not np.isfinite(spread) or spread < 0:
        raise ValueError("District spread must be finite and nonnegative.")
    result = []
    for type_id, _name, count, x, y in DISTRICT_ROWS:
        centre = np.array([x, y])
        squared = ((POINTS - centre) ** 2).sum(axis=1)
        winner = int(np.argmin(squared))
        margins = [(squared[j] - squared[winner]) /
                   (2 * np.linalg.norm(POINTS[j] - POINTS[winner]))
                   for j in range(len(POINTS)) if j != winner]
        radius = min(float(spread), .8 * min(margins))
        pairs = count // 2
        for pair in range(pairs):
            theta = (type_id + pair) * GOLDEN_ANGLE
            r = radius * (.55 + .45 * (pair + 1) / pairs)
            offset = r * np.array([math.cos(theta), math.sin(theta)])
            result.extend([centre + offset, centre - offset])
        if count % 2:
            result.append(centre)
    return np.array(result)


INDIVIDUAL_CENTRES = individual_district_centres()
INDIVIDUAL_TYPE_INDEX = np.repeat(np.arange(len(DISTRICT_ROWS)), DISTRICT_COUNTS)
INDIVIDUAL_IDS = [f"{row[0]:02d}-{i + 1:02d}"
                  for row in DISTRICT_ROWS for i in range(row[2])]


# Geographic identities are attached to the original generation order.
# The compass centres, paired offsets and deterministic tie indices stay intact.
LEGACY_IDS = INDIVIDUAL_IDS.copy()
DISTRICT_GEOGRAPHY = {'22-01': {'id': 'NX-01', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530501, 'type': 22, 'mapX': 377.625, 'mapY': 253.375}, '19-01': {'id': 'NX-02', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 531120, 'type': 19, 'mapX': 379.375, 'mapY': 265.375}, '15-01': {'id': 'NX-03', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530780, 'type': 15, 'mapX': 384.625, 'mapY': 261.125}, '08-02': {'id': 'NX-04', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530612, 'type': 8, 'mapX': 395.125, 'mapY': 264.375}, '01-01': {'id': 'NX-05', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530731, 'type': 1, 'mapX': 372.375, 'mapY': 274.125}, '01-02': {'id': 'NX-06', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 529411, 'type': 1, 'mapX': 376.125, 'mapY': 273.625}, '09-01': {'id': 'NX-07', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530282, 'type': 9, 'mapX': 377.875, 'mapY': 269.875}, '09-02': {'id': 'NX-08', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 531210, 'type': 9, 'mapX': 379.625, 'mapY': 273.625}, '18-01': {'id': 'NX-09', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530046, 'type': 18, 'mapX': 384.625, 'mapY': 269.125}, '18-02': {'id': 'NX-10', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530780, 'type': 18, 'mapX': 384.625, 'mapY': 273.875}, '16-01': {'id': 'NX-11', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530863, 'type': 16, 'mapX': 390.875, 'mapY': 271.875}, '23-01': {'id': 'NX-12', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530922, 'type': 23, 'mapX': 401.625, 'mapY': 271.875}, '01-03': {'id': 'NX-13', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530894, 'type': 1, 'mapX': 371.125, 'mapY': 278.875}, '03-01': {'id': 'NX-14', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530106, 'type': 3, 'mapX': 375.625, 'mapY': 277.375}, '02-01': {'id': 'NX-15', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 531311, 'type': 2, 'mapX': 375.625, 'mapY': 280.875}, '02-02': {'id': 'NX-16', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530724, 'type': 2, 'mapX': 380.625, 'mapY': 278.625}, '13-01': {'id': 'NX-17', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530638, 'type': 13, 'mapX': 382.375, 'mapY': 283.875}, '14-01': {'id': 'NX-18', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530257, 'type': 14, 'mapX': 385.875, 'mapY': 278.625}, '17-01': {'id': 'NX-19', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530352, 'type': 17, 'mapX': 398.125, 'mapY': 278.625}, '14-02': {'id': 'NX-20', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530779, 'type': 14, 'mapX': 372.875, 'mapY': 291.625}, '11-01': {'id': 'NX-21', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530489, 'type': 11, 'mapX': 374.125, 'mapY': 285.125}, '32-01': {'id': 'NX-22', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530550, 'type': 32, 'mapX': 389.375, 'mapY': 290.875}, '32-02': {'id': 'NX-23', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530668, 'type': 32, 'mapX': 399.875, 'mapY': 288.375}, '23-02': {'id': 'NX-24', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530472, 'type': 23, 'mapX': 382.125, 'mapY': 296.875}, '09-03': {'id': 'NX-25', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530671, 'type': 9, 'mapX': 290.625, 'mapY': 312.625}, '16-02': {'id': 'NX-26', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530680, 'type': 16, 'mapX': 300.875, 'mapY': 311.625}, '21-01': {'id': 'NX-27', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Wizlandia City', 'population': 530696, 'type': 21, 'mapX': 369.625, 'mapY': 312.875}, '11-02': {'id': 'NX-28', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530507, 'type': 11, 'mapX': 284.875, 'mapY': 316.875}, '17-02': {'id': 'NX-29', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530800, 'type': 17, 'mapX': 289.375, 'mapY': 323.375}, '02-03': {'id': 'NX-30', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 531054, 'type': 2, 'mapX': 290.875, 'mapY': 317.375}, '16-03': {'id': 'NX-31', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530511, 'type': 16, 'mapX': 297.375, 'mapY': 319.875}, '14-03': {'id': 'NX-32', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Ravenna', 'population': 530572, 'type': 14, 'mapX': 308.625, 'mapY': 320.875}, '11-03': {'id': 'NX-33', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530497, 'type': 11, 'mapX': 330.375, 'mapY': 317.875}, '18-03': {'id': 'NX-34', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530670, 'type': 18, 'mapX': 347.125, 'mapY': 317.375}, '17-03': {'id': 'NX-35', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530707, 'type': 17, 'mapX': 282.625, 'mapY': 326.875}, '20-01': {'id': 'NX-36', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530536, 'type': 20, 'mapX': 289.125, 'mapY': 329.375}, '24-01': {'id': 'NX-37', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530696, 'type': 24, 'mapX': 324.875, 'mapY': 329.375}, '18-04': {'id': 'NX-38', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530399, 'type': 18, 'mapX': 333.875, 'mapY': 326.875}, '28-02': {'id': 'NX-39', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530645, 'type': 28, 'mapX': 340.625, 'mapY': 326.625}, '29-01': {'id': 'NX-40', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Pelagore', 'population': 530557, 'type': 29, 'mapX': 350.125, 'mapY': 329.125}, '07-01': {'id': 'NX-41', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 529203, 'type': 7, 'mapX': 281.875, 'mapY': 337.875}, '14-04': {'id': 'NX-42', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531174, 'type': 14, 'mapX': 282.875, 'mapY': 333.875}, '07-02': {'id': 'NX-43', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531069, 'type': 7, 'mapX': 284.625, 'mapY': 338.125}, '08-03': {'id': 'NX-44', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 529711, 'type': 8, 'mapX': 287.875, 'mapY': 338.375}, '16-04': {'id': 'NX-45', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531055, 'type': 16, 'mapX': 289.875, 'mapY': 333.875}, '20-02': {'id': 'NX-46', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531121, 'type': 20, 'mapX': 291.875, 'mapY': 338.125}, '15-02': {'id': 'NX-47', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530450, 'type': 15, 'mapX': 296.375, 'mapY': 335.125}, '15-03': {'id': 'NX-48', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530530, 'type': 15, 'mapX': 301.875, 'mapY': 334.625}, '29-02': {'id': 'NX-49', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530730, 'type': 29, 'mapX': 311.875, 'mapY': 334.625}, '01-04': {'id': 'NX-50', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531153, 'type': 1, 'mapX': 284.625, 'mapY': 344.875}, '02-04': {'id': 'NX-51', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531845, 'type': 2, 'mapX': 285.375, 'mapY': 341.625}, '01-05': {'id': 'NX-52', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 529897, 'type': 1, 'mapX': 286.875, 'mapY': 345.375}, '01-06': {'id': 'NX-53', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 529985, 'type': 1, 'mapX': 289.625, 'mapY': 345.625}, '14-05': {'id': 'NX-54', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530219, 'type': 14, 'mapX': 291.375, 'mapY': 341.875}, '13-02': {'id': 'NX-55', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 531014, 'type': 13, 'mapX': 293.375, 'mapY': 345.375}, '14-06': {'id': 'NX-56', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530708, 'type': 14, 'mapX': 299.375, 'mapY': 343.375}, '16-05': {'id': 'NX-57', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530597, 'type': 16, 'mapX': 308.375, 'mapY': 347.625}, '35-01': {'id': 'NX-58', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530677, 'type': 35, 'mapX': 334.375, 'mapY': 346.125}, '50-01': {'id': 'NX-59', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530747, 'type': 50, 'mapX': 286.125, 'mapY': 350.375}, '11-04': {'id': 'NX-60', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530040, 'type': 11, 'mapX': 289.125, 'mapY': 350.875}, '13-03': {'id': 'NX-61', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530550, 'type': 13, 'mapX': 291.125, 'mapY': 355.625}, '17-04': {'id': 'NX-62', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530694, 'type': 17, 'mapX': 293.125, 'mapY': 350.625}, '17-05': {'id': 'NX-63', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530492, 'type': 17, 'mapX': 299.375, 'mapY': 348.625}, '16-06': {'id': 'NX-64', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Lorenvia', 'population': 530823, 'type': 16, 'mapX': 299.375, 'mapY': 354.875}, '19-02': {'id': 'NX-65', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 531002, 'type': 19, 'mapX': 292.875, 'mapY': 361.375}, '15-04': {'id': 'NX-66', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530485, 'type': 15, 'mapX': 299.625, 'mapY': 360.625}, '15-05': {'id': 'NX-67', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530459, 'type': 15, 'mapX': 308.375, 'mapY': 359.625}, '17-06': {'id': 'NX-68', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530526, 'type': 17, 'mapX': 316.625, 'mapY': 357.125}, '35-02': {'id': 'NX-69', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530578, 'type': 35, 'mapX': 327.125, 'mapY': 361.375}, '08-01': {'id': 'NX-70', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530070, 'type': 8, 'mapX': 293.125, 'mapY': 367.625}, '06-01': {'id': 'NX-71', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530566, 'type': 6, 'mapX': 297.375, 'mapY': 366.625}, '05-01': {'id': 'NX-72', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530946, 'type': 5, 'mapX': 301.625, 'mapY': 366.625}, '10-03': {'id': 'NX-73', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530404, 'type': 10, 'mapX': 302.625, 'mapY': 371.625}, '15-06': {'id': 'NX-74', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 531025, 'type': 15, 'mapX': 308.125, 'mapY': 366.875}, '04-01': {'id': 'NX-75', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 529868, 'type': 4, 'mapX': 289.625, 'mapY': 373.625}, '04-02': {'id': 'NX-76', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 531151, 'type': 4, 'mapX': 293.625, 'mapY': 373.125}, '09-04': {'id': 'NX-77', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530599, 'type': 9, 'mapX': 294.375, 'mapY': 378.375}, '06-02': {'id': 'NX-78', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530640, 'type': 6, 'mapX': 297.125, 'mapY': 373.125}, '19-03': {'id': 'NX-79', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 531047, 'type': 19, 'mapX': 302.625, 'mapY': 375.875}, '20-03': {'id': 'NX-80', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530600, 'type': 20, 'mapX': 308.625, 'mapY': 377.125}, '16-07': {'id': 'NX-81', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530773, 'type': 16, 'mapX': 318.125, 'mapY': 373.375}, '12-01': {'id': 'NX-82', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530884, 'type': 12, 'mapX': 287.625, 'mapY': 381.625}, '17-07': {'id': 'NX-83', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 529936, 'type': 17, 'mapX': 294.625, 'mapY': 383.625}, '14-07': {'id': 'NX-84', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530684, 'type': 14, 'mapX': 302.625, 'mapY': 382.375}, '12-02': {'id': 'NX-85', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530724, 'type': 12, 'mapX': 318.375, 'mapY': 382.625}, '27-01': {'id': 'NX-86', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Sorenvia', 'population': 530593, 'type': 27, 'mapX': 298.375, 'mapY': 391.875}, '35-06': {'id': 'NX-87', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Neolexia hinterland', 'population': 530625, 'type': 35, 'mapX': 319.375, 'mapY': 395.875}, '27-02': {'id': 'NX-88', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Neolexia hinterland', 'population': 530609, 'type': 27, 'mapX': 292.625, 'mapY': 408.625}, '31-01': {'id': 'NX-89', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Neolexia hinterland', 'population': 530657, 'type': 31, 'mapX': 305.125, 'mapY': 407.125}, '12-03': {'id': 'NX-90', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Clearwater Bay', 'population': 530574, 'type': 12, 'mapX': 318.875, 'mapY': 414.875}, '46-01': {'id': 'NX-91', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Clearwater Bay', 'population': 530572, 'type': 46, 'mapX': 326.875, 'mapY': 414.625}, '23-03': {'id': 'NX-92', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Oldtown', 'population': 530445, 'type': 23, 'mapX': 292.375, 'mapY': 428.125}, '28-03': {'id': 'NX-93', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'Oldtown', 'population': 530758, 'type': 28, 'mapX': 295.625, 'mapY': 435.875}, '27-03': {'id': 'NX-94', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'West Cape', 'population': 530448, 'type': 27, 'mapX': 315.375, 'mapY': 431.125}, '16-08': {'id': 'NX-95', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'West Cape', 'population': 530660, 'type': 16, 'mapX': 313.125, 'mapY': 442.375}, '29-03': {'id': 'NX-96', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'West Cape', 'population': 530652, 'type': 29, 'mapX': 301.875, 'mapY': 446.625}, '14-08': {'id': 'NX-97', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'West Cape', 'population': 530414, 'type': 14, 'mapX': 309.125, 'mapY': 448.625}, '09-05': {'id': 'NX-98', 'state': 'Neolexia', 'stateCode': 'NX', 'locality': 'West Cape', 'population': 530846, 'type': 9, 'mapX': 314.625, 'mapY': 447.625}, '27-04': {'id': 'EW-01', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533351, 'type': 27, 'mapX': 338.875, 'mapY': 188.875}, '30-02': {'id': 'EW-02', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Wintervale', 'population': 533066, 'type': 30, 'mapX': 298.375, 'mapY': 212.125}, '24-04': {'id': 'EW-03', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'North Covina', 'population': 533156, 'type': 24, 'mapX': 355.875, 'mapY': 213.125}, '45-01': {'id': 'EW-04', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Wintervale', 'population': 533439, 'type': 45, 'mapX': 289.375, 'mapY': 227.375}, '40-01': {'id': 'EW-05', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533290, 'type': 40, 'mapX': 337.375, 'mapY': 223.125}, '13-04': {'id': 'EW-06', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'North Covina', 'population': 533476, 'type': 13, 'mapX': 361.625, 'mapY': 232.125}, '41-01': {'id': 'EW-07', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533413, 'type': 41, 'mapX': 304.625, 'mapY': 237.875}, '11-07': {'id': 'EW-08', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'North Covina', 'population': 533311, 'type': 11, 'mapX': 358.625, 'mapY': 237.375}, '30-03': {'id': 'EW-09', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533331, 'type': 30, 'mapX': 327.125, 'mapY': 248.375}, '30-04': {'id': 'EW-10', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533274, 'type': 30, 'mapX': 337.125, 'mapY': 248.125}, '26-01': {'id': 'EW-11', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533424, 'type': 26, 'mapX': 297.375, 'mapY': 261.375}, '23-04': {'id': 'EW-12', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533116, 'type': 23, 'mapX': 309.125, 'mapY': 263.125}, '02-05': {'id': 'EW-13', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533365, 'type': 2, 'mapX': 318.125, 'mapY': 267.625}, '16-09': {'id': 'EW-14', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533300, 'type': 16, 'mapX': 318.375, 'mapY': 260.125}, '11-05': {'id': 'EW-15', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533216, 'type': 11, 'mapX': 326.625, 'mapY': 266.625}, '24-05': {'id': 'EW-16', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533507, 'type': 24, 'mapX': 307.125, 'mapY': 272.375}, '02-06': {'id': 'EW-17', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 533593, 'type': 2, 'mapX': 316.875, 'mapY': 271.875}, '12-04': {'id': 'EW-18', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Coventon', 'population': 532764, 'type': 12, 'mapX': 325.625, 'mapY': 271.125}, '30-01': {'id': 'EW-19', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533532, 'type': 30, 'mapX': 278.625, 'mapY': 280.625}, '23-05': {'id': 'EW-20', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533345, 'type': 23, 'mapX': 246.875, 'mapY': 295.375}, '32-03': {'id': 'EW-21', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533364, 'type': 32, 'mapX': 256.125, 'mapY': 295.375}, '23-06': {'id': 'EW-22', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533316, 'type': 23, 'mapX': 266.125, 'mapY': 292.125}, '33-04': {'id': 'EW-23', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533341, 'type': 33, 'mapX': 225.875, 'mapY': 307.125}, '14-09': {'id': 'EW-24', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533395, 'type': 14, 'mapX': 246.875, 'mapY': 303.625}, '04-03': {'id': 'EW-25', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533185, 'type': 4, 'mapX': 256.625, 'mapY': 302.125}, '12-05': {'id': 'EW-26', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533333, 'type': 12, 'mapX': 246.125, 'mapY': 314.125}, '14-10': {'id': 'EW-27', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Old Salem', 'population': 533467, 'type': 14, 'mapX': 255.125, 'mapY': 309.125}, '36-02': {'id': 'EW-28', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533334, 'type': 36, 'mapX': 215.625, 'mapY': 329.125}, '33-05': {'id': 'EW-29', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533328, 'type': 33, 'mapX': 229.375, 'mapY': 331.875}, '34-03': {'id': 'EW-30', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533310, 'type': 34, 'mapX': 243.875, 'mapY': 335.375}, '21-02': {'id': 'EW-31', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533460, 'type': 21, 'mapX': 232.125, 'mapY': 345.875}, '35-03': {'id': 'EW-32', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533478, 'type': 35, 'mapX': 198.375, 'mapY': 349.875}, '33-01': {'id': 'EW-33', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533291, 'type': 33, 'mapX': 206.375, 'mapY': 348.125}, '35-07': {'id': 'EW-34', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533341, 'type': 35, 'mapX': 220.375, 'mapY': 348.875}, '12-06': {'id': 'EW-35', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533132, 'type': 12, 'mapX': 233.125, 'mapY': 353.625}, '03-02': {'id': 'EW-36', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533456, 'type': 3, 'mapX': 240.125, 'mapY': 355.375}, '12-07': {'id': 'EW-37', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533414, 'type': 12, 'mapX': 243.125, 'mapY': 349.375}, '08-05': {'id': 'EW-38', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533284, 'type': 8, 'mapX': 219.875, 'mapY': 363.875}, '11-06': {'id': 'EW-39', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533488, 'type': 11, 'mapX': 230.375, 'mapY': 359.375}, '02-07': {'id': 'EW-40', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533179, 'type': 2, 'mapX': 235.375, 'mapY': 359.125}, '06-03': {'id': 'EW-41', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533350, 'type': 6, 'mapX': 165.875, 'mapY': 367.625}, '04-04': {'id': 'EW-42', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533594, 'type': 4, 'mapX': 166.875, 'mapY': 371.125}, '06-04': {'id': 'EW-43', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533786, 'type': 6, 'mapX': 170.375, 'mapY': 367.125}, '43-01': {'id': 'EW-44', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533038, 'type': 43, 'mapX': 173.375, 'mapY': 371.625}, '06-05': {'id': 'EW-45', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533016, 'type': 6, 'mapX': 174.125, 'mapY': 367.125}, '23-07': {'id': 'EW-46', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533535, 'type': 23, 'mapX': 178.875, 'mapY': 368.875}, '48-01': {'id': 'EW-47', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533246, 'type': 48, 'mapX': 188.125, 'mapY': 368.375}, '23-08': {'id': 'EW-48', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533291, 'type': 23, 'mapX': 196.875, 'mapY': 365.625}, '27-05': {'id': 'EW-49', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533291, 'type': 27, 'mapX': 207.125, 'mapY': 364.875}, '22-02': {'id': 'EW-50', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533372, 'type': 22, 'mapX': 232.375, 'mapY': 366.125}, '13-05': {'id': 'EW-51', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewenton', 'population': 533258, 'type': 13, 'mapX': 239.375, 'mapY': 366.125}, '43-02': {'id': 'EW-52', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533345, 'type': 43, 'mapX': 167.375, 'mapY': 375.375}, '17-08': {'id': 'EW-53', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533070, 'type': 17, 'mapX': 173.375, 'mapY': 377.875}, '22-03': {'id': 'EW-54', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533563, 'type': 22, 'mapX': 180.625, 'mapY': 373.625}, '44-01': {'id': 'EW-55', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533320, 'type': 44, 'mapX': 180.625, 'mapY': 379.875}, '30-06': {'id': 'EW-56', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Westport', 'population': 533182, 'type': 30, 'mapX': 188.875, 'mapY': 376.875}, '35-04': {'id': 'EW-57', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533294, 'type': 35, 'mapX': 197.125, 'mapY': 376.625}, '23-09': {'id': 'EW-58', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Hogsvale', 'population': 533363, 'type': 23, 'mapX': 207.875, 'mapY': 376.625}, '23-10': {'id': 'EW-59', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Hogsvale', 'population': 533375, 'type': 23, 'mapX': 217.375, 'mapY': 376.375}, '35-05': {'id': 'EW-60', 'state': 'Erewen', 'stateCode': 'EW', 'locality': 'Erewen hinterland', 'population': 533546, 'type': 35, 'mapX': 231.375, 'mapY': 374.125}, '42-02': {'id': 'AX-01', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526320, 'type': 42, 'mapX': 427.625, 'mapY': 310.875}, '33-02': {'id': 'AX-02', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526301, 'type': 33, 'mapX': 377.125, 'mapY': 348.375}, '46-02': {'id': 'AX-03', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Sierra Vista', 'population': 526241, 'type': 46, 'mapX': 553.875, 'mapY': 350.375}, '40-02': {'id': 'AX-04', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Sierra Vista', 'population': 526339, 'type': 40, 'mapX': 568.375, 'mapY': 348.875}, '37-01': {'id': 'AX-05', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526340, 'type': 37, 'mapX': 449.625, 'mapY': 363.125}, '26-02': {'id': 'AX-06', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Riverbank', 'population': 526308, 'type': 26, 'mapX': 571.375, 'mapY': 360.375}, '36-03': {'id': 'AX-07', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526275, 'type': 36, 'mapX': 502.625, 'mapY': 364.625}, '15-07': {'id': 'AX-08', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Riverbank', 'population': 526274, 'type': 15, 'mapX': 563.875, 'mapY': 370.625}, '05-02': {'id': 'AX-09', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Riverbank', 'population': 526107, 'type': 5, 'mapX': 573.125, 'mapY': 370.625}, '05-03': {'id': 'AX-10', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Riverbank', 'population': 526631, 'type': 5, 'mapX': 573.625, 'mapY': 366.625}, '34-01': {'id': 'AX-11', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526343, 'type': 34, 'mapX': 418.625, 'mapY': 373.625}, '37-02': {'id': 'AX-12', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526300, 'type': 37, 'mapX': 347.875, 'mapY': 385.375}, '33-03': {'id': 'AX-13', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526296, 'type': 33, 'mapX': 381.875, 'mapY': 382.375}, '25-01': {'id': 'AX-14', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Hayward', 'population': 526252, 'type': 25, 'mapX': 533.125, 'mapY': 383.125}, '45-02': {'id': 'AX-15', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Lakeside', 'population': 526171, 'type': 45, 'mapX': 410.125, 'mapY': 398.125}, '29-04': {'id': 'AX-16', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Lakeside', 'population': 526374, 'type': 29, 'mapX': 423.375, 'mapY': 401.125}, '28-01': {'id': 'AX-17', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526281, 'type': 28, 'mapX': 495.125, 'mapY': 401.625}, '18-05': {'id': 'AX-18', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Lakeside', 'population': 526320, 'type': 18, 'mapX': 410.375, 'mapY': 407.375}, '37-04': {'id': 'AX-19', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526321, 'type': 37, 'mapX': 450.625, 'mapY': 405.625}, '10-01': {'id': 'AX-20', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Hayward', 'population': 526379, 'type': 10, 'mapX': 521.625, 'mapY': 404.375}, '34-02': {'id': 'AX-21', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526453, 'type': 34, 'mapX': 361.625, 'mapY': 413.375}, '29-05': {'id': 'AX-22', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526043, 'type': 29, 'mapX': 393.625, 'mapY': 417.625}, '14-15': {'id': 'AX-23', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526361, 'type': 14, 'mapX': 476.625, 'mapY': 417.125}, '19-04': {'id': 'AX-24', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526255, 'type': 19, 'mapX': 485.875, 'mapY': 418.375}, '25-04': {'id': 'AX-25', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526447, 'type': 25, 'mapX': 496.625, 'mapY': 418.625}, '13-06': {'id': 'AX-26', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Hayward', 'population': 526134, 'type': 13, 'mapX': 512.875, 'mapY': 414.625}, '16-10': {'id': 'AX-27', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526361, 'type': 16, 'mapX': 369.875, 'mapY': 427.625}, '17-09': {'id': 'AX-28', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526329, 'type': 17, 'mapX': 380.625, 'mapY': 422.625}, '42-01': {'id': 'AX-29', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526351, 'type': 42, 'mapX': 434.875, 'mapY': 420.875}, '14-16': {'id': 'AX-30', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526326, 'type': 14, 'mapX': 456.875, 'mapY': 426.625}, '17-10': {'id': 'AX-31', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526369, 'type': 17, 'mapX': 467.125, 'mapY': 427.375}, '15-08': {'id': 'AX-32', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 527259, 'type': 15, 'mapX': 479.375, 'mapY': 426.875}, '15-09': {'id': 'AX-33', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526311, 'type': 15, 'mapX': 485.875, 'mapY': 426.625}, '20-04': {'id': 'AX-34', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526390, 'type': 20, 'mapX': 491.625, 'mapY': 427.125}, '16-11': {'id': 'AX-35', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526186, 'type': 16, 'mapX': 498.625, 'mapY': 426.625}, '19-05': {'id': 'AX-36', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526605, 'type': 19, 'mapX': 373.375, 'mapY': 432.625}, '25-02': {'id': 'AX-37', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526429, 'type': 25, 'mapX': 378.375, 'mapY': 433.125}, '26-05': {'id': 'AX-38', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526227, 'type': 26, 'mapX': 383.375, 'mapY': 434.125}, '26-06': {'id': 'AX-39', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526159, 'type': 26, 'mapX': 393.375, 'mapY': 435.625}, '37-06': {'id': 'AX-40', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avax hinterland', 'population': 526311, 'type': 37, 'mapX': 409.125, 'mapY': 431.125}, '15-10': {'id': 'AX-41', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526132, 'type': 15, 'mapX': 473.125, 'mapY': 429.125}, '05-04': {'id': 'AX-42', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 525768, 'type': 5, 'mapX': 474.125, 'mapY': 435.375}, '05-05': {'id': 'AX-43', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526393, 'type': 5, 'mapX': 479.375, 'mapY': 431.375}, '25-03': {'id': 'AX-44', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526847, 'type': 25, 'mapX': 480.125, 'mapY': 434.875}, '08-04': {'id': 'AX-45', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 525791, 'type': 8, 'mapX': 485.875, 'mapY': 431.125}, '05-06': {'id': 'AX-46', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526250, 'type': 5, 'mapX': 485.875, 'mapY': 434.125}, '25-05': {'id': 'AX-47', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526622, 'type': 25, 'mapX': 490.375, 'mapY': 433.875}, '05-07': {'id': 'AX-48', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 525648, 'type': 5, 'mapX': 494.625, 'mapY': 432.375}, '06-06': {'id': 'AX-49', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526721, 'type': 6, 'mapX': 378.625, 'mapY': 437.125}, '15-11': {'id': 'AX-50', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526086, 'type': 15, 'mapX': 383.875, 'mapY': 439.875}, '26-03': {'id': 'AX-51', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Avondale', 'population': 526038, 'type': 26, 'mapX': 395.125, 'mapY': 443.625}, '31-03': {'id': 'AX-52', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526309, 'type': 31, 'mapX': 437.875, 'mapY': 436.125}, '25-06': {'id': 'AX-53', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526479, 'type': 25, 'mapX': 457.625, 'mapY': 438.875}, '15-12': {'id': 'AX-54', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526209, 'type': 15, 'mapX': 467.125, 'mapY': 438.375}, '05-08': {'id': 'AX-55', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 526508, 'type': 5, 'mapX': 474.125, 'mapY': 439.375}, '05-09': {'id': 'AX-56', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 525684, 'type': 5, 'mapX': 479.875, 'mapY': 438.125}, '26-04': {'id': 'AX-57', 'state': 'Avax', 'stateCode': 'AX', 'locality': 'Southport', 'population': 527036, 'type': 26, 'mapX': 485.375, 'mapY': 436.875}, '06-07': {'id': 'ET-01', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Northport', 'population': 526202, 'type': 6, 'mapX': 503.875, 'mapY': 193.375}, '24-07': {'id': 'ET-02', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Northport', 'population': 526468, 'type': 24, 'mapX': 500.375, 'mapY': 208.375}, '27-06': {'id': 'ET-03', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526266, 'type': 27, 'mapX': 519.375, 'mapY': 209.375}, '38-01': {'id': 'ET-04', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526276, 'type': 38, 'mapX': 566.625, 'mapY': 205.125}, '39-01': {'id': 'ET-05', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526289, 'type': 39, 'mapX': 636.625, 'mapY': 237.875}, '38-02': {'id': 'ET-06', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526281, 'type': 38, 'mapX': 475.625, 'mapY': 250.625}, '31-04': {'id': 'ET-07', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526297, 'type': 31, 'mapX': 714.375, 'mapY': 263.875}, '40-03': {'id': 'ET-08', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526422, 'type': 40, 'mapX': 476.875, 'mapY': 279.875}, '38-03': {'id': 'ET-09', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526294, 'type': 38, 'mapX': 523.375, 'mapY': 281.125}, '24-02': {'id': 'ET-10', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526378, 'type': 24, 'mapX': 594.875, 'mapY': 277.875}, '24-03': {'id': 'ET-11', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526239, 'type': 24, 'mapX': 556.625, 'mapY': 284.125}, '37-07': {'id': 'ET-12', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526289, 'type': 37, 'mapX': 645.875, 'mapY': 302.375}, '25-08': {'id': 'ET-13', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526296, 'type': 25, 'mapX': 682.875, 'mapY': 304.375}, '42-03': {'id': 'ET-14', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526203, 'type': 42, 'mapX': 493.875, 'mapY': 320.625}, '34-04': {'id': 'ET-15', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Ethuarica hinterland', 'population': 526215, 'type': 34, 'mapX': 551.875, 'mapY': 320.125}, '10-02': {'id': 'ET-16', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Rhya', 'population': 526177, 'type': 10, 'mapX': 663.625, 'mapY': 326.125}, '47-01': {'id': 'ET-17', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Sierra Vista', 'population': 526301, 'type': 47, 'mapX': 570.875, 'mapY': 343.375}, '23-11': {'id': 'ET-18', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526345, 'type': 23, 'mapX': 599.125, 'mapY': 340.375}, '23-12': {'id': 'ET-19', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526503, 'type': 23, 'mapX': 633.375, 'mapY': 340.125}, '20-05': {'id': 'ET-20', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526341, 'type': 20, 'mapX': 646.625, 'mapY': 341.875}, '44-02': {'id': 'ET-21', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526327, 'type': 44, 'mapX': 633.375, 'mapY': 350.625}, '07-03': {'id': 'ET-22', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526140, 'type': 7, 'mapX': 641.375, 'mapY': 355.625}, '09-06': {'id': 'ET-23', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526018, 'type': 9, 'mapX': 642.625, 'mapY': 350.375}, '28-06': {'id': 'ET-24', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526485, 'type': 28, 'mapX': 579.125, 'mapY': 359.875}, '32-04': {'id': 'ET-25', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526281, 'type': 32, 'mapX': 592.625, 'mapY': 359.875}, '16-12': {'id': 'ET-26', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526509, 'type': 16, 'mapX': 632.625, 'mapY': 356.875}, '15-13': {'id': 'ET-27', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Lyanna', 'population': 526387, 'type': 15, 'mapX': 642.625, 'mapY': 363.875}, '05-10': {'id': 'ET-28', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 525883, 'type': 5, 'mapX': 579.625, 'mapY': 367.625}, '05-11': {'id': 'ET-29', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526450, 'type': 5, 'mapX': 584.375, 'mapY': 367.125}, '25-07': {'id': 'ET-30', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526504, 'type': 25, 'mapX': 592.125, 'mapY': 367.625}, '26-07': {'id': 'ET-31', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'Riverbank', 'population': 526499, 'type': 26, 'mapX': 607.375, 'mapY': 372.375}, '17-11': {'id': 'ET-32', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 526369, 'type': 17, 'mapX': 631.125, 'mapY': 378.375}, '17-12': {'id': 'ET-33', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 526336, 'type': 17, 'mapX': 643.875, 'mapY': 382.625}, '14-11': {'id': 'ET-34', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 525836, 'type': 14, 'mapX': 630.375, 'mapY': 390.625}, '09-07': {'id': 'ET-35', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 526069, 'type': 9, 'mapX': 636.125, 'mapY': 391.625}, '04-05': {'id': 'ET-36', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 525992, 'type': 4, 'mapX': 639.125, 'mapY': 393.875}, '11-08': {'id': 'ET-37', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 526891, 'type': 11, 'mapX': 641.875, 'mapY': 388.875}, '04-06': {'id': 'ET-38', 'state': 'Ethuarica', 'stateCode': 'ET', 'locality': 'East Cape', 'population': 526942, 'type': 4, 'mapX': 642.625, 'mapY': 393.125}, '38-04': {'id': 'EX-01', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533314, 'type': 38, 'mapX': 214.125, 'mapY': 189.875}, '41-03': {'id': 'EX-02', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533374, 'type': 41, 'mapX': 209.125, 'mapY': 210.375}, '32-06': {'id': 'EX-03', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533328, 'type': 32, 'mapX': 207.375, 'mapY': 225.375}, '41-04': {'id': 'EX-04', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533303, 'type': 41, 'mapX': 182.375, 'mapY': 228.375}, '41-02': {'id': 'EX-05', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533291, 'type': 41, 'mapX': 237.125, 'mapY': 234.875}, '26-08': {'id': 'EX-06', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533259, 'type': 26, 'mapX': 176.375, 'mapY': 261.875}, '13-07': {'id': 'EX-07', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533336, 'type': 13, 'mapX': 185.875, 'mapY': 262.125}, '28-04': {'id': 'EX-08', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533239, 'type': 28, 'mapX': 215.875, 'mapY': 265.875}, '14-12': {'id': 'EX-09', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary Bay', 'population': 533244, 'type': 14, 'mapX': 249.875, 'mapY': 267.625}, '04-07': {'id': 'EX-10', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary Bay', 'population': 533836, 'type': 4, 'mapX': 259.125, 'mapY': 267.625}, '07-04': {'id': 'EX-11', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533534, 'type': 7, 'mapX': 177.625, 'mapY': 270.875}, '43-03': {'id': 'EX-12', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533692, 'type': 43, 'mapX': 185.125, 'mapY': 270.125}, '14-13': {'id': 'EX-13', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary Bay', 'population': 533095, 'type': 14, 'mapX': 259.875, 'mapY': 272.625}, '43-04': {'id': 'EX-14', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533080, 'type': 43, 'mapX': 174.875, 'mapY': 278.125}, '12-08': {'id': 'EX-15', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westhaven', 'population': 533085, 'type': 12, 'mapX': 185.375, 'mapY': 277.625}, '34-05': {'id': 'EX-16', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533348, 'type': 34, 'mapX': 185.875, 'mapY': 298.625}, '26-09': {'id': 'EX-17', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533322, 'type': 26, 'mapX': 169.375, 'mapY': 301.625}, '40-05': {'id': 'EX-18', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533417, 'type': 40, 'mapX': 207.875, 'mapY': 300.625}, '33-06': {'id': 'EX-19', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533275, 'type': 33, 'mapX': 190.125, 'mapY': 330.125}, '27-07': {'id': 'EX-20', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Extary hinterland', 'population': 533462, 'type': 27, 'mapX': 173.625, 'mapY': 333.375}, '25-09': {'id': 'EX-21', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533368, 'type': 25, 'mapX': 173.125, 'mapY': 347.625}, '44-03': {'id': 'EX-22', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533321, 'type': 44, 'mapX': 186.125, 'mapY': 344.125}, '13-08': {'id': 'EX-23', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 532602, 'type': 13, 'mapX': 172.375, 'mapY': 355.875}, '11-09': {'id': 'EX-24', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533223, 'type': 11, 'mapX': 186.375, 'mapY': 355.875}, '04-08': {'id': 'EX-25', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 532900, 'type': 4, 'mapX': 166.625, 'mapY': 362.875}, '45-03': {'id': 'EX-26', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533673, 'type': 45, 'mapX': 167.625, 'mapY': 356.625}, '06-08': {'id': 'EX-27', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533840, 'type': 6, 'mapX': 171.375, 'mapY': 362.375}, '11-10': {'id': 'EX-28', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533353, 'type': 11, 'mapX': 177.625, 'mapY': 356.125}, '19-06': {'id': 'EX-29', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533362, 'type': 19, 'mapX': 177.875, 'mapY': 363.125}, '22-04': {'id': 'EX-30', 'state': 'Extary', 'stateCode': 'EX', 'locality': 'Westport', 'population': 533524, 'type': 22, 'mapX': 185.125, 'mapY': 363.875}, '29-06': {'id': 'KR-01', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521876, 'type': 29, 'mapX': 754.625, 'mapY': 267.125}, '23-13': {'id': 'KR-02', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521861, 'type': 23, 'mapX': 774.125, 'mapY': 263.375}, '11-11': {'id': 'KR-03', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521733, 'type': 11, 'mapX': 787.875, 'mapY': 275.625}, '27-08': {'id': 'KR-04', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521761, 'type': 27, 'mapX': 752.375, 'mapY': 277.125}, '12-09': {'id': 'KR-05', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521884, 'type': 12, 'mapX': 771.875, 'mapY': 280.625}, '12-10': {'id': 'KR-06', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521735, 'type': 12, 'mapX': 779.375, 'mapY': 281.125}, '13-09': {'id': 'KR-07', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521061, 'type': 13, 'mapX': 784.375, 'mapY': 283.375}, '13-10': {'id': 'KR-08', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 522028, 'type': 13, 'mapX': 790.625, 'mapY': 283.125}, '30-05': {'id': 'KR-09', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521610, 'type': 30, 'mapX': 861.375, 'mapY': 277.625}, '11-12': {'id': 'KR-10', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521483, 'type': 11, 'mapX': 772.625, 'mapY': 287.625}, '01-07': {'id': 'KR-11', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521483, 'type': 1, 'mapX': 778.875, 'mapY': 289.125}, '01-08': {'id': 'KR-12', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 520908, 'type': 1, 'mapX': 779.125, 'mapY': 286.125}, '07-05': {'id': 'KR-13', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 522470, 'type': 7, 'mapX': 782.875, 'mapY': 289.625}, '07-06': {'id': 'KR-14', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 522180, 'type': 7, 'mapX': 785.375, 'mapY': 288.375}, '29-07': {'id': 'KR-15', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Davenport', 'population': 521678, 'type': 29, 'mapX': 846.125, 'mapY': 291.375}, '32-05': {'id': 'KR-16', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 521892, 'type': 32, 'mapX': 758.375, 'mapY': 292.125}, '14-14': {'id': 'KR-17', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 522438, 'type': 14, 'mapX': 772.125, 'mapY': 293.625}, '07-07': {'id': 'KR-18', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 522181, 'type': 7, 'mapX': 778.875, 'mapY': 292.375}, '24-08': {'id': 'KR-19', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521689, 'type': 24, 'mapX': 860.875, 'mapY': 294.875}, '24-09': {'id': 'KR-20', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Davenport', 'population': 521903, 'type': 24, 'mapX': 857.625, 'mapY': 305.875}, '11-16': {'id': 'KR-21', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Davenport', 'population': 521604, 'type': 11, 'mapX': 848.875, 'mapY': 309.375}, '44-04': {'id': 'KR-22', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana City', 'population': 520755, 'type': 44, 'mapX': 826.625, 'mapY': 319.625}, '37-03': {'id': 'KR-23', 'state': 'Kroana', 'stateCode': 'KR', 'locality': 'Kroana hinterland', 'population': 521787, 'type': 37, 'mapX': 837.875, 'mapY': 327.125}, '41-05': {'id': 'LX-01', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523739, 'type': 41, 'mapX': 1441.625, 'mapY': 243.125}, '41-06': {'id': 'LX-02', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523724, 'type': 41, 'mapX': 1535.125, 'mapY': 240.625}, '38-05': {'id': 'LX-03', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523925, 'type': 38, 'mapX': 1480.375, 'mapY': 263.125}, '36-01': {'id': 'LX-04', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523808, 'type': 36, 'mapX': 1382.875, 'mapY': 285.125}, '36-04': {'id': 'LX-05', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523813, 'type': 36, 'mapX': 1422.375, 'mapY': 286.625}, '33-08': {'id': 'LX-06', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523875, 'type': 33, 'mapX': 1458.125, 'mapY': 286.875}, '36-05': {'id': 'LX-07', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523676, 'type': 36, 'mapX': 1554.625, 'mapY': 286.375}, '37-05': {'id': 'LX-08', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523809, 'type': 37, 'mapX': 1340.875, 'mapY': 293.125}, '24-06': {'id': 'LX-09', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxford', 'population': 523946, 'type': 24, 'mapX': 1498.375, 'mapY': 293.125}, '29-08': {'id': 'LX-10', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxford', 'population': 523784, 'type': 29, 'mapX': 1509.875, 'mapY': 292.625}, '33-09': {'id': 'LX-11', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523769, 'type': 33, 'mapX': 1488.625, 'mapY': 305.625}, '33-10': {'id': 'LX-12', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523832, 'type': 33, 'mapX': 1356.875, 'mapY': 322.625}, '36-06': {'id': 'LX-13', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523759, 'type': 36, 'mapX': 1412.625, 'mapY': 327.625}, '23-14': {'id': 'LX-14', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Queenstown', 'population': 524059, 'type': 23, 'mapX': 1482.375, 'mapY': 324.125}, '23-15': {'id': 'LX-15', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Queenstown', 'population': 523606, 'type': 23, 'mapX': 1495.625, 'mapY': 327.375}, '34-06': {'id': 'LX-16', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523808, 'type': 34, 'mapX': 1448.125, 'mapY': 334.125}, '33-11': {'id': 'LX-17', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523806, 'type': 33, 'mapX': 1530.625, 'mapY': 339.875}, '36-08': {'id': 'LX-18', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Laxburg hinterland', 'population': 523855, 'type': 36, 'mapX': 1567.375, 'mapY': 338.375}, '13-11': {'id': 'LX-19', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Carolinton', 'population': 523825, 'type': 13, 'mapX': 1454.375, 'mapY': 357.125}, '19-07': {'id': 'LX-20', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Carolinton', 'population': 523819, 'type': 19, 'mapX': 1461.125, 'mapY': 357.125}, '05-12': {'id': 'LX-21', 'state': 'Laxburg', 'stateCode': 'LX', 'locality': 'Suffolk', 'population': 523763, 'type': 5, 'mapX': 1558.875, 'mapY': 372.625}, '02-08': {'id': 'LQ-01', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Aurora', 'population': 526324, 'type': 2, 'mapX': 1262.375, 'mapY': 217.875}, '11-13': {'id': 'LQ-02', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Aurora', 'population': 526213, 'type': 11, 'mapX': 1273.125, 'mapY': 217.625}, '40-06': {'id': 'LQ-03', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526215, 'type': 40, 'mapX': 1296.375, 'mapY': 231.125}, '27-09': {'id': 'LQ-04', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Aurora', 'population': 526428, 'type': 27, 'mapX': 1247.875, 'mapY': 252.625}, '38-06': {'id': 'LQ-05', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526219, 'type': 38, 'mapX': 1304.125, 'mapY': 261.125}, '36-07': {'id': 'LQ-06', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526336, 'type': 36, 'mapX': 1210.625, 'mapY': 291.875}, '11-14': {'id': 'LQ-07', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Xesa', 'population': 526325, 'type': 11, 'mapX': 1188.375, 'mapY': 313.625}, '35-08': {'id': 'LQ-08', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526295, 'type': 35, 'mapX': 1272.125, 'mapY': 315.375}, '33-07': {'id': 'LQ-09', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526367, 'type': 33, 'mapX': 1289.875, 'mapY': 311.625}, '30-07': {'id': 'LQ-10', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526211, 'type': 30, 'mapX': 1226.625, 'mapY': 319.625}, '34-07': {'id': 'LQ-11', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur hinterland', 'population': 526326, 'type': 34, 'mapX': 1243.125, 'mapY': 320.875}, '25-10': {'id': 'LQ-12', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526346, 'type': 25, 'mapX': 1195.375, 'mapY': 326.125}, '20-06': {'id': 'LQ-13', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526304, 'type': 20, 'mapX': 1213.625, 'mapY': 329.125}, '19-08': {'id': 'LQ-14', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 525645, 'type': 19, 'mapX': 1203.625, 'mapY': 336.125}, '04-09': {'id': 'LQ-15', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526803, 'type': 4, 'mapX': 1210.875, 'mapY': 338.125}, '45-04': {'id': 'LQ-16', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526347, 'type': 45, 'mapX': 1216.375, 'mapY': 335.625}, '12-11': {'id': 'LQ-17', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526305, 'type': 12, 'mapX': 1224.625, 'mapY': 339.875}, '07-08': {'id': 'LQ-18', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526987, 'type': 7, 'mapX': 1214.125, 'mapY': 340.875}, '11-15': {'id': 'LQ-19', 'state': 'Luqur', 'stateCode': 'LQ', 'locality': 'Luqur Bay', 'population': 526004, 'type': 11, 'mapX': 1218.375, 'mapY': 341.375}, '28-05': {'id': 'WT-01', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Lux Aeterna', 'population': 529415, 'type': 28, 'mapX': 1734.125, 'mapY': 83.875}, '31-06': {'id': 'WT-02', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Alegow', 'population': 529295, 'type': 31, 'mapX': 1789.625, 'mapY': 88.875}, '28-07': {'id': 'WT-03', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Alpinton', 'population': 529424, 'type': 28, 'mapX': 1687.125, 'mapY': 116.125}, '31-02': {'id': 'WT-04', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittaria hinterland', 'population': 529513, 'type': 31, 'mapX': 1829.625, 'mapY': 146.375}, '31-05': {'id': 'WT-05', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittaria hinterland', 'population': 529406, 'type': 31, 'mapX': 1641.875, 'mapY': 188.125}, '39-02': {'id': 'WT-06', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittaria hinterland', 'population': 529407, 'type': 39, 'mapX': 1745.375, 'mapY': 216.375}, '26-10': {'id': 'WT-07', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittaria hinterland', 'population': 529402, 'type': 26, 'mapX': 1854.625, 'mapY': 221.625}, '24-10': {'id': 'WT-08', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529403, 'type': 24, 'mapX': 1801.625, 'mapY': 235.375}, '49-01': {'id': 'WT-09', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529549, 'type': 49, 'mapX': 1796.125, 'mapY': 259.625}, '18-06': {'id': 'WT-10', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529510, 'type': 18, 'mapX': 1808.875, 'mapY': 256.125}, '04-10': {'id': 'WT-11', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529584, 'type': 4, 'mapX': 1806.875, 'mapY': 261.875}, '18-07': {'id': 'WT-12', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529062, 'type': 18, 'mapX': 1807.375, 'mapY': 268.875}, '30-08': {'id': 'WT-13', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittaria hinterland', 'population': 529444, 'type': 30, 'mapX': 1668.125, 'mapY': 279.625}, '28-08': {'id': 'WT-14', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittan', 'population': 529384, 'type': 28, 'mapX': 1738.125, 'mapY': 287.375}, '27-10': {'id': 'WT-15', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Wittan', 'population': 529403, 'type': 27, 'mapX': 1757.375, 'mapY': 291.875}, '23-16': {'id': 'WT-16', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'East Harbour', 'population': 529382, 'type': 23, 'mapX': 1788.125, 'mapY': 285.125}, '13-12': {'id': 'WT-17', 'state': 'Wittaria', 'stateCode': 'WT', 'locality': 'Katherine', 'population': 529417, 'type': 13, 'mapX': 1762.625, 'mapY': 319.375}, '47-02': {'id': 'AK-01', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Zyoto', 'population': 533400, 'type': 47, 'mapX': 1122.625, 'mapY': 327.375}, '12-12': {'id': 'AK-02', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Zyoto', 'population': 533538, 'type': 12, 'mapX': 1128.375, 'mapY': 326.375}, '40-04': {'id': 'AK-03', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Zyoto', 'population': 533151, 'type': 40, 'mapX': 1136.625, 'mapY': 326.625}, '24-11': {'id': 'AK-04', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533572, 'type': 24, 'mapX': 1148.625, 'mapY': 326.625}, '46-03': {'id': 'AK-05', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Zyoto', 'population': 533206, 'type': 46, 'mapX': 1128.125, 'mapY': 334.125}, '21-03': {'id': 'AK-06', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533088, 'type': 21, 'mapX': 1133.875, 'mapY': 337.375}, '21-04': {'id': 'AK-07', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533113, 'type': 21, 'mapX': 1139.375, 'mapY': 336.625}, '08-06': {'id': 'AK-08', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533490, 'type': 8, 'mapX': 1149.875, 'mapY': 335.125}, '50-02': {'id': 'AK-09', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533705, 'type': 50, 'mapX': 1139.875, 'mapY': 344.125}, '03-03': {'id': 'AK-10', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533559, 'type': 3, 'mapX': 1143.875, 'mapY': 345.875}, '13-13': {'id': 'AK-11', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533951, 'type': 13, 'mapX': 1145.875, 'mapY': 340.625}, '03-04': {'id': 'AK-12', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 532214, 'type': 3, 'mapX': 1147.125, 'mapY': 345.375}, '03-05': {'id': 'AK-13', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 532539, 'type': 3, 'mapX': 1150.625, 'mapY': 346.875}, '03-06': {'id': 'AK-14', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 534428, 'type': 3, 'mapX': 1151.125, 'mapY': 344.125}, '13-14': {'id': 'AK-15', 'state': 'Akro', 'stateCode': 'AK', 'locality': 'Akropolis', 'population': 533046, 'type': 13, 'mapX': 1152.125, 'mapY': 340.375}, '33-12': {'id': 'QL-01', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Quelor hinterland', 'population': 538503, 'type': 33, 'mapX': 914.875, 'mapY': 317.375}, '24-12': {'id': 'QL-02', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Queloria', 'population': 538530, 'type': 24, 'mapX': 974.375, 'mapY': 348.875}, '42-04': {'id': 'QL-03', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Quelor hinterland', 'population': 538491, 'type': 42, 'mapX': 882.625, 'mapY': 385.625}, '48-02': {'id': 'QL-04', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Queloria', 'population': 538604, 'type': 48, 'mapX': 962.625, 'mapY': 386.875}, '09-08': {'id': 'QL-05', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Queloria', 'population': 538264, 'type': 9, 'mapX': 975.375, 'mapY': 386.125}, '37-08': {'id': 'QL-06', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Quelor hinterland', 'population': 538493, 'type': 37, 'mapX': 935.625, 'mapY': 393.375}, '34-08': {'id': 'QL-07', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Quelor hinterland', 'population': 538442, 'type': 34, 'mapX': 964.875, 'mapY': 425.375}, '15-15': {'id': 'QL-08', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 538704, 'type': 15, 'mapX': 983.375, 'mapY': 434.625}, '15-14': {'id': 'QL-09', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 537868, 'type': 15, 'mapX': 972.625, 'mapY': 439.625}, '15-16': {'id': 'QL-10', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 538152, 'type': 15, 'mapX': 981.125, 'mapY': 442.625}, '06-09': {'id': 'QL-11', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 538974, 'type': 6, 'mapX': 974.625, 'mapY': 445.875}, '06-10': {'id': 'QL-12', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 539242, 'type': 6, 'mapX': 978.125, 'mapY': 446.875}, '46-04': {'id': 'QL-13', 'state': 'Quelor', 'stateCode': 'QL', 'locality': 'Atlantis', 'population': 537733, 'type': 46, 'mapX': 983.125, 'mapY': 446.375}, '49-02': {'id': 'IL-01', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Arkangel', 'population': 555555, 'type': 49, 'mapX': 1411.125, 'mapY': 80.625}, '10-04': {'id': 'IL-02', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Boreal Bay', 'population': 555551, 'type': 10, 'mapX': 1551.375, 'mapY': 128.625}, '39-03': {'id': 'IL-03', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixium hinterland', 'population': 555560, 'type': 39, 'mapX': 1543.625, 'mapY': 151.625}, '39-04': {'id': 'IL-04', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixium hinterland', 'population': 555476, 'type': 39, 'mapX': 1362.375, 'mapY': 160.625}, '31-07': {'id': 'IL-05', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixium hinterland', 'population': 555555, 'type': 31, 'mapX': 1420.625, 'mapY': 158.125}, '39-05': {'id': 'IL-06', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixium hinterland', 'population': 555557, 'type': 39, 'mapX': 1494.375, 'mapY': 158.375}, '31-08': {'id': 'IL-07', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixia', 'population': 555508, 'type': 31, 'mapX': 1307.625, 'mapY': 193.375}, '39-06': {'id': 'IL-08', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixia', 'population': 555582, 'type': 39, 'mapX': 1340.875, 'mapY': 201.125}, '18-08': {'id': 'IL-09', 'state': 'Illixium', 'stateCode': 'IL', 'locality': 'Illixia', 'population': 555656, 'type': 18, 'mapX': 1306.125, 'mapY': 204.625}}
INDIVIDUAL_IDS = [DISTRICT_GEOGRAPHY[d]["id"] for d in LEGACY_IDS]



def allocate_pr(votes, total=PR_SEAT_COUNT):
    """Hare/largest remainder, no threshold; ties use canonical CODES order."""
    shares = np.asarray(votes, dtype=float)
    if shares.ndim != 1 or not len(shares) or not np.all(np.isfinite(shares)) or np.any(shares < 0) or shares.sum() <= 0:
        raise ValueError("Votes must be finite, nonnegative and have positive total.")
    if not isinstance(total, (int, np.integer)) or total < 1:
        raise ValueError("The number of PR seats must be a positive integer.")
    quotas = shares / shares.sum() * total
    seats = np.floor(quotas).astype(int)
    remaining = int(total - seats.sum())
    order = sorted(range(len(shares)), key=lambda i: (-(quotas[i] - seats[i]), i))
    for i in order[:remaining]:
        seats[i] += 1
    return seats


BASELINE_PR_SEATS = allocate_pr(TARGETS)
BASELINE_COMBINED_SEATS = BASELINE_SEATS + BASELINE_PR_SEATS


@dataclass
class ElectionResult:
    economic: float
    cultural: float
    variance: float
    points: np.ndarray
    seats: np.ndarray
    votes: np.ndarray
    winners: tuple
    tied_districts: int

    @property
    def district_seats(self):
        return self.seats  # Backwards-compatible district-seat field.

    @property
    def pr_seats(self):
        return allocate_pr(self.votes)

    @property
    def combined_seats(self):
        return self.district_seats + self.pr_seats

    def component_seats(self, component="combined"):
        if component == "district":
            return self.district_seats
        if component == "pr":
            return self.pr_seats
        if component == "combined":
            return self.combined_seats
        raise ValueError("Component must be district, pr or combined.")

    @property
    def national_median(self):
        return CENTER + [self.economic, self.cultural]


def evaluate(economic=0.0, cultural=0.0, variance=1.0):
    """Compute all 400 district seats and national vote shares."""
    economic, cultural, variance = map(float, (economic, cultural, variance))
    values = np.array([economic, cultural, variance])
    if not np.all(np.isfinite(values)):
        raise ValueError("Shock parameters must be finite.")
    if not (-1 <= economic <= 1 and -1 <= cultural <= 1 and .5 <= variance <= 2):
        raise ValueError("Use shifts in [-1,1] and variance in [0.50,2.00].")
    points = CENTER + [economic, cultural] + np.sqrt(variance) * (INDIVIDUAL_CENTRES - CENTER)
    distances = ((points[:, None, :] - POINTS[None, :, :]) ** 2).sum(axis=2)
    seats = np.zeros(len(CODES), dtype=int)
    winners = []
    tied = 0
    for index, dist in enumerate(distances):
        candidates = np.flatnonzero(np.abs(dist - dist.min()) < 1e-9)
        selected = int(candidates[index % len(candidates)])
        winners.append((selected,))
        seats[selected] += 1
        if len(candidates) > 1:
            tied += 1
    assert int(seats.sum()) == TOTAL_DISTRICTS
    return ElectionResult(
        economic, cultural, variance, points, seats,
        vote_shares(economic, cultural, variance).copy(), tuple(winners), tied,
    )


class Mulberry32:
    """Same 32-bit PRNG as the browser version; no global random state."""
    def __init__(self, seed):
        self.seed = int(seed) & 0xffffffff

    def random(self):
        self.seed = (self.seed + 0x6D2B79F5) & 0xffffffff
        s = self.seed
        t = ((s ^ (s >> 15)) * (1 | s)) & 0xffffffff
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xffffffff)) ^ t) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296.0

    def normal(self):
        u = max(self.random(), 1e-12)
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * self.random())


def _round_two(value):
    # Match JavaScript Math.round for the browser's two-decimal shocks.
    return math.floor(value * 100 + .5) / 100


def simulate_elections(n=30, seed=20261014):
    """Return baseline election 0 followed by n independent random elections."""
    if not isinstance(n, (int, np.integer)) or n < 1:
        raise ValueError("n must be a positive integer.")
    rng = Mulberry32(seed)
    result = [evaluate()]
    for _ in range(n):
        while True:
            economic = .35 * rng.normal()
            if abs(economic) <= 1:
                break
        while True:
            cultural = .25 * rng.normal()
            if abs(cultural) <= 1:
                break
        while True:
            variance = math.exp(.20**2 + .20 * rng.normal())
            if .5 <= variance <= 2:
                break
        result.append(evaluate(_round_two(economic), _round_two(cultural), variance))
    return result


def save_elections_csv(path, history):
    """One row per election, including baseline 0; percentages, not fractions."""
    with Path(path).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "election", "economic_shift", "cultural_shift", "variance_multiplier",
            "national_median_x", "national_median_y", "tied_districts",
            *[f"{code}_district_seats" for code in CODES],
            *[f"{code}_pr_seats" for code in CODES],
            *[f"{code}_combined_seats" for code in CODES],
            *[f"{code}_vote_percent" for code in CODES],
        ])
        for index, election in enumerate(history):
            writer.writerow([
                index, election.economic, election.cultural, election.variance,
                *election.national_median, election.tied_districts,
                *election.district_seats, *election.pr_seats, *election.combined_seats, *(100 * election.votes),
            ])


def save_districts_csv(path, election=None):
    """One row per individual district, including its type and coordinates."""
    election = evaluate() if election is None else election
    with Path(path).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["district_id", "state", "locality", "population", "legacy_id", "type_id", "district_type", "economic_x",
                         "cultural_y", "nearest_party"])
        for i, type_index in enumerate(INDIVIDUAL_TYPE_INDEX):
            g = DISTRICT_GEOGRAPHY[LEGACY_IDS[i]]
            writer.writerow([INDIVIDUAL_IDS[i], g["state"], g["locality"], g["population"], LEGACY_IDS[i], DISTRICT_IDS[type_index],
                             DISTRICT_NAMES[type_index], *election.points[i],
                             CODES[election.winners[i][0]]])


def _region_polygon(index, xlim, ylim):
    """Voronoi polygon clipped to the display rectangle, for shading only."""
    polygon = np.array([[xlim[0], ylim[0]], [xlim[1], ylim[0]],
                        [xlim[1], ylim[1]], [xlim[0], ylim[1]]])
    p = POINTS[index]
    for j, q in enumerate(POINTS):
        if j == index:
            continue
        normal = 2 * (q - p)
        constant = q @ q - p @ p
        clipped = []
        for a, b in zip(polygon, np.roll(polygon, -1, axis=0)):
            da, db = normal @ a - constant, normal @ b - constant
            inside_a, inside_b = da <= 1e-10, db <= 1e-10
            if inside_a:
                clipped.append(a)
            if inside_a != inside_b:
                clipped.append(a + da / (da - db) * (b - a))
        polygon = np.asarray(clipped)
        if len(polygon) == 0:
            break
    return polygon



def plot_domains():
    """Fixed square domains spanning every allowed district shock and party."""
    candidates = [POINTS]
    for variance in VARIANCE_RANGE:
        for economic in SHIFT_RANGE:
            for cultural in SHIFT_RANGE:
                candidates.append(CENTER + [economic, cultural]
                                  + np.sqrt(variance) * (INDIVIDUAL_CENTRES - CENTER))
    candidates = np.vstack(candidates)
    low, high = candidates.min(axis=0), candidates.max(axis=0)
    span = max(high - low) * 1.12
    midpoint = (low + high) / 2
    return tuple(midpoint[0] + np.array([-.5, .5]) * span), tuple(midpoint[1] + np.array([-.5, .5]) * span)


class ElectionExplorer:
    """Matplotlib UI. Keep the instance alive while its figure is open."""

    def __init__(self, seed=20261014, elections=30, component="combined"):
        import matplotlib.pyplot as plt
        from matplotlib.widgets import Button, Slider

        self.plt = plt
        self.component = component
        self.seed = int(seed)
        self.n = elections
        self.history = simulate_elections(self.n, self.seed)
        self.active = 0
        self.current = self.history[0]
        self.base = self.history[0]
        self.xlim, self.ylim = plot_domains()
        self.grid_x, self.grid_y = np.meshgrid(
            np.linspace(*self.xlim, 180), np.linspace(*self.ylim, 180))
        self.fig = plt.figure(figsize=(14, 10.5))
        self.fig.suptitle("Wizlandia election shocks - districts + nationwide PR", y=.98, fontsize=16)
        self.ax_compass = self.fig.add_axes([.07, .44, .43, .39])
        self.ax_seats = self.fig.add_axes([.62, .43, .29, .385])
        self.ax_history = self.fig.add_axes([.07, .105, .88, .18])
        self.status = self.fig.text(.07, .861, "", fontsize=10)
        self.detail = self.fig.text(.07, .382, "Hover over a district dot or a seat bar for details.",
                                    fontsize=9, va="top")
        self.fig.text(.07, .025,
                      "Light shading: nearest-party regions and national density. Dots: individual districts. "
                      "Star: national median. Thin seat marks: baseline.\n"
                      "Each election is a fresh shock around baseline; variance scales distances by its square root.",
                      fontsize=9)
        self.slider_axes = [self.fig.add_axes([.105, .918, .205, .022]),
                            self.fig.add_axes([.435, .918, .205, .022]),
                            self.fig.add_axes([.765, .918, .15, .022])]
        self.sliders = [
            Slider(self.slider_axes[0], "Economy", -1, 1, valinit=0, valstep=.01, valfmt="%+.2f"),
            Slider(self.slider_axes[1], "Culture", -1, 1, valinit=0, valstep=.01, valfmt="%+.2f"),
            Slider(self.slider_axes[2], "Variance", .5, 2, valinit=1, valstep=.01, valfmt="%.2fx"),
        ]
        for slider in self.sliders:
            slider.on_changed(self._slider_changed)
        self.buttons = []
        button_specs = [
            ("Baseline", .07, .13, lambda _: self.select_election(0)),
            ("Previous", .225, .13, self.previous_election),
            ("Next", .38, .13, self.next_election),
            (f"New {self.n}-election sequence", .535, .25, self.new_sequence),
        ]
        for label, x, width, callback in button_specs:
            button = Button(self.fig.add_axes([x, .321, width, .032]), label)
            button.on_clicked(callback)
            self.buttons.append(button)
        for index, component_name in enumerate(["district", "pr", "combined"]):
            button = Button(self.fig.add_axes([.62 + index * .10, .878, .09, .025]),
                            ("PR" if component_name == "pr" else component_name.title()))
            button.on_clicked(lambda _, name=component_name: self.set_component(name))
            self.buttons.append(button)
        self.sequence_label = self.fig.text(.81, .337, "", fontsize=9, ha="left", va="center")
        self.fig.canvas.mpl_connect("button_press_event", self._clicked)
        self.fig.canvas.mpl_connect("motion_notify_event", self._hover)
        self._draw_history()
        self._draw_current()

    def set_component(self, component):
        self.component = component
        self._draw_history()
        self._draw_current()

    def _slider_changed(self, _):
        self.active = -1
        self.current = evaluate(*(float(slider.val) for slider in self.sliders))
        self._draw_current()

    def select_election(self, index):
        if not 0 <= index < len(self.history):
            return
        self.active = int(index)
        self.current = self.history[self.active]
        for slider, value in zip(self.sliders, (
                self.current.economic, self.current.cultural, self.current.variance)):
            slider.eventson = False
            slider.set_val(value)
            slider.eventson = True
        self._draw_current()

    def previous_election(self, _=None):
        self.select_election(max(0, self.active - 1))

    def next_election(self, _=None):
        self.select_election(1 if self.active < 0 else min(self.n, self.active + 1))

    def new_sequence(self, _=None):
        self.seed += 104729
        self.history = simulate_elections(self.n, self.seed)
        self._draw_history()
        self.select_election(1)

    def _draw_compass(self):
        from matplotlib.patches import Polygon

        ax = self.ax_compass
        ax.clear()
        for i, color in enumerate(COLORS):
            polygon = _region_polygon(i, self.xlim, self.ylim)
            if len(polygon):
                ax.add_patch(Polygon(polygon, facecolor=color, alpha=.06, edgecolor="none"))
        election = self.current
        values = density(self.grid_x, self.grid_y, election.economic,
                         election.cultural, election.variance)
        levels = values.max() * np.array([.06, .16, .30, .47, .66, .84])
        ax.contourf(self.grid_x, self.grid_y, values,
                    levels=[*levels, values.max() * 1.001], cmap="Blues", alpha=.14)
        ax.contour(self.grid_x, self.grid_y, values, levels=levels,
                   colors="#4C88B7", linewidths=.65, linestyles="-", alpha=.65)
        ax.axhline(0, color=".5", linewidth=.65)
        ax.axvline(0, color=".5", linewidth=.65)
        ax.scatter(POINTS[:, 0], POINTS[:, 1], marker="x", c=".35", s=23, linewidths=.8, zorder=3)
        offsets = [(5, -3), (5, -3), (-6, -9), (5, 5), (5, -9),
                   (5, 5), (-6, -4), (5, 5), (5, -9)]
        for point, code, offset in zip(POINTS, CODES, offsets):
            ax.annotate(code, point, xytext=offset, textcoords="offset points",
                        fontsize=9, ha="right" if offset[0] < 0 else "left", zorder=5)
        colors = [COLORS[w[0]] if len(w) == 1 else ".45" for w in election.winners]
        self.dots = ax.scatter(election.points[:, 0], election.points[:, 1],
                               s=10, c=colors, alpha=.85,
                               edgecolors="none", zorder=4)
        ax.scatter(*election.national_median, marker="*", s=95, c="black",
                   edgecolors="none", zorder=6)
        ax.set(xlim=self.xlim, ylim=self.ylim, xlabel="Economy (market liberal +)",
               ylabel="Culture (traditional +)", title="Electorate and district medians")
        ax.set_aspect("equal", adjustable="box")
        ax.grid(True, color=".87", linewidth=.5, linestyle="-")
        ax.set_axisbelow(True)

    def _draw_seats(self):
        ax = self.ax_seats
        ax.clear()
        positions = np.arange(len(CODES))
        seats = self.current.component_seats(self.component)
        baseline = self.base.component_seats(self.component)
        order = DISPLAY_ORDER
        total = int(seats.sum())
        ax.barh(positions, seats[order], color=[COLORS[i] for i in order], height=.68)
        ax.vlines(baseline[order], positions - .4, positions + .4,
                  color=".4", linewidth=1.1, linestyles="-")
        for position, i in enumerate(order):
            ax.text(1.025, position, str(seats[i]), transform=ax.get_yaxis_transform(),
                    va="center", fontsize=10)
        ax.set(yticks=positions, yticklabels=[CODES[i] for i in order], xlim=(0, total),
               ylim=(len(CODES) - .4, -.65), xlabel=f"Seats out of {total}",
               ylabel="Party", title=f"{self.component.upper() if self.component == 'pr' else self.component.title()} seats (majority {total // 2 + 1})")
        ax.grid(axis="x", color=".88", linewidth=.5, linestyle="-")
        ax.set_axisbelow(True)

    def _draw_history(self):
        ax = self.ax_history
        ax.clear()
        indices = np.arange(len(self.history))
        bottom = np.zeros(len(self.history))
        seats = np.array([e.component_seats(self.component) for e in self.history])
        for j in DISPLAY_ORDER:
            ax.bar(indices, seats[:, j], bottom=bottom, color=COLORS[j], width=.86,
                   edgecolor="none", label=CODES[j])
            bottom += seats[:, j]
        total = int(seats[0].sum())
        ax.set(xlim=(-.6, self.n + .6), ylim=(0, total),
               xticks=np.unique(np.linspace(0, self.n, 7, dtype=int)),
               xlabel="Election (0 = baseline)", ylabel=f"{self.component.title()} seats")
        ax.grid(axis="y", color=".88", linewidth=.5, linestyle="-")
        ax.set_axisbelow(True)
        self.history_marker, = ax.plot([], [], marker="v", color=".2", markersize=7,
                                       linestyle="None", clip_on=False)

    def _draw_current(self):
        self._draw_compass()
        self._draw_seats()
        median = self.current.national_median
        label = ("Baseline" if self.active == 0 else
                 "Custom election" if self.active < 0 else f"Election {self.active}")
        ties = f" | {self.current.tied_districts} tied districts" if self.current.tied_districts else ""
        self.status.set_text(
            f"{label} | national median ({median[0]:.2f}, {median[1]:.2f})"
            f" | economic shift {self.current.economic:+.2f}"
            f" | cultural shift {self.current.cultural:+.2f}"
            f" | variance {self.current.variance:.2f}x{ties}")
        self.sequence_label.set_text(
            "Custom" if self.active < 0 else f"Election {self.active}/{self.n}")
        self.history_marker.set_data([self.active] if self.active >= 0 else [],
                                     [int(self.current.component_seats(self.component).sum()) * 1.0275] if self.active >= 0 else [])
        self.detail.set_text("Hover over a district dot or a seat bar for details.")
        self.fig.canvas.draw_idle()

    def _clicked(self, event):
        if event.inaxes is self.ax_history and event.xdata is not None:
            self.select_election(int(np.clip(math.floor(event.xdata + .5), 0, self.n)))

    def _hover(self, event):
        text = "Hover over a district dot or a seat bar for details."
        if event.inaxes is self.ax_compass and event.x is not None:
            screen_points = self.ax_compass.transData.transform(self.current.points)
            distances = np.linalg.norm(screen_points - [event.x, event.y], axis=1)
            i = int(np.argmin(distances))
            if distances[i] <= 22:
                names = " / ".join(CODES[j] for j in self.current.winners[i])
                x, y = self.current.points[i]
                type_index = INDIVIDUAL_TYPE_INDEX[i]
                text = (f"{INDIVIDUAL_IDS[i]}: {DISTRICT_NAMES[type_index]} | "
                        f"({x:.3f}, {y:.3f}) | {names}")
        elif event.inaxes is self.ax_seats and event.ydata is not None:
            position = int(math.floor(event.ydata + .5))
            if 0 <= position < len(CODES):
                i = DISPLAY_ORDER[position]
                seats = self.current.component_seats(self.component)
                change = seats[i] - self.base.component_seats(self.component)[i]
                text = (f"{NAMES[i]} | {seats[i]} {self.component} seats ({change:+d})"
                        f" | national vote {100 * self.current.votes[i]:.2f}%")
        elif event.inaxes is self.ax_history and event.xdata is not None:
            i = int(np.clip(math.floor(event.xdata + .5), 0, self.n))
            election = self.history[i]
            text = (f"Election {i} | economic {election.economic:+.2f}, "
                    f"cultural {election.cultural:+.2f}, variance {election.variance:.2f}x | "
                    + " | ".join(f"{code} {n}" for code, n in zip(CODES, election.component_seats(self.component)) if n))
        if text != self.detail.get_text():
            self.detail.set_text(text)
            self.fig.canvas.draw_idle()

    def save_csv(self, path):
        save_elections_csv(path, self.history)


def self_test():
    """Fast reproducible checks, including the national median and small shocks."""
    from scipy.optimize import brentq

    assert TOTAL_DISTRICTS == 400
    assert len(DISTRICT_ROWS) == 50
    assert DISTRICT_SPREAD == .20
    assert len(set(INDIVIDUAL_IDS)) == 400
    assert sum(g["population"] for g in DISTRICT_GEOGRAPHY.values()) == 212000000
    assert np.array_equal(evaluate().pr_seats, [124, 100, 44, 40, 32, 28, 16, 12, 4])
    assert np.array_equal(evaluate().combined_seats, [310, 270, 62, 60, 38, 28, 16, 12, 4])
    assert np.array_equal(allocate_pr([.4, .35, .25], 7), [3, 2, 2])
    assert [CODES[i] for i in DISPLAY_ORDER] == ["SWP", "UPL", "SDP", "GRN", "CA", "LDP", "CON", "LIB", "NF"]
    assert np.array_equal(evaluate().seats, BASELINE_SEATS)
    assert len(INDIVIDUAL_CENTRES) == 400
    assert len(np.unique(INDIVIDUAL_CENTRES, axis=0)) == 400
    assert np.max(np.linalg.norm(INDIVIDUAL_CENTRES -
                  DISTRICT_CENTRES[INDIVIDUAL_TYPE_INDEX], axis=1)) <= DISTRICT_SPREAD + 1e-12
    for i, centre in enumerate(DISTRICT_CENTRES):
        assert np.allclose(INDIVIDUAL_CENTRES[INDIVIDUAL_TYPE_INDEX == i].mean(axis=0), centre)
    # Previously the six Green seats could only change together. Hold every
    # other parameter fixed and verify all intermediate counts are reachable.
    green_counts = set()
    for cultural in np.linspace(0, 1, 1001):
        points = INDIVIDUAL_CENTRES + [0, cultural]
        winners = np.argmin(((points[:, None] - POINTS) ** 2).sum(axis=2), axis=1)
        green_counts.add(int(np.sum(winners == 4)))
    assert set(range(7)).issubset(green_counts), green_counts
    assert np.allclose(vote_shares(), TARGETS, atol=1e-8, rtol=0)
    median_x = brentq(lambda x: np.dot(WEIGHTS, ndtr((x - MEANS[:, 0]) /
                              STANDARD_DEVIATIONS[:, 0])) - .5, -20, 20)
    assert abs(median_x - 2) < 1e-10
    sequence = simulate_elections()
    assert len(sequence) == 31
    assert (sequence[1].economic, sequence[1].cultural) == (.5, .27)
    assert np.isclose(sequence[1].variance, 1.0060428394690435, atol=1e-14, rtol=0)
    # Normalization and reciprocal truncation do not affect PDF equality.
    v = np.array([.5, .6, .8, 1.0, 1.2, 1.8, 2.0])
    unnormalized_pdf = lambda x: np.exp(-.5 * ((np.log(x) - .20**2) / .20)**2) / x
    assert np.allclose(unnormalized_pdf(v), unnormalized_pdf(1 / v), rtol=1e-13, atol=0)
    for election in sequence:
        assert election.district_seats.sum() == 400
        assert election.pr_seats.sum() == 400
        assert election.combined_seats.sum() == 800
        assert abs(election.votes.sum() - 1) < 1e-8
    for economic in [-1, 0, 1]:
        for cultural in [-1, 0, 1]:
            for variance in [.5, 1, 2]:
                election = evaluate(economic, cultural, variance)
                assert election.district_seats.sum() == 400
                assert election.pr_seats.sum() == 400
                assert election.combined_seats.sum() == 800
                assert np.min(election.votes) > -1e-10
                assert abs(election.votes.sum() - 1) < 1e-8
    print("All checks passed.")
    print("Baseline seats:", dict(zip(CODES, evaluate().seats.tolist())))
    print("National median X:", median_x)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seed", type=int, default=20261014)
    parser.add_argument("--elections", type=int, default=30)
    parser.add_argument("--economic", type=float, default=None, help="Initial economic shift [-1,1]")
    parser.add_argument("--cultural", type=float, default=None, help="Initial cultural shift [-1,1]")
    parser.add_argument("--variance", type=float, default=None, help="Initial variance multiplier [.5,2]")
    parser.add_argument("--component", choices=["district", "pr", "combined"], default="combined")
    parser.add_argument("--output", type=Path, help="Save initial figure, e.g. election.png")
    parser.add_argument("--csv", type=Path, help="Export baseline + election sequence")
    parser.add_argument("--district-csv", type=Path, help="Export individual districts for initial scenario")
    parser.add_argument("--no-show", action="store_true", help="Headless output; no GUI window")
    parser.add_argument("--self-test", action="store_true", help="Run numerical checks and exit")
    args = parser.parse_args()
    if args.elections < 1:
        parser.error("--elections must be positive")
    initial = (0 if args.economic is None else args.economic,
               0 if args.cultural is None else args.cultural,
               1 if args.variance is None else args.variance)
    try:
        evaluate(*initial)
    except ValueError as error:
        parser.error(str(error))
    if args.self_test:
        self_test()
        return
    if args.no_show:
        import matplotlib
        matplotlib.use("Agg")
    explorer = ElectionExplorer(seed=args.seed, elections=args.elections, component=args.component)
    if any(value is not None for value in (args.economic, args.cultural, args.variance)):
        explorer.active = -1
        explorer.current = evaluate(*initial)
        for slider, value in zip(explorer.sliders, initial):
            slider.eventson = False
            slider.set_val(value)
            slider.eventson = True
        explorer._draw_current()
    if args.output:
        explorer.fig.savefig(args.output, dpi=160, bbox_inches="tight")
    if args.csv:
        explorer.save_csv(args.csv)
    if args.district_csv:
        save_districts_csv(args.district_csv, explorer.current)
    for component in ["district", "pr", "combined"]:
        print(f"{component.title()} seats:", dict(zip(CODES, explorer.current.component_seats(component).tolist())))
    print("National votes (%):",
          dict(zip(CODES, (100 * explorer.current.votes).round(4).tolist())))
    if args.no_show:
        explorer.plt.close(explorer.fig)
    else:
        explorer.plt.show()


if __name__ == "__main__":
    main()

