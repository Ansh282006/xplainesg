import json
from pathlib import Path

reg = Path(r"C:\Users\anshb\Desktop\Hack\Project\xplainesg\ml\models\registry.json")
if not reg.exists():
    print("ERROR: registry.json not found at", reg)
    print("Training may not have completed. Re-run: python ml\training\train_claim_classifier.py")
    raise SystemExit(1)

d = json.loads(reg.read_text(encoding="utf-8"))
print("Generated:", d.get("generated_at"))
print("Dataset:", d.get("dataset_path"))
print()
for m in d.get("models", []):
    print(f"=== {m['model']} ===")
    print(f"  accuracy:        {m['accuracy']:.4f}")
    print(f"  precision macro: {m['precision_macro']:.4f}")
    print(f"  recall macro:    {m['recall_macro']:.4f}")
    print(f"  f1 macro:        {m['f1_macro']:.4f}")
    print(f"  f1 weighted:     {m['f1_weighted']:.4f}")
    print(f"  roc_auc:         {m['roc_auc']:.4f}")
    print(f"  cv_f1:           {m['cv_f1_mean']:.4f} +/- {m['cv_f1_std']:.4f}")
    print(f"  train/test:      {m['n_train']} / {m['n_test']}")
    print(f"  confusion:       {m['confusion_matrix']}")
    print()
