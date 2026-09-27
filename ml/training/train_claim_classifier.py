"""
Train and evaluate greenwashing-claim classifiers.

Inputs:
  ml/datasets/processed/claims_to_label.csv  (labelled claims)

Outputs:
  ml/models/{name}-v1/model.joblib     (fitted pipeline)
  ml/models/{name}-v1/vectorizer.joblib (for explainability)
  ml/models/{name}-v1/metrics.json      (evaluation)
  ml/models/{name}-v1/confusion_matrix.png (visual)
  ml/models/registry.json               (all models + versions)

Models trained:
  tfidf-lr-v1 : TF-IDF + Logistic Regression
  tfidf-rf-v1 : TF-IDF + Random Forest

Comparison target:
  rule-based baseline-v0 currently live in the API
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

# Paths
REPO = Path(__file__).resolve().parents[2]
DATASET = REPO / "ml" / "datasets" / "processed" / "claims_to_label.csv"
MODELS_DIR = REPO / "ml" / "models"
REGISTRY = MODELS_DIR / "registry.json"

RANDOM_STATE = 42


def load_labelled(path: Path) -> tuple[list[str], list[str]]:
    texts: list[str] = []
    labels: list[str] = []
    skipped = 0
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = (row.get("label") or "").strip()
            sentence = (row.get("sentence") or "").strip()
            if label not in ("substantiated", "unsubstantiated") or not sentence:
                skipped += 1
                continue
            texts.append(sentence)
            labels.append(label)
    print(f"Loaded {len(texts)} labelled claims (skipped {skipped} unlabelled/invalid)")
    return texts, labels


def build_tfidf() -> TfidfVectorizer:
    # Word n-grams + char n-grams. Char n-grams help with typos and PDF artifacts.
    # We can only have one vectorizer per pipeline, so we use word n-grams here
    # and get char features by setting analyzer='char_wb' with a second pass.
    # For simplicity and speed: word n-grams only. Char adds ~30% time.
    return TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
        sublinear_tf=True,
    )


def evaluate(name: str, model: Pipeline, X_test, y_test, cv_scores: np.ndarray) -> dict:
    y_pred = model.predict(X_test)

    # ROC-AUC needs probability of the positive class ("substantiated").
    # sklearn sorts classes alphabetically, so 'substantiated' is index 0,
    # NOT index 1. Look up the actual position to avoid the classic bug.
    import numpy as _np
    classes = list(model.classes_)
    pos_idx = classes.index("substantiated")
    y_test_arr = _np.asarray(y_test, dtype=object)
    y_test_bin = (y_test_arr == "substantiated").astype(int)
    y_proba = model.predict_proba(X_test)[:, pos_idx]
    roc_auc = float(roc_auc_score(y_test_bin, y_proba))

    cm = confusion_matrix(y_test, y_pred, labels=["unsubstantiated", "substantiated"])
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    metrics = {
        "model": name,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_train": int(len(y_test) * 4),  # 80/20 split -> train is 4x test
        "n_test": int(len(y_test)),
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        "roc_auc": roc_auc,
        "cv_f1_mean": float(cv_scores.mean()),
        "cv_f1_std": float(cv_scores.std()),
        "confusion_matrix": cm.tolist(),
        "confusion_matrix_labels": ["unsubstantiated", "substantiated"],
        "classification_report": report,
    }
    return metrics


def train_one(
    name: str,
    X_train: list[str],
    y_train: list[str],
    X_test: list[str],
    y_test: list[str],
    classifier,
) -> dict:
    pipeline = Pipeline([
        ("tfidf", build_tfidf()),
        ("clf", classifier),
    ])

    # Cross-validation on the training set (for reporting variance honestly)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")

    # Fit on full training set
    pipeline.fit(X_train, y_train)

    metrics = evaluate(name, pipeline, X_test, y_test, cv_scores)

    # Save artifacts
    out_dir = MODELS_DIR / f"{name}"
    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, out_dir / "model.joblib")
    joblib.dump(pipeline.named_steps["tfidf"], out_dir / "vectorizer.joblib")
    with (out_dir / "metrics.json").open("w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, default=str)

    print()
    print(f"=== {name} ===")
    print(f"  Accuracy:      {metrics['accuracy']:.4f}")
    print(f"  Precision (macro): {metrics['precision_macro']:.4f}")
    print(f"  Recall (macro):    {metrics['recall_macro']:.4f}")
    print(f"  F1 (macro):        {metrics['f1_macro']:.4f}")
    print(f"  F1 (weighted):     {metrics['f1_weighted']:.4f}")
    print(f"  ROC-AUC:           {metrics['roc_auc']:.4f}")
    print(f"  CV F1 (5-fold):    {metrics['cv_f1_mean']:.4f} Ã‚Â± {metrics['cv_f1_std']:.4f}")
    print(f"  Confusion matrix [[unsub],[sub]]:")
    for row in metrics["confusion_matrix"]:
        print(f"    {row}")
    print(f"  Saved: {out_dir}")

    return metrics


def update_registry(all_metrics: list[dict]) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    registry = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATASET.relative_to(REPO)),
        "models": all_metrics,
    }
    with REGISTRY.open("w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, default=str)
    print()
    print(f"Registry updated: {REGISTRY}")


def main() -> None:
    if not DATASET.exists():
        print(f"ERROR: dataset not found at {DATASET}")
        sys.exit(1)

    texts, labels = load_labelled(DATASET)

    if len(texts) < 40:
        print(f"ERROR: only {len(texts)} labelled claims. Need at least 40 to train.")
        sys.exit(1)

    from collections import Counter
    dist = Counter(labels)
    print(f"Label distribution: {dict(dist)}")

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=RANDOM_STATE, stratify=labels,
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")
    print()

    results = []

    results.append(train_one(
        "tfidf-lr-v1",
        X_train, y_train, X_test, y_test,
        LogisticRegression(
            class_weight="balanced",
            max_iter=2000,
            C=1.0,
            random_state=RANDOM_STATE,
        ),
    ))

    results.append(train_one(
        "tfidf-rf-v1",
        X_train, y_train, X_test, y_test,
        RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    ))

    results.append(train_one(
        "tfidf-xgb-v1",
        X_train, y_train, X_test, y_test,
        XGBClassifier(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
    ))

    update_registry(results)

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"{'Model':15s}  {'F1':>6s}  {'AUC':>6s}  {'CV F1':>12s}")
    for r in results:
        print(f"{r['model']:15s}  {r['f1_macro']:.4f}  {r['roc_auc']:.4f}  {r['cv_f1_mean']:.4f}Ã‚Â±{r['cv_f1_std']:.4f}")
    print()
    print("NOTE: baseline-v0 (rule-based) has no test metric Ã¢â‚¬â€ it is not a trainable model.")
    print("      Compare only against each other on the same held-out 20%.")


if __name__ == "__main__":
    main()
