"""Lanza Blender solo cuando hay un hueco libre en el equipo.

Varias sesiones producen equipables a la vez y la CPU (8 nucleos) aguanta unos
3 Blender. Cada hueco es un archivo bloqueado por el sistema operativo mientras
Blender corre: si el proceso muere, el bloqueo se suelta solo.

    python tools/blender_slot.py -- -b --factory-startup --python-exit-code 1 --python blender/x.py -- ...
    python tools/blender_slot.py --status

Variables: NDD_BLENDER_SLOTS (3), NDD_BLENDER_THREADS (4), NDD_BLENDER (ruta del ejecutable).
"""
import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

if os.name == "nt":
    import msvcrt

    # Se bloquea un byte lejano para que --status pueda leer quien ocupa el hueco.
    LOCK_OFFSET = 1 << 20

    def _try_lock(handle):
        try:
            handle.seek(LOCK_OFFSET)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            return False

    def _unlock(handle):
        handle.seek(LOCK_OFFSET)
        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
else:
    import fcntl

    def _try_lock(handle):
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except OSError:
            return False

    def _unlock(handle):
        fcntl.flock(handle, fcntl.LOCK_UN)

ROOT = Path(__file__).resolve().parents[1]
LOCKS = ROOT / "build" / ".blender-slots"
BLENDER = os.environ.get("NDD_BLENDER", "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")


def _open(slot):
    LOCKS.mkdir(parents=True, exist_ok=True)
    handle = open(LOCKS / f"slot-{slot}.lock", "a+")
    handle.seek(0)
    return handle


def acquire(slots, label):
    waited = False
    while True:
        for slot in range(slots):
            handle = _open(slot)
            if _try_lock(handle):
                handle.truncate(0)
                handle.write(f"{os.getpid()} {label}\n")
                handle.flush()
                handle.seek(0)
                return slot, handle
            handle.close()
        if not waited:
            print(f"[blender_slot] {slots} huecos ocupados; esperando...", file=sys.stderr, flush=True)
            waited = True
        time.sleep(3)


def status(slots):
    for slot in range(slots):
        handle = _open(slot)
        if _try_lock(handle):
            _unlock(handle)
            print(f"hueco {slot}: libre")
        else:
            print(f"hueco {slot}: ocupado ({(LOCKS / f'slot-{slot}.lock').read_text().strip()})")
        handle.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--slots", type=int, default=int(os.environ.get("NDD_BLENDER_SLOTS", 3)))
    parser.add_argument("--threads", type=int, default=int(os.environ.get("NDD_BLENDER_THREADS", 4)))
    parser.add_argument("--label", default="", help="quien lo lanza (carril y pieza), para --status")
    parser.add_argument("--status", action="store_true")
    argv = sys.argv[1:]
    split = argv.index("--") if "--" in argv else len(argv)
    args = parser.parse_args(argv[:split])
    if args.status:
        status(args.slots)
        return 0
    blender_args = argv[split + 1:]
    if not blender_args:
        parser.error("faltan los argumentos de Blender despues de --")
    slot, handle = acquire(args.slots, args.label or " ".join(blender_args)[:120])
    try:
        return subprocess.call([BLENDER, "--threads", str(args.threads), *blender_args])
    finally:
        _unlock(handle)
        handle.close()


if __name__ == "__main__":
    sys.exit(main())
