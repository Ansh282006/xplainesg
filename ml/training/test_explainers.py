"""Test SHAP + LIME explanations on real claims."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.explainability.claim_explainer import explain_with_shap, explain_with_lime

SENTENCES = [
    "In 2020, we committed to being a carbon negative, water positive, and zero waste company by 2030.",
    "We are committed to sustainability and a better future for everyone.",
    "We reduced our Scope 1 and 2 emissions by 32 percent in FY2024.",
    "Our environmental stewardship reflects our core values.",
    "By 2030, we will achieve net-zero across Scope 1, 2, and 3.",
]


def show(title: str, out: dict) -> None:
    print(title)
    if "error" in out:
        print(f"  ERROR: {out['error']}")
        return
    features = out.get("features", [])
    if not features:
        print("  (no features)")
        return
    for f in features:
        print(f"  {f['feature']:30s} {f['contribution']:+.4f}  -> {f['direction']}")
    print(f"  model: {out.get('model')}")


def main() -> None:
    for s in SENTENCES:
        print("=" * 78)
        print(f"SENTENCE: {s[:90]}")
        print()
        try:
            show("SHAP:", explain_with_shap(s, top_k=6))
        except Exception as e:
            print("SHAP exception:", type(e).__name__, e)
        print()
        try:
            show("LIME:", explain_with_lime(s, top_k=6, num_samples=300))
        except Exception as e:
            print("LIME exception:", type(e).__name__, e)
        print()


if __name__ == "__main__":
    main()
