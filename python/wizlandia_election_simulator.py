#!/usr/bin/env python3
"""Interactive Wizlandia election simulator: latest 186--170 district baseline.

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

Baseline seats: LDP 186, CA 170, SDP 18, CON 20, GRN 6, all others zero.
National baseline votes: 31%, 25%, 11%, 10%, 8%, 7%, 4%, 3%, 1%.
Each district has its own fixed, tiny offset from its type centre (at most
0.10 compass units). Antithetic offsets preserve each type mean. The radius
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
reproducible. All data are embedded: no other files are needed.
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
    (26, "Unionised export-manufacturing towns", 10, -0.75, -0.05681012304697498),
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
DISTRICT_SPREAD = 0.10
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
            *[f"{code}_seats" for code in CODES],
            *[f"{code}_vote_percent" for code in CODES],
        ])
        for index, election in enumerate(history):
            writer.writerow([
                index, election.economic, election.cultural, election.variance,
                *election.national_median, election.tied_districts,
                *election.seats, *(100 * election.votes),
            ])


def save_districts_csv(path, election=None):
    """One row per individual district, including its type and coordinates."""
    election = evaluate() if election is None else election
    with Path(path).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["district_id", "type_id", "district_type", "economic_x",
                         "cultural_y", "nearest_party"])
        for i, type_index in enumerate(INDIVIDUAL_TYPE_INDEX):
            writer.writerow([INDIVIDUAL_IDS[i], DISTRICT_IDS[type_index],
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

    def __init__(self, seed=20261014, elections=30):
        import matplotlib.pyplot as plt
        from matplotlib.widgets import Button, Slider

        self.plt = plt
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
        self.fig.suptitle("Wizlandia election shocks - broader LDP districts", y=.98, fontsize=16)
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
        self.sequence_label = self.fig.text(.81, .337, "", fontsize=9, ha="left", va="center")
        self.fig.canvas.mpl_connect("button_press_event", self._clicked)
        self.fig.canvas.mpl_connect("motion_notify_event", self._hover)
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
        ax.barh(positions, self.current.seats, color=COLORS, height=.68)
        ax.vlines(self.base.seats, positions - .4, positions + .4,
                  color=".4", linewidth=1.1, linestyles="-")
        for i, seats in enumerate(self.current.seats):
            ax.text(1.025, i, str(seats), transform=ax.get_yaxis_transform(),
                    va="center", fontsize=10)
        ax.set(yticks=positions, yticklabels=CODES, xlim=(0, 400),
               ylim=(len(CODES) - .4, -.65), xlabel="Seats out of 400",
               ylabel="Party", title="District seats")
        ax.grid(axis="x", color=".88", linewidth=.5, linestyle="-")
        ax.set_axisbelow(True)

    def _draw_history(self):
        ax = self.ax_history
        ax.clear()
        indices = np.arange(len(self.history))
        bottom = np.zeros(len(self.history))
        seats = np.array([e.seats for e in self.history])
        for j, (code, color) in enumerate(zip(CODES, COLORS)):
            ax.bar(indices, seats[:, j], bottom=bottom, color=color, width=.86,
                   edgecolor="none", label=code)
            bottom += seats[:, j]
        ax.set(xlim=(-.6, self.n + .6), ylim=(0, 400),
               xticks=np.unique(np.linspace(0, self.n, 7, dtype=int)),
               xlabel="Election (0 = baseline)", ylabel="District seats")
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
                                     [411] if self.active >= 0 else [])
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
            i = int(math.floor(event.ydata + .5))
            if 0 <= i < len(CODES):
                change = self.current.seats[i] - self.base.seats[i]
                text = (f"{NAMES[i]} | {self.current.seats[i]} district seats ({change:+d})"
                        f" | national vote {100 * self.current.votes[i]:.2f}%")
        elif event.inaxes is self.ax_history and event.xdata is not None:
            i = int(np.clip(math.floor(event.xdata + .5), 0, self.n))
            election = self.history[i]
            text = (f"Election {i} | economic {election.economic:+.2f}, "
                    f"cultural {election.cultural:+.2f}, variance {election.variance:.2f}x | "
                    + " | ".join(f"{code} {n}" for code, n in zip(CODES, election.seats) if n))
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
        assert election.seats.sum() == 400
        assert abs(election.votes.sum() - 1) < 1e-8
    for economic in [-1, 0, 1]:
        for cultural in [-1, 0, 1]:
            for variance in [.5, 1, 2]:
                election = evaluate(economic, cultural, variance)
                assert election.seats.sum() == 400
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
    parser.add_argument("--output", type=Path, help="Save initial figure, e.g. election.png")
    parser.add_argument("--csv", type=Path, help="Export baseline + election sequence")
    parser.add_argument("--district-csv", type=Path, help="Export district types for initial scenario")
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
    explorer = ElectionExplorer(seed=args.seed, elections=args.elections)
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
    print("Current seats:", dict(zip(CODES, explorer.current.seats.tolist())))
    print("National votes (%):",
          dict(zip(CODES, (100 * explorer.current.votes).round(4).tolist())))
    if args.no_show:
        explorer.plt.close(explorer.fig)
    else:
        explorer.plt.show()


if __name__ == "__main__":
    main()

