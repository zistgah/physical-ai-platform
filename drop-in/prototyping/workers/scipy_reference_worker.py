# Copyright © 1993-2026 Abhishek Choudhary. All rights reserved. AyeAI®, AyeAM® and AyeCNSe® are registered trademarks of Abhishek Choudhary.
"""Reference numerical worker: SciPy solve_ivp for a first-order RC step.

This is a real SciPy backend example, not a replacement for ngspice/Xyce.
Input/output are one JSON document on stdin/stdout. No shell execution occurs.
"""
import sys, json, hashlib, platform, math
from datetime import datetime, timezone


def sha256(value):
    raw = value if isinstance(value, bytes) else json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def main():
    started = now()
    envelope = json.load(sys.stdin)
    job = envelope.get("job", {})
    if envelope.get("protocolVersion") != "1.0.0" or job.get("backendId") != "scipy" or job.get("operation") != "numerics.ode":
        raise ValueError("unsupported protocol, backend or operation")
    options = job.get("solverOptions", {})
    if options.get("problem") != "rc-step":
        raise ValueError("reference worker supports only problem=rc-step")
    resistance = float(options["resistanceOhm"])
    capacitance = float(options["capacitanceFarad"])
    voltage = float(options["stepVoltageV"])
    rtol = float(options.get("rtol", 1e-9))
    atol = float(options.get("atol", 1e-12))
    if not all(math.isfinite(x) and x > 0 for x in (resistance, capacitance, rtol, atol, voltage)):
        raise ValueError("R, C, tolerances and step voltage must be finite and positive")
    method = options.get("method", "RK45")
    if method not in {"RK23", "RK45", "DOP853", "Radau", "BDF", "LSODA"}:
        raise ValueError("method is not in the worker's numerical integrator allowlist")

    from scipy.integrate import solve_ivp
    import scipy
    tau = resistance * capacitance
    t_eval = [tau]
    def rhs(_t, y):
        return [(voltage - y[0]) / tau]
    solution = solve_ivp(rhs, (0.0, tau), [0.0], method=method, t_eval=t_eval, rtol=rtol, atol=atol)
    if not solution.success or solution.y.shape != (1, 1):
        raise RuntimeError("SciPy integration did not produce the requested terminal sample")
    metrics = {"voutAtTauV": float(solution.y[0, -1]), "tauS": float(tau), "nfev": int(solution.nfev), "solverSuccess": bool(solution.success)}
    artifact = json.dumps(metrics, sort_keys=True, separators=(",", ":")).encode("utf-8")
    digest = sha256(artifact)
    completed = now()
    result = {
        "protocolVersion": "1.0.0", "status": "COMPLETED", "exitCode": 0,
        "backendId": "scipy", "operation": "numerics.ode", "inputDigest": job["inputDigest"],
        "runId": job["jobId"] + "-worker", "backendVersion": scipy.__version__,
        "startedAt": started, "completedAt": completed, "outputDigest": digest,
        "outputArtifacts": [{"uri": "inline:" + digest, "digest": digest, "mediaType": "application/json", "format": "JSON"}],
        "deterministic": True,
        "environmentFingerprint": sha256({"python": platform.python_version(), "scipy": scipy.__version__, "platform": platform.platform()}),
        "metrics": metrics, "result": metrics
    }
    json.dump(result, sys.stdout, sort_keys=True, separators=(",", ":"))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        json.dump({"status": "FAILED", "exitCode": 2, "diagnostics": [str(exc)]}, sys.stdout)
        sys.exit(2)
