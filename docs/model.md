# Model Methodology
- Target: classify claim as "substantiated" or "unsubstantiated".
- Features: TF-IDF (word 1-2 grams, sublinear_tf, min_df=2).
- Models: LR (0.74), RF (0.88), XGB (pending).
- Explainability: SHAP KernelExplainer + LIME.
- Risk Rating: 0-10 score = 10 * (0.4*Vagueness + 0.4*Divergence + 0.2*IndicatorWeakness).