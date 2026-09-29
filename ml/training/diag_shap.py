"""Diagnostic: downgrade sklearn, test real SHAP."""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

# 1. Show current versions
import shap, sklearn, numpy
print("=== 1. Current versions ===")
print("shap:", shap.__version__)
print("sklearn:", sklearn.__version__)
print("numpy:", numpy.__version__)

# 2. Downgrade sklearn
print()
print("=== 2. Downgrading sklearn to 1.5.2 ===")
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "--no-cache-dir", "scikit-learn==1.5.2"],
    capture_output=True, text=True
)
# Print last 5 lines of pip output
for line in result.stdout.strip().splitlines()[-5:]:
    print(line)
if result.returncode != 0:
    print("PIP FAILED:")
    print(result.stderr[-500:])
    sys.exit(1)

# 3. Verify new version (fresh subprocess to avoid import cache)
print()
print("=== 3. Verify new sklearn version ===")
result = subprocess.run(
    [sys.executable, "-c", "import sklearn; print('sklearn now:', sklearn.__version__)"],
    capture_output=True, text=True
)
print(result.stdout.strip())

# 4. Test SHAP in a fresh subprocess (avoids import cache)
print()
print("=== 4. Test real SHAP ===")
test_code = """
import sys
sys.path.insert(0, "backend")
from app.explainability.claim_explainer import explain_with_shap
out = explain_with_shap("We reduced our Scope 1 and 2 emissions by 32 percent in FY2024.")
print("explainer:", out.get("explainer", "unknown"))
print("error:", out.get("error", "none"))
feats = out.get("features", [])
print("features:", len(feats))
for f in feats[:5]:
    print("  " + f["feature"].ljust(25) + " " + str(round(f["contribution"], 4)).rjust(10) + "  -> " + f["direction"])
"""
result = subprocess.run(
    [sys.executable, "-c", test_code],
    capture_output=True, text=True,
    cwd=str(Path(__file__).resolve().parents[1])
)
print(result.stdout)
if result.stderr:
    print("STDERR:")
    print(result.stderr[-1000:])

print()
print("=== Done ===")