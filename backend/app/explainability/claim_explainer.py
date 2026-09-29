"""SHAP + LIME explanations. Tries multiple SHAP modes, falls back to permutation."""
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


def _extract_slice(shap_values, clf, classes):
    """Normalise SHAP output shape; return (n_features,) for the positive class."""
    try:
        target_idx = classes.index("unsubstantiated")
    except ValueError:
        target_idx = 1

    sv = shap_values
    if isinstance(sv, list):
        sv = sv[target_idx]
    sv = np.asarray(sv)

    if sv.ndim == 3:
        sv = sv[:, :, target_idx]
    if sv.ndim == 2:
        sv = sv[0]
    return sv


def _try_shap_approaches(clf, X):
    """Try SHAP approaches in order of preference. Returns (values, kind) or (None, None)."""
    import shap

    classes = list(getattr(clf, "classes_", []))

    attempts = [
        ("TreeExplainer(tree_path_dependent)",
            lambda: shap.TreeExplainer(clf, feature_perturbation="tree_path_dependent").shap_values(X)),
        ("TreeExplainer(default)",
            lambda: shap.TreeExplainer(clf).shap_values(X)),
        ("TreeExplainer(model_output=probability)",
            lambda: shap.TreeExplainer(clf, model_output="probability").shap_values(X)),
        ("Explainer(auto)",
            lambda: shap.Explainer(clf).shap_values(X)),
    ]

    for name, fn in attempts:
        try:
            sv = fn()
            logger.info("SHAP %s succeeded", name)
            return sv, name
        except Exception as exc:
            logger.info("SHAP %s failed: %s", name, str(exc)[:100])

    # Last resort: KernelExplainer (slow but universal)
    try:
        e = shap.KernelExplainer(clf.predict_proba, X.toarray())
        sv = e.shap_values(X.toarray(), nsamples=100)
        logger.info("SHAP KernelExplainer succeeded")
        return sv, "KernelExplainer"
    except Exception as exc:
        logger.warning("SHAP KernelExplainer failed: %s", exc)
        return None, None


def explain_with_shap(sentence: str, *, top_k: int = 10) -> dict[str, Any]:
    pipeline, metadata = _require_model()

    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    X = tfidf.transform([sentence])
    feature_names = np.array(tfidf.get_feature_names_out())
    classes = list(getattr(clf, "classes_", []))

    shap_values, kind = _try_shap_approaches(clf, X)

    if shap_values is None:
        logger.warning("All real SHAP approaches failed — using permutation fallback")
        return _permutation_attribution(
            pipeline, tfidf, clf, sentence, feature_names, X, top_k
        )

    sv = _extract_slice(shap_values, clf, classes)

    x_dense = X.toarray()[0]
    nonzero = np.where(x_dense != 0)[0]

    if len(nonzero) == 0:
        return {
            "features": [],
            "note": "No model features fired for this sentence.",
            "model": metadata.get("model"),
            "explainer": kind,
        }

    contribs = sv[nonzero] if len(sv) > max(nonzero) else np.zeros(len(nonzero))
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
        "explainer": kind,
        "features": features,
        "note": (
            "SHAP values explain which tokens the trained model used. "
            "They are not evidence of company intent."
        ),
    }


def explain_with_lime(sentence: str, *, top_k: int = 10, num_samples: int = 500) -> dict[str, Any]:
    pipeline, metadata = _require_model()

    try:
        from lime.lime_text import LimeTextExplainer
    except ImportError as exc:
        raise RuntimeError("lime not installed. Run: pip install lime") from exc

    classes = list(pipeline.classes_)
    try:
        target_idx = classes.index("unsubstantiated")
    except ValueError:
        target_idx = 1

    explainer = LimeTextExplainer(class_names=[str(c) for c in classes], random_state=42)

    def predict(texts):
        return pipeline.predict_proba(texts)

    try:
        exp = explainer.explain_instance(
            sentence, predict,
            num_features=top_k, num_samples=num_samples,
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
        "note": "LIME approximates the model locally. Not proof of intent.",
    }


def _permutation_attribution(pipeline, tfidf, clf, sentence, feature_names, X, top_k):
    classes = list(clf.classes_)
    try:
        idx = classes.index("unsubstantiated")
    except ValueError:
        idx = 1

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
        "note": "Real SHAP unavailable; using permutation attribution.",
        "features": [
            {
                "feature": f,
                "contribution": round(c, 5),
                "direction": "unsubstantiated" if c > 0 else "substantiated",
            }
            for f, c in top
        ],
    }
