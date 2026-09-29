"""
SHAP + LIME explanations for the trained claim classifier.

Uses real SHAP TreeExplainer for Random Forest / XGBoost.
Falls back to KernelExplainer only if TreeExplainer fails.
"""
from __future__ import annotations

from typing import Any

import numpy as np

from app.ml.claim_classifier import load_active_model
from app.utils.logging import get_logger

logger = get_logger(__name__)


def _require_model():
    pipeline, metadata = load_active_model()
    if pipeline is None:
        raise RuntimeError(
            "Trained model not available. Run ml/training/train_claim_classifier.py first."
        )
    return pipeline, metadata


def _extract_unsubstantiated_slice(shap_values, clf):
    """Normalise the many shapes shap_values can take."""
    sv = shap_values
    classes = list(getattr(clf, "classes_", []))

    try:
        idx = classes.index("unsubstantiated")
    except ValueError:
        idx = 0

    if isinstance(sv, list):
        sv = sv[idx]
    sv = np.asarray(sv)

    if sv.ndim == 3:
        sv = sv[:, :, idx]
    if sv.ndim == 2:
        sv = sv[0]
    return sv


def explain_with_shap(sentence: str, *, top_k: int = 10) -> dict[str, Any]:
    pipeline, metadata = _require_model()

    try:
        import shap
    except ImportError as exc:
        raise RuntimeError("shap not installed. Run: pip install shap") from exc

    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    X = tfidf.transform([sentence])
    feature_names = np.array(tfidf.get_feature_names_out())

    clf_class = clf.__class__.__name__
    explainer_kind = "unknown"

    try:
        if clf_class in ("RandomForestClassifier", "XGBClassifier"):
            explainer = shap.TreeExplainer(clf)
            shap_values = explainer.shap_values(X)
            explainer_kind = "TreeExplainer"
        elif clf_class == "LogisticRegression":
            explainer = shap.LinearExplainer(
                clf, X, feature_perturbation="interventional"
            )
            shap_values = explainer.shap_values(X)
            explainer_kind = "LinearExplainer"
        else:
            explainer = shap.KernelExplainer(clf.predict_proba, X)
            shap_values = explainer.shap_values(X)
            explainer_kind = "KernelExplainer"
    except Exception as exc:
        logger.warning("Real SHAP failed (%s) — using permutation fallback: %s",
                       clf_class, exc)
        return _permutation_attribution(
            pipeline, tfidf, clf, sentence, feature_names, X, top_k
        )

    sv = _extract_unsubstantiated_slice(shap_values, clf)

    x_dense = X.toarray()[0]
    nonzero = np.where(x_dense != 0)[0]

    if len(nonzero) == 0:
        return {
            "features": [],
            "note": "No model features fired for this sentence.",
            "model": metadata.get("model"),
            "explainer": explainer_kind,
        }

    contribs = sv[nonzero]
    names = feature_names[nonzero]

    order = np.argsort(-np.abs(contribs))[:top_k]
    features = []
    for i in order:
        c = float(contribs[i])
        features.append({
            "feature": str(names[i]),
            "contribution": round(c, 5),
            "direction": "unsubstantiated" if c > 0 else "substantiated",
        })

    return {
        "model": metadata.get("model"),
        "explainer": explainer_kind,
        "model_metrics": {
            "f1_macro": metadata.get("f1_macro"),
            "roc_auc": metadata.get("roc_auc"),
        },
        "features": features,
        "note": (
            "SHAP values explain which tokens the trained model used. "
            "They are not evidence of company intent."
        ),
    }


def explain_with_lime(
    sentence: str,
    *,
    top_k: int = 10,
    num_samples: int = 500,
) -> dict[str, Any]:
    pipeline, metadata = _require_model()

    try:
        from lime.lime_text import LimeTextExplainer
    except ImportError as exc:
        raise RuntimeError("lime not installed. Run: pip install lime") from exc

    classes = list(pipeline.classes_)
    try:
        target_idx = classes.index("unsubstantiated")
    except ValueError:
        target_idx = 0

    explainer = LimeTextExplainer(class_names=classes, random_state=42)

    def predict(texts):
        return pipeline.predict_proba(texts)

    try:
        exp = explainer.explain_instance(
            sentence,
            predict,
            num_features=top_k,
            num_samples=num_samples,
            labels=(target_idx,),
        )
    except Exception as exc:
        logger.warning("LIME explainer failed: %s", exc)
        return {"error": str(exc), "features": []}

    features = []
    for word, weight in exp.as_list(label=target_idx):
        features.append({
            "feature": word,
            "contribution": round(float(weight), 5),
            "direction": "unsubstantiated" if weight > 0 else "substantiated",
        })

    return {
        "model": metadata.get("model"),
        "explainer": "LimeTextExplainer",
        "features": features,
        "note": (
            "LIME approximates the model locally. Positive weight pushes toward "
            "'unsubstantiated'; negative toward 'substantiated'. Not proof of intent."
        ),
    }


# ---------------------------------------------------------------------------
# Fallback: permutation attribution (only used if real SHAP crashes)
# ---------------------------------------------------------------------------
def _permutation_attribution(pipeline, tfidf, clf, sentence, feature_names, X, top_k):
    classes = list(clf.classes_)
    idx = classes.index("unsubstantiated")
    base_proba = clf.predict_proba(X)[0, idx]

    x_dense = X.toarray()[0]
    active = np.where(x_dense != 0)[0]

    contribs = []
    for j in active:
        x_modified = X.toarray().copy()
        x_modified[0, j] = 0.0
        p = clf.predict_proba(x_modified)[0, idx]
        contribs.append((str(feature_names[j]), float(base_proba - p)))

    contribs.sort(key=lambda t: -abs(t[1]))
    top = contribs[:top_k]

    return {
        "model": "permutation-fallback",
        "explainer": "PermutationFallback",
        "note": (
            "Real SHAP unavailable in this environment; using permutation-based "
            "attribution on the same trained model. Output format identical. "
            "Not proof of company intent."
        ),
        "features": [
            {
                "feature": f,
                "contribution": round(c, 5),
                "direction": "unsubstantiated" if c > 0 else "substantiated",
            }
            for f, c in top
        ],
    }
