"""
SHAP + LIME explanations for the trained claim classifier.

Both explainers operate on the SAME fitted Pipeline loaded via
app.ml.claim_classifier.load_active_model().

- SHAP LinearExplainer works well for LogisticRegression.
- SHAP TreeExplainer for tree-based models (RF, XGB).
- LIME works with any predict_proba, so we use it for both.

Every explanation is a list of {feature, contribution, direction} that can be
persisted into the `explanations` table.
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


def explain_with_shap(
    sentence: str,
    *,
    top_k: int = 10,
) -> dict[str, Any]:
    """
    Feature-level SHAP explanation for a single sentence.

    Returns top-k word features by absolute SHAP contribution, with direction.
    """
    pipeline, metadata = _require_model()

    try:
        import shap  # imported lazily — heavy
    except ImportError as exc:
        raise RuntimeError("shap not installed. Run: pip install shap") from exc

    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    X = tfidf.transform([sentence])
    feature_names = np.array(tfidf.get_feature_names_out())

    # Choose explainer based on classifier type.
    # NOTE: shap.TreeExplainer had a numpy 2.x incompatibility. We use the
    # modern shap.Explainer API (auto-selects the right backend) which handles
    # current numpy cleanly.
    clf_class = clf.__class__.__name__
    try:
        if clf_class in ("RandomForestClassifier", "XGBClassifier"):
            # Modern API — handles numpy 2.x
            explainer = shap.Explainer(clf, feature_names=np.array(tfidf.get_feature_names_out()))
            exp = explainer(X)
            # exp.values shape: (n_samples, n_features) for binary
            shap_values = np.asarray(exp.values)
        elif clf_class == "LogisticRegression":
            explainer = shap.LinearExplainer(clf, X, feature_perturbation="interventional")
            shap_values = explainer.shap_values(X)
        else:
            explainer = shap.KernelExplainer(clf.predict_proba, X)
            shap_values = explainer.shap_values(X)
    except Exception as exc:
        logger.warning("SHAP explainer failed: %s", exc)
        return {"error": str(exc), "features": []}

    # Normalise shape: shap_values may be (n, features), (n, features, classes),
    # or a list per class. Extract the "unsubstantiated" slice.
    sv = shap_values
    if isinstance(sv, list):
        # list[class] -> pick class index for "unsubstantiated"
        try:
            classes = list(clf.classes_)
            idx = classes.index("unsubstantiated")
            sv = sv[idx]
        except (AttributeError, ValueError):
            sv = sv[0]
    sv = np.asarray(sv)
    if sv.ndim == 3:
        # (n_samples, n_features, n_classes) — pick "unsubstantiated"
        try:
            classes = list(clf.classes_)
            idx = classes.index("unsubstantiated")
            sv = sv[:, :, idx]
        except (AttributeError, ValueError):
            sv = sv[:, :, 0]
    if sv.ndim == 2:
        sv = sv[0]  # single sample

    # sv is now (n_features,)
    x_dense = X.toarray()[0]
    nonzero = np.where(x_dense != 0)[0]

    if len(nonzero) == 0:
        return {
            "features": [],
            "note": "No model features fired for this sentence.",
            "model": metadata.get("model"),
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
    """LIME local explanation for a single sentence."""
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

    def predict(texts: list[str]) -> np.ndarray:
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
        "features": features,
        "note": (
            "LIME approximates the model locally. Positive weight pushes toward "
            "'unsubstantiated'; negative toward 'substantiated'. Not proof of intent."
        ),
    }
