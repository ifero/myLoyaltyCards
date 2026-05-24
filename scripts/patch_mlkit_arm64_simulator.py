#!/usr/bin/env python3
"""
Re-label the arm64 device slice of Google ML Kit static frameworks as
iOS Simulator, so they link on Apple Silicon simulators.

Background
----------
The frameworks Google ships under the GoogleMLKit/* CocoaPods only contain
two slices: arm64 (built for iOS device, platform=2) and x86_64
(iOS Simulator, platform=7). Their podspecs therefore set
EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64 so Xcode does not try to
link the device slice into a simulator build.

This script applies the same in-place modification that arm64-to-sim uses:
it walks every .o member of the arm64 static archive and changes the
LC_BUILD_VERSION.platform field from 2 (iOS) to 7 (iOS Simulator).

Usage
-----
python3 patch_mlkit_arm64_simulator.py <Pods/MLKitFoo> [<Pods/MLKitBar> ...]
"""

import os
import struct
import subprocess
import sys
import tempfile

FAT_MAGIC = 0xCAFEBABE
FAT_MAGIC_64 = 0xCAFEBABF
MH_MAGIC_64 = 0xFEEDFACF
LC_BUILD_VERSION = 0x32
PLATFORM_IOS = 2
PLATFORM_IOS_SIMULATOR = 7
CPU_TYPE_ARM64 = 0x0100000C


def _patch_macho_object(buf):
    if len(buf) < 32:
        return buf, False
    magic = struct.unpack_from("<I", buf, 0)[0]
    if magic != MH_MAGIC_64:
        return buf, False
    cputype, _cpusub, _filetype, ncmds, _sizeofcmds, _flags, _reserved = struct.unpack_from(
        "<iIIIIII", buf, 4
    )
    if cputype != CPU_TYPE_ARM64:
        return buf, False

    new_buf = bytearray(buf)
    offset = 32
    patched = False
    for _ in range(ncmds):
        cmd, cmdsize = struct.unpack_from("<II", new_buf, offset)
        if cmd == LC_BUILD_VERSION:
            platform = struct.unpack_from("<I", new_buf, offset + 8)[0]
            if platform == PLATFORM_IOS:
                struct.pack_into("<I", new_buf, offset + 8, PLATFORM_IOS_SIMULATOR)
                patched = True
        offset += cmdsize
    return bytes(new_buf), patched


def _patch_static_archive(archive_path):
    with open(archive_path, "rb") as file:
        data = file.read()

    if data[:8] != b"!<arch>\n":
        return 0

    out = bytearray(data[:8])
    pos = 8
    patched_count = 0

    while pos + 60 <= len(data):
        header = data[pos : pos + 60]
        name = header[:16].rstrip().decode("ascii", errors="replace")
        try:
            size = int(header[48:58].rstrip().decode("ascii", errors="replace"))
        except ValueError:
            break

        body_start = pos + 60
        body_end = body_start + size
        body = data[body_start:body_end]

        if name.startswith("#1/"):
            try:
                name_len = int(name[3:])
            except ValueError:
                name_len = 0
            obj_buf = data[body_start + name_len : body_end]
            new_obj, was_patched = _patch_macho_object(obj_buf)
            new_body = body[:name_len] + new_obj
        else:
            new_obj, was_patched = _patch_macho_object(body)
            new_body = new_obj

        if was_patched:
            patched_count += 1

        out += header + new_body
        pos = body_end + (body_end & 1)

    if patched_count > 0:
        with open(archive_path, "wb") as file:
            file.write(bytes(out))

    return patched_count


def _patch_thin(path):
    with open(path, "rb") as file:
        head = file.read(8)

    if head[:8] == b"!<arch>\n":
        return _patch_static_archive(path)

    if len(head) >= 4 and struct.unpack("<I", head[:4])[0] == MH_MAGIC_64:
        with open(path, "rb") as file:
            data = file.read()
        new_data, was_patched = _patch_macho_object(data)
        if was_patched:
            with open(path, "wb") as file:
                file.write(new_data)
            return 1

    return 0


def _patch_fat_binary(fat_path):
    with open(fat_path, "rb") as file:
        head = file.read(4)
    if len(head) < 4:
        return 0

    magic = struct.unpack(">I", head[:4])[0]
    if magic in (FAT_MAGIC, FAT_MAGIC_64):
        archs = (
            subprocess.run(["lipo", "-archs", fat_path], capture_output=True, text=True, check=True)
            .stdout.strip()
            .split()
        )
        if "arm64" not in archs:
            return 0

        with tempfile.TemporaryDirectory() as temp_dir:
            arm64_thin = os.path.join(temp_dir, "arm64.bin")
            subprocess.run(["lipo", fat_path, "-thin", "arm64", "-output", arm64_thin], check=True)

            patched_count = _patch_thin(arm64_thin)
            if patched_count == 0:
                return 0

            subprocess.run(["lipo", fat_path, "-replace", "arm64", arm64_thin, "-output", fat_path], check=True)
            return patched_count

    return _patch_thin(fat_path)


def _find_framework_binary(pod_dir):
    frameworks_dir = os.path.join(pod_dir, "Frameworks")
    if not os.path.isdir(frameworks_dir):
        return None

    for entry in os.listdir(frameworks_dir):
        if not entry.endswith(".framework"):
            continue
        base_name = entry[: -len(".framework")]
        candidate = os.path.join(frameworks_dir, entry, base_name)
        if os.path.isfile(candidate):
            return candidate

    return None


def main(args):
    if not args:
        print(__doc__, file=sys.stderr)
        return 1

    total = 0
    for pod_path in args:
        binary = _find_framework_binary(pod_path)
        if not binary:
            continue
        patched_count = _patch_fat_binary(binary)
        if patched_count > 0:
            print(
                f"  patched {os.path.basename(binary)}: {patched_count} object(s) relabeled to iOS Simulator"
            )
            total += patched_count

    if total > 0:
        print(f"[ml_kit] Total Mach-O objects relabeled: {total}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
