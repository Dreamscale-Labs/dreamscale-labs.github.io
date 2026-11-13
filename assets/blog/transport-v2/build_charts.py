#!/usr/bin/env python3
"""Draws the Transport V2 post's charts from data.json.

    python3 assets/blog/transport-v2/build_charts.py            # three transports
    python3 assets/blog/transport-v2/build_charts.py --no-ots   # without the off-the-shelf arm

Writes fig-latency.svg, fig-tail.svg, fig-hours.svg and social.svg next to this file.
"""
import json
import math
import sys
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).parent
DATA = json.loads((HERE / "data.json").read_text())
WITH_OTS = "--no-ots" not in sys.argv

INK, MUTED, GRID, PAPER = "#212121", "#686868", "#e4e6e4", "#ffffff"
ARMS = [
    ("v2", "Transport V2", "#0047ab"),
    ("v1", "Transport V1", "#8b918d"),
    ("ots", "Off-the-shelf WebRTC", "#c9792b"),
]
if not WITH_OTS:
    ARMS = ARMS[:2]
FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
        f'role="img" aria-label="{title}" font-family="{FONT}">'
        f'<rect width="{w}" height="{h}" fill="{PAPER}"/>{body}</svg>\n'
    )


def text(x, y, s, size=22, fill=INK, anchor="start", weight=400):
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" '
        f'text-anchor="{anchor}" font-weight="{weight}">{s}</text>'
    )


def latency_bars(w=1200, top=0, big=False):
    """p50, p99 and p99.9 network time, one bar per transport."""
    arms = DATA["z5"]["arms"]
    left, right = 290, 130
    bar_h, gap, group_gap = (34, 8, 36) if big else (34, 8, 50)
    xmax = 1000.0
    span = w - left - right
    out, y = [], top
    for q, label in (("0.5", "Median (p50)"), ("0.99", "p99"), ("0.999", "p99.9")):
        out.append(text(0, y + 22, label, 22, MUTED))
        y += 38
        for key, name, color in ARMS:
            v = arms[key]["net"][q]
            bw = span * v / xmax
            mid = y + bar_h / 2 + 8
            out.append(text(left - 16, mid, name, 23, INK, "end", 600 if key == "v2" else 400))
            out.append(f'<rect x="{left}" y="{y}" width="{bw:.1f}" height="{bar_h}" fill="{color}"/>')
            out.append(text(left + bw + 12, mid, f"{v:.0f} ms", 23, INK, "start", 600 if key == "v2" else 400))
            y += bar_h + gap
        y += group_gap - gap
    return "".join(out), y - group_gap + gap


def fig_latency():
    body, h = latency_bars(top=8)
    return svg(1200, h + 12, body, "Network time per request at the median, p99 and p99.9, by transport")


def fig_tail():
    """Share of requests slower than x, log-log."""
    w, h = 1200, 640
    l, r, t, b = 110, 250, 24, 74
    x0, x1 = math.log10(30), math.log10(1500)
    y0, y1 = 0.0, -4.0  # 100% .. 0.01%

    def X(ms):
        return l + (math.log10(ms) - x0) / (x1 - x0) * (w - l - r)

    def Y(share):
        return t + (math.log10(share) - y0) / (y1 - y0) * (h - t - b)

    out = []
    for share, lab in ((1, "100%"), (0.1, "10%"), (0.01, "1%"), (0.001, "0.1%"), (0.0001, "0.01%")):
        out.append(f'<line x1="{l}" x2="{w - r}" y1="{Y(share):.1f}" y2="{Y(share):.1f}" stroke="{GRID}"/>')
        out.append(text(l - 14, Y(share) + 7, lab, 20, MUTED, "end"))
    for ms in (50, 100, 250, 500, 1000):
        out.append(f'<line x1="{X(ms):.1f}" x2="{X(ms):.1f}" y1="{t}" y2="{h - b}" stroke="{GRID}"/>')
        out.append(text(X(ms), h - b + 30, f"{ms} ms", 20, MUTED, "middle"))
    out.append(text((l + w - r) / 2, h - 8, "Network time per request", 20, MUTED, "middle"))
    out.append(
        f'<text transform="translate(26,{(t + h - b) / 2:.0f}) rotate(-90)" font-size="20" fill="{MUTED}" '
        f'text-anchor="middle">Share of requests slower</text>'
    )
    ends = []
    for key, name, color in ARMS:
        pts = [(ms, s) for s, ms in DATA["z5"]["arms"][key]["curve_net"] if s >= 1e-4 and 30 <= ms <= 1500]
        d = " ".join(f"{'M' if i == 0 else 'L'}{X(ms):.1f},{Y(s):.1f}" for i, (ms, s) in enumerate(pts))
        out.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{4 if key == "v2" else 3}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>'
        )
        ends.append([Y(pts[-1][1]), X(pts[-1][0]), name, color, key])
    # Direct labels at the right edge, nudged apart.
    ends.sort()
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 30:
            ends[i][0] = ends[i - 1][0] + 30
    shift = max(0, ends[-1][0] - (h - b - 4))
    for y, x, name, color, key in ends:
        out.append(text(w - r + 14, y - shift + 7, name, 21, color, "start", 600))
    return svg(w, h, "".join(out), "Share of requests slower than a given network time, by transport")


def fig_hours():
    """Z3: time waiting on a late reply, hour by hour for 24 hours."""
    hours = DATA["z3"]["hours"]
    w, h = 1200, 520
    l, r, t, b = 90, 20, 56, 70
    ymax = 50.0
    slot = (w - l - r) / len(hours)
    bw = slot * 0.36

    def Y(v):
        return h - b - v / ymax * (h - t - b)

    out = []
    for v in (0, 10, 20, 30, 40, 50):
        out.append(f'<line x1="{l}" x2="{w - r}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" stroke="{GRID}"/>')
        out.append(text(l - 12, Y(v) + 7, f"{v}%", 20, MUTED, "end"))
    for i, hr in enumerate(hours):
        x = l + i * slot + slot / 2
        out.append(f'<rect x="{x - bw - 1:.1f}" y="{Y(hr["v1"]):.1f}" width="{bw:.1f}" height="{h - b - Y(hr["v1"]):.1f}" fill="#8b918d"/>')
        out.append(f'<rect x="{x + 1:.1f}" y="{Y(hr["v2"]):.1f}" width="{bw:.1f}" height="{max(1.5, h - b - Y(hr["v2"])):.1f}" fill="#0047ab"/>')
        if i % 3 == 0:
            pst = datetime.strptime(hr["start_utc"], "%Y%m%dT%H%M%S") - timedelta(hours=8)
            lab = pst.strftime("%-I %p").lower()
            out.append(text(x, h - b + 30, lab, 20, MUTED, "middle"))
    out.append(text((l + w - r) / 2, h - 8, "Hour of the run (Pacific time)", 20, MUTED, "middle"))
    lx = l + 4
    out.append(f'<rect x="{lx}" y="10" width="18" height="18" fill="#8b918d"/>' + text(lx + 26, 26, "Transport V1", 21))
    out.append(f'<rect x="{lx + 200}" y="10" width="18" height="18" fill="#0047ab"/>' + text(lx + 226, 26, "Transport V2", 21, INK, "start", 600))
    return svg(w, h, "".join(out), "Share of time spent waiting on a late reply in each of 24 hours, Transport V1 and V2")


def social():
    """1600x900 card for X and LinkedIn."""
    w, h, pad = 1600, 900, 90
    arms = DATA["z5"]["arms"]
    body, end = latency_bars(w=w - 2 * pad, top=0, big=True)
    v1, v2 = arms["v1"]["net"]["0.99"], arms["v2"]["net"]["0.99"]
    out = [
        text(pad, 118, "Transport V2", 64, INK, "start", 600),
        text(pad, 176, f"p99 network latency: {v1:.0f} ms → {v2:.0f} ms on home Wi-Fi.", 34, MUTED),
        f'<g transform="translate({pad},236)">{body}</g>',
        text(pad, h - 52, "Network time per request, three-camera observations at 4 Hz, one home Wi-Fi link to a US West cloud host.", 22, MUTED),
        text(w - pad, h - 52, "dreamscalelabs.com", 22, INK, "end", 600),
    ]
    assert 236 + end < h - 90, end
    return svg(w, h, "".join(out), "Transport V2: p99 network latency by transport")


for name, fn in (("fig-latency", fig_latency), ("fig-tail", fig_tail), ("fig-hours", fig_hours), ("social", social)):
    (HERE / f"{name}.svg").write_text(fn())
    print("wrote", name)
