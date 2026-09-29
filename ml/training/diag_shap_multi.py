"""Try multiple SHAP approaches; report which works."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import numpy as np
import shap
import sklearn
from app.ml.claim_classifier import load_active_model

print("shap:", shap.__version__)
print("sklearn:", sklearn.__version__)
print("numpy:", np.__version__)
print()

pipeline, _ = load_active_model()
tfidf = pipeline.named_steps["tfidf"]
clf = pipeline.named_steps["clf"]

sentence = "We reduced emissions by 32 percent."
X = tfidf.transform([sentence])

print("Attempting approach 1: TreeExplainer default")
try:
    e = shap.TreeExplainer(clf)
    sv = e.shap_values(X)
    print("  OK", type(sv).__name__, np.asarray(sv).shape if not isinstance(sv, list) else [np.asarray(s).shape for s in sv])
except Exception as exc:
    print("  FAILED:", type(exc).__name__, "-", str(exc)[:120])

print()
print("Attempting approach 2: TreeExplainer tree_path_dependent")
try:
    e = shap.TreeExplainer(clf, feature_perturbation="tree_path_dependent")
    sv = e.shap_values(X)
    print("  OK", type(sv).__name__)
except Exception as exc:
    print("  FAILED:", type(exc).__name__, "-", str(exc)[:120])

print()
print("Attempting approach 3: shap.Explainer(clf)")
try:
    e = shap.Explainer(clf)
    sv = e(X)
    print("  OK. values shape:", sv.values.shape)
except Exception as exc:
    print("  FAILED:", type(exc).__name__, "-", str(exc)[:120])

print()
print("Attempting approach 4: shap.Explainer with explicit model output")
try:
    e = shap.Explainer(clf.predict_proba, X.toarray())
    sv = e(X.toarray())
    print("  OK. values shape:", np.asarray(sv.values).shape)
except Exception as exc:
    print("  FAILED:", type(exc).__name__, "-", str(exc)[:120])

print()
print("Attempting approach 5: KernelExplainer (works universally, slow)")
try:
    e = shap.KernelExplainer(clf.predict_proba, X.toarray())
    sv = e.shap_values(X.toarray(), nsamples=50)
    print("  OK")
except Exception as exc:
    print("  FAILED:", type(exc).__name__, "-", str(exc)[:120])
