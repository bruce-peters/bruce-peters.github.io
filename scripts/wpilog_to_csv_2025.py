#!/usr/bin/env python3
"""Convert the 2025 sim WPILog to a CSV for autoPlayback2025.js.

Tracks:
  - /ReplayOutputs/RobotState/EstimatedPose                          (Pose3d)
  - /ReplayOutputs/Superstructure/Mechanism Poses/Elevator Pose      (Pose3d)
  - /ReplayOutputs/Superstructure/Mechanism Poses/Pivot Pose         (Pose3d)

Time window: the full span of EstimatedPose records (auto + teleop).

Usage:
  python scripts/wpilog_to_csv_2025.py public/wpilog/<file>.wpilog [out.csv]
"""

from __future__ import annotations

import csv
import struct
import sys
from pathlib import Path

POSE3D_BYTES = 56  # 7 doubles: x, y, z, qw, qx, qy, qz
POSE2D_BYTES = 24  # 3 doubles: x, y, heading_radians

TARGETS = {
    "robot":    "/ReplayOutputs/RobotState/EstimatedPose",
    "elevator": "/ReplayOutputs/Superstructure/Mechanism Poses/Elevator Pose",
    "pivot":    "/ReplayOutputs/Superstructure/Mechanism Poses/Pivot Pose",
}

ENABLED_KEY = "/DriverStation/Enabled"
AUTO_KEY    = "/DriverStation/Autonomous"

# Also accept without leading slash
_ALIASES: dict[str, str] = {}
for _k, _v in TARGETS.items():
    _ALIASES[_v.lstrip("/")] = _k


def _canonical(name: str) -> str | None:
    if name in TARGETS.values():
        return next(k for k, v in TARGETS.items() if v == name)
    return _ALIASES.get(name.lstrip("/"))


def read_uint_le(buf: bytes, off: int, n: int) -> tuple[int, int]:
    return int.from_bytes(buf[off:off + n], "little", signed=False), off + n


def decode_pose3d(buf: bytes, off: int = 0) -> tuple[float, ...]:
    return struct.unpack_from("<7d", buf, off)


import math as _math

def decode_pose2d_as_3d(buf: bytes, off: int = 0) -> tuple[float, ...]:
    """Decode a Pose2d (x, y, heading_rad) into a Pose3d 7-tuple with z=0."""
    x, y, h = struct.unpack_from("<3d", buf, off)
    qw = _math.cos(h / 2)
    qz = _math.sin(h / 2)
    return (x, y, 0.0, qw, 0.0, 0.0, qz)


def parse_wpilog(path: str):
    data = Path(path).read_bytes()
    if data[:6] != b"WPILOG":
        raise SystemExit(f"Not a WPILOG file: {path}")
    extra_len = int.from_bytes(data[8:12], "little")
    pos = 12 + extra_len

    entries: dict[int, tuple[str, str]] = {}
    records: list[tuple[int, str, str, bytes]] = []

    n = len(data)
    while pos < n:
        bitfield = data[pos]; pos += 1
        id_len   = (bitfield & 0x3) + 1
        size_len = ((bitfield >> 2) & 0x3) + 1
        ts_len   = ((bitfield >> 4) & 0x7) + 1
        if pos + id_len + size_len + ts_len > n:
            break
        entry_id,    pos = read_uint_le(data, pos, id_len)
        payload_size, pos = read_uint_le(data, pos, size_len)
        timestamp,   pos = read_uint_le(data, pos, ts_len)
        payload = data[pos:pos + payload_size]
        pos += payload_size

        if entry_id == 0:
            if not payload:
                continue
            ctype = payload[0]
            if ctype == 0:  # start record
                cpos = 1
                eid = int.from_bytes(payload[cpos:cpos + 4], "little"); cpos += 4
                nlen = int.from_bytes(payload[cpos:cpos + 4], "little"); cpos += 4
                name = payload[cpos:cpos + nlen].decode("utf-8", "replace"); cpos += nlen
                tlen = int.from_bytes(payload[cpos:cpos + 4], "little"); cpos += 4
                tname = payload[cpos:cpos + tlen].decode("utf-8", "replace")
                entries[eid] = (name, tname)
        else:
            meta = entries.get(entry_id)
            if meta is None:
                continue
            name, tname = meta
            records.append((timestamp, name, tname, payload))

    return records, entries


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    in_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else str(
        Path(in_path).stem.split("_sim")[0] + "_sim.auto.csv")

    # Default output next to this script's sibling public/wpilog/
    if len(sys.argv) < 3:
        out_path = str(Path(in_path).parent / "akit_25_sim.auto.csv")

    print(f"Parsing {in_path}...")
    records, entries = parse_wpilog(in_path)
    print(f"  entries: {len(entries)}   records: {len(records)}")

    # Collect series
    series: dict[str, list[tuple[int, bytes]]] = {k: [] for k in TARGETS}
    for ts, name, tname, payload in records:
        k = _canonical(name)
        if k is not None:
            series[k].append((ts, payload))

    for k, lst in series.items():
        print(f"  {k}: {len(lst)} records")

    if not series["robot"]:
        print("\nNo robot pose data found. Dumping all entry names:")
        for eid, (name, tname) in sorted(entries.items()):
            print(f"  [{eid:4d}] {tname:40s}  {name}")
        sys.exit(1)

    # Time window: first rising edge of Enabled to last falling edge (auto + teleop)
    t_start: int | None = None
    t_end:   int | None = None
    was_enabled = False
    for ts, name, _tname, payload in records:
        if name != ENABLED_KEY or not payload:
            continue
        is_en = payload[0] != 0
        if is_en and not was_enabled:
            if t_start is None:
                t_start = ts     # first rising edge
        elif not is_en and was_enabled:
            t_end = ts           # most recent falling edge
        was_enabled = is_en
    if was_enabled:              # still enabled at EOF
        t_end = records[-1][0]
    if t_start is None:
        robot_ts = [ts for ts, _ in series["robot"]]
        t_start, t_end = min(robot_ts), max(robot_ts)
        print("  WARNING: no Enabled signal; using full robot pose span")
    print(f"  enabled span: {t_start/1e6:.3f}s -> {t_end/1e6:.3f}s  "
          f"(duration {(t_end - t_start)/1e6:.3f}s)")

    # Filter all series to window
    for k in TARGETS:
        series[k] = [(ts, p) for ts, p in series[k] if t_start <= ts <= t_end]
    all_ts = sorted({ts for lst in series.values() for ts, _ in lst})

    # Carry-forward cursors
    cursors = {k: 0 for k in TARGETS}
    latest:  dict[str, bytes | None] = {k: None for k in TARGETS}

    # Pre-seed with last value before window start
    for k, lst in series.items():
        i = 0
        while i < len(lst) and lst[i][0] <= t_start:
            latest[k] = lst[i][1]
            i += 1
        cursors[k] = i

    def fmt(p):
        return [f"{v:.6f}" for v in p]

    BLANK = [""] * 7

    headers = [
        "t_s",
        "robot_x",    "robot_y",    "robot_z",    "robot_qw",    "robot_qx",    "robot_qy",    "robot_qz",
        "elevator_x", "elevator_y", "elevator_z", "elevator_qw", "elevator_qx", "elevator_qy", "elevator_qz",
        "pivot_x",    "pivot_y",    "pivot_z",    "pivot_qw",    "pivot_qx",    "pivot_qy",    "pivot_qz",
    ]

    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for ts in all_ts:
            for k, lst in series.items():
                c = cursors[k]
                while c < len(lst) and lst[c][0] <= ts:
                    latest[k] = lst[c][1]
                    c += 1
                cursors[k] = c

            row = [f"{(ts - t_start)/1e6:.6f}"]
            # robot is Pose2d (24 B); mechanisms are Pose3d (56 B)
            rp = latest["robot"]
            if rp and len(rp) >= POSE2D_BYTES:
                row += fmt(decode_pose2d_as_3d(rp))
            else:
                row += BLANK
            for key in ("elevator", "pivot"):
                p = latest[key]
                if p and len(p) >= POSE3D_BYTES:
                    row += fmt(decode_pose3d(p))
                else:
                    row += BLANK
            w.writerow(row)

    print(f"Wrote {out_path}  ({len(all_ts)} rows)")


if __name__ == "__main__":
    main()
