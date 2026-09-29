"""
SHAP + LIME explanations.

Real SHAP via shap.Explainer's PermutationExplainer â€” verified working with
sklearn 1.5.2 and numpy 2.x. TreeExplainer is not used because it still
crashes on sklearn 1.5.2 pickles.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.ml.claim_classifier import load_active_model
from app.utils.logging import get_logger

logger = get_logger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_LABELLED_CSV = _REPO_ROOT / "ml" / "datasets" / "processed" / "claims_to_label.csv"


def _require_model():
    pipeline, metadata = load_active_model()
    if pipeline is None:
        raise RuntimeError(
            "Trained model not available. Run ml/training/train_claim_classifier.py first."
        )
    return pipeline, metadata


@lru_cache(maxsize=1)
def _background_sentences() -> list[str]:
    """Load up to 100 sentences from the labelled CSV as background for SHAP."""
    import csv
    sents: list[str] = []
    if _LABELLED_CSV.exists():
        with _LABELLED_CSV.open("r", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                s = (row.get("sentence") or "").strip()
                if s:
                    sents.append(s)
                if len(sents) >= 100:
                    break
    if not sents:
        sents = [
            "we reduced our carbon emissions",
            "renewable energy commitment",
            "committed to sustainability goals",
            "employee diversity program",
            "board governance policy disclosure",
        ]
    return sents


def explain_with_shap(sentence: str, *, top_k: int = 10) -> dict[str, Any]:
    pipeline, metadata = _require_model()

    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    X = tfidf.transform([sentence])
    feature_names = np.array(tfidf.get_feature_names_out())
    classes = list(getattr(clf, "classes_", []))

    import shap

    # Build background in dense form
    background_sentences = _background_sentences()
    X_bg = tfidf.transform(background_sentences).toarray()

    explainer_kind = "unknown"
    sv_matrix: np.ndarray | None = None

    # Approach 1: shap.Explainer with permutation (verified working)
    try:
        explainer = shap.Explainer(clf.predict_proba, X_bg, algorithm="permutation")
        exp = explainer(X.toarray())
        sv_matrix = np.asarray(exp.values)  # shape (1, n_features, n_classes)
        explainer_kind = "PermutationExplainer"
        logger.info("SHAP PermutationExplainer succeeded: shape=%s", sv_matrix.shape)
    except Exception as exc:
        logger.info("PermutationExplainer failed: %s", str(exc)[:120])

    # Approach 2: KernelExplainer
    if sv_matrix is None:
        try:
            explainer = shap.KernelExplainer(clf.predict_proba, X_bg)
            sv = explainer.shap_values(X.toarray(), nsamples=200, silent=True)
            sv_matrix = np.asarray(sv) if not isinstance(sv, list) else np.stack(sv, axis=-1)
            explainer_kind = "KernelExplainer"
            logger.info("SHAP KernelExplainer succeeded: shape=%s", sv_matrix.shape)
        except Exception as exc:
            logger.warning("KernelExplainer failed: %s", exc)

    # Fallback: permutation attribution
    if sv_matrix is None:
        logger.warning("All real SHAP approaches failed â€” using permutation fallback")
        return _permutation_attribution(
            pipeline, tfidf, clf, sentence, feature_names, X, top_k
        )

    # Extract the unsubstantiated class slice, shape (n_features,)
    try:
        target_idx = classes.index("unsubstantiated")
    except ValueError:
        target_idx = sv_matrix.shape[-1] - 1 if sv_matrix.ndim == 3 else 0

    sv = sv_matrix
    if sv.ndim == 3:
        # (n_samples, n_features, n_classes)
        sv = sv[0, :, target_idx]
    elif sv.ndim == 2:
        # (n_samples, n_features)
        sv = sv[0]

    x_dense = X.toarray()[0]
    nonzero = np.where(x_dense != 0)[0]

    if len(nonzero) == 0 or len(sv) != len(feature_names):
        return {
            "features": [],
            "note": "No meaningful features found.",
            "model": metadata.get("model"),
            "explainer": explainer_kind,
        }

    contribs = sv[nonzero]
    names = feature_names[nonzero]

    # Drop features the model never used (SHAP = 0). Keep the top_k by
    # absolute value from the remaining non-zero ones.
    nonzero_mask = np.abs(contribs) > 1e-7
    if nonzero_mask.sum() == 0:
        return {
            "features": [],
            "note": "Model did not use any tokens from this sentence for prediction.",
            "model": metadata.get("model"),
            "explainer": kind,
        }

    names_nz = names[nonzero_mask]
    contribs_nz = contribs[nonzero_mask]

    order = np.argsort(-np.abs(contribs_nz))[:top_k]
    features = []
    for i in order:
        c = float(contribs_nz[i])
        features.append({
            "feature": str(names_nz[i]),
            "contribution": round(c, 5),
            "direction": "unsubstantiated" if c > 0 else "substantiated",
        })

    return {
        "model": metadata.get("model"),
        "explainer": explainer_kind,
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
