#!/usr/bin/env python3
"""Convert a WPILog (AdvantageKit) file to a CSV slice of the autonomous period.

Tracks:
  - /AdvantageKit/RealOutputs/Field Simulation/Robot Position   (Pose3d)
  - /AdvantageKit/RealOutputs/Intake/Intake Rack/Display Pose3d (Pose3d)
  - /AdvantageKit/RealOutputs/Shooter/Shooter Hood/Display Pose3d (Pose3d)
  - /AdvantageKit/RealOutputs/Field Simulation/Robot Fuel       (Pose3d or Pose3d[])
  - /AdvantageKit/RealOutputs/Field Simulation/Fuels            (Pose3d[])

Auto-period boundaries are inferred from /AdvantageKit/DriverStation/Enabled
AND /AdvantageKit/DriverStation/Autonomous: the window is the first time both
are true through the moment Autonomous returns to false.

Usage:
  python scripts/wpilog_to_csv.py public/wpilog/<file>.wpilog [out.csv]
"""

from __future__ import annotations

import csv
import json
import struct
import sys
from pathlib import Path

POSE3D_BYTES = 56  # 7 doubles: x, y, z, qw, qx, qy, qz
TRANSLATION3D_BYTES = 24  # 3 doubles: x, y, z
POSE2D_BYTES = 24  # 3 doubles: x, y, heading_radians

# PathPlanner active-path key — Pose2d[] of the path the robot is following.
ACTIVE_PATH_KEY = "/AdvantageKit/RealOutputs/Path Planner/Active Path"

TARGETS = {
    "robot_pos":   "/AdvantageKit/RealOutputs/Field Simulation/Robot Position",
    "intake":      "/AdvantageKit/RealOutputs/Intake/Intake Rack/Display Pose3d",
    "shooter":     "/AdvantageKit/RealOutputs/Shooter/Shooter Hood/Display Pose3d",
    "robot_fuel":  "/AdvantageKit/RealOutputs/Field Simulation/Robot Fuel",
    "field_fuels": "/AdvantageKit/RealOutputs/Field Simulation/Fuels",
    # Per-subsystem current state (string enum names) — drives the state tower.
    "intake_state":     "/AdvantageKit/RealOutputs/Intake/Intake Rack/Target",
    "shooter_state":    "/AdvantageKit/RealOutputs/Shooter/Target State",
    "serializer_state": "/AdvantageKit/RealOutputs/Serializer/Target",
    "swerve_state":     "/AdvantageKit/RealOutputs/Swerve/Drive Mode",
}

# Keys whose payload is a UTF-8 string (enum name). Ordered — these become
# trailing CSV columns in this order.
STRING_KEYS = ["intake_state", "shooter_state", "serializer_state", "swerve_state"]

ENABLED_KEY = "/AdvantageKit/DriverStation/Enabled"
AUTO_KEY = "/AdvantageKit/DriverStation/Autonomous"


def normalize(name: str) -> str:
    """Normalize an entry name so `/AdvantageKit/X` and `/X` match."""
    if name.startswith("/AdvantageKit/"):
        return name[len("/AdvantageKit"):]
    return name


def read_uint_le(buf: bytes, off: int, n: int) -> tuple[int, int]:
    return int.from_bytes(buf[off:off + n], "little", signed=False), off + n


def decode_pose3d(buf: bytes, off: int = 0) -> tuple[float, ...]:
    return struct.unpack_from("<7d", buf, off)


def decode_pose3d_array(payload: bytes) -> list[tuple[float, ...]]:
    n = len(payload) // POSE3D_BYTES
    return [decode_pose3d(payload, i * POSE3D_BYTES) for i in range(n)]


def decode_translation3d_array(payload: bytes) -> list[tuple[float, float, float]]:
    n = len(payload) // TRANSLATION3D_BYTES
    return [struct.unpack_from("<3d", payload, i * TRANSLATION3D_BYTES) for i in range(n)]


def decode_array(tname: str, payload: bytes) -> list[tuple[float, ...]]:
    """Decode a struct array payload according to its WPILib type name."""
    base = tname[len("struct:"):] if tname.startswith("struct:") else tname
    base = base.rstrip("[]")
    if base == "Pose3d":
        return decode_pose3d_array(payload)
    if base == "Translation3d":
        return decode_translation3d_array(payload)
    # Fallback: assume Pose3d if size matches, else Translation3d
    if payload and len(payload) % POSE3D_BYTES == 0:
        return decode_pose3d_array(payload)
    if payload and len(payload) % TRANSLATION3D_BYTES == 0:
        return decode_translation3d_array(payload)
    return []


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
        id_len = (bitfield & 0x3) + 1
        size_len = ((bitfield >> 2) & 0x3) + 1
        ts_len = ((bitfield >> 4) & 0x7) + 1
        entry_id, pos = read_uint_le(data, pos, id_len)
        payload_size, pos = read_uint_le(data, pos, size_len)
        timestamp, pos = read_uint_le(data, pos, ts_len)
        payload = data[pos:pos + payload_size]
        pos += payload_size

        if entry_id == 0:
            if not payload:
                continue
            ctype = payload[0]
            cpos = 1
            if ctype == 0:  # start
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


def find_auto_window(records):
    enabled = False
    auto = False
    start: int | None = None
    end: int | None = None
    enabled_n = normalize(ENABLED_KEY)
    auto_n = normalize(AUTO_KEY)
    for ts, name, _tname, payload in records:
        n = normalize(name)
        if n == enabled_n and payload:
            enabled = payload[0] != 0
        elif n == auto_n and payload:
            auto = payload[0] != 0
        else:
            continue
        if enabled and auto and start is None:
            start = ts
        elif start is not None and end is None and not auto:
            end = ts
            break
    return start, end


def extract_path_segments(records, key, win_start, win_end):
    """Time-ordered PathPlanner ActivePath segments over [win_start, win_end] (µs).

    Returns [{"t": seconds_from_win_start, "pts": [[x, y], ...]}, ...] — one entry
    each time the active path changes, *including* empty pts when the path clears.
    The scene plays this back, showing only the segment active at the current time.
    """
    if win_start is None:
        return []
    win_end = win_end if win_end is not None else float("inf")
    key_n = normalize(key)

    def poses(p):
        n = len(p) // POSE2D_BYTES
        return [struct.unpack_from("<3d", p, i * POSE2D_BYTES)[:2] for i in range(n)]

    def sig(pts):
        if not pts:
            return ("empty",)
        return (round(pts[0][0], 3), round(pts[0][1], 3),
                round(pts[-1][0], 3), round(pts[-1][1], 3), len(pts))

    def fmt(pts):
        return [[round(x, 4), round(y, 4)] for x, y in pts]

    raw = [(ts, p) for ts, name, _t, p in records if normalize(name) == key_n]
    segs = []
    prev = None
    seed = None
    for ts, p in raw:
        if ts <= win_start:
            seed = p
    if seed is not None:
        pts = poses(seed)
        segs.append({"t": 0.0, "pts": fmt(pts)})
        prev = sig(pts)
    for ts, p in raw:
        if not (win_start < ts <= win_end):
            continue
        pts = poses(p)
        s = sig(pts)
        if s != prev:
            segs.append({"t": round((ts - win_start) / 1e6, 3), "pts": fmt(pts)})
            prev = s
    return segs


def fmt_pose(p):
    return [f"{v:.6f}" for v in p]


def fmt_pose_list(ps):
    return json.dumps([[round(v, 6) for v in p] for p in ps])


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    in_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else str(
        Path(in_path).with_suffix(".auto.csv"))

    print(f"Parsing {in_path}...")
    records, entries = parse_wpilog(in_path)
    print(f"  entries: {len(entries)}   records: {len(records)}")

    start, end = find_auto_window(records)
    if start is None:
        ds_keys = [n for _, (n, _) in entries.items() if "DriverStation" in n]
        raise SystemExit(
            "Could not find autonomous window. DriverStation keys present:\n  "
            + "\n  ".join(sorted(ds_keys)))
    if end is None:
        end = records[-1][0]
    print(f"  auto window: {start/1e6:.3f}s -> {end/1e6:.3f}s "
          f"(duration {(end - start) / 1e6:.3f}s)")

    name_to_key = {normalize(v): k for k, v in TARGETS.items()}
    series: dict[str, list[tuple[int, str, bytes]]] = {k: [] for k in TARGETS}
    for ts, name, tname, payload in records:
        k = name_to_key.get(normalize(name))
        if k is not None:
            series[k].append((ts, tname, payload))

    missing = [k for k, lst in series.items() if not lst]
    if missing:
        print(f"  WARNING: no records found for: {', '.join(missing)}")

    all_ts: set[int] = {start}
    for lst in series.values():
        for ts, _, _ in lst:
            if start <= ts <= end:
                all_ts.add(ts)
    timestamps = sorted(all_ts)

    cursors = {k: 0 for k in TARGETS}
    latest: dict[str, tuple[int, str, bytes] | None] = {k: None for k in TARGETS}

    # Seed forward-fill with the last value before `start` (so initial poses are populated)
    for k, lst in series.items():
        i = 0
        while i < len(lst) and lst[i][0] <= start:
            latest[k] = lst[i]
            i += 1
        cursors[k] = i

    headers = [
        "t_s",
        "robot_x", "robot_y", "robot_z", "robot_qw", "robot_qx", "robot_qy", "robot_qz",
        "intake_x", "intake_y", "intake_z", "intake_qw", "intake_qx", "intake_qy", "intake_qz",
        "shooter_x", "shooter_y", "shooter_z", "shooter_qw", "shooter_qx", "shooter_qy", "shooter_qz",
        "robot_fuel_count", "robot_fuel_poses",
        "field_fuel_count", "field_fuel_poses",
        *STRING_KEYS,
    ]

    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)

        for ts in timestamps:
            for k, lst in series.items():
                c = cursors[k]
                while c < len(lst) and lst[c][0] <= ts:
                    latest[k] = lst[c]
                    c += 1
                cursors[k] = c

            row = [f"{(ts - start) / 1e6:.6f}"]

            for key in ("robot_pos", "intake", "shooter"):
                v = latest[key]
                if v and len(v[2]) >= POSE3D_BYTES:
                    row += fmt_pose(decode_pose3d(v[2]))
                else:
                    row += [""] * 7

            for key in ("robot_fuel", "field_fuels"):
                v = latest[key]
                if v is None:
                    row += [0, "[]"]
                    continue
                _, tname, payload = v
                if tname.endswith("[]"):
                    poses = decode_array(tname, payload)
                elif len(payload) >= POSE3D_BYTES:
                    poses = [decode_pose3d(payload)]
                else:
                    poses = []
                row += [len(poses), fmt_pose_list(poses)]

            # subsystem states: UTF-8 string payloads, carried forward
            for sk in STRING_KEYS:
                v = latest[sk]
                row.append(v[2].decode("utf-8", "replace") if v else "")

            w.writerow(row)

    print(f"Wrote {out_path}  ({len(timestamps)} rows)")

    # Sidecar: time-stamped PathPlanner ActivePath segments over the playback
    # window — the scene shows only the segment active at the current time.
    seg_list = extract_path_segments(records, ACTIVE_PATH_KEY, start, end)
    path_out = str(Path(in_path).with_suffix("")) + "_path.json"
    with open(path_out, "w") as f:
        json.dump(seg_list, f)
    print(f"Wrote {path_out}  ({len(seg_list)} path segments)")

    seen_types = {}
    for ts, name, tname, payload in records:
        k = name_to_key.get(normalize(name))
        if k is not None:
            seen_types.setdefault(k, (tname, len(payload)))
    print("Target types detected:")
    for k in TARGETS:
        if k in seen_types:
            t, sz = seen_types[k]
            print(f"  {k:12s}  type={t!r:32s}  first-payload={sz}B")
        else:
            print(f"  {k:12s}  (NOT FOUND)")


if __name__ == "__main__":
    main()
