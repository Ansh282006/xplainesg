# XplainESG — Demo Walkthrough

**Total time:** 8 minutes. **Screenshots to take:** 7.

---

## Scene 1 — The problem (30 seconds)

**Screenshot 1:** Landing page hero.

> "ESG ratings today are black boxes. MSCI, Sustainalytics — they give you a
> number, not a reason. XplainESG flips that. Every rating is traceable to
> the exact features, tokens, and evidence behind it."

Point at the four pillar cards on the landing page.

---

## Scene 2 — Data foundation (45 seconds)

**Screenshot 2:** Dashboard.

> "We've ingested four real ESG reports — Infosys, TCS, Reliance, Microsoft.
> 950 pages, 3.5 million characters of text. The pipeline extracted 2,460
> ESG claims and stored everything in Supabase."

Point at:
- Companies: 4, Reports: 4
- The greenwashing risk distribution chart
- The sector distribution chart

---

## Scene 3 — The novelty (3 minutes) ⭐

**Screenshot 3:** Analysis Result page — hero card + rating.

**Screenshot 4:** "Why this rating?" panel — waterfall + sensitivity + what-if.

> "Here's what makes this different. The rating is 7.13 out of 10. But that
> number is not a black box."

Point at the **waterfall chart**:
> "Claim vagueness contributes 4.69. Indicator weakness contributes 2.44.
> Claim-vs-indicator divergence contributes 0.00 for this particular analysis.
> These three numbers add up to exactly 7.13."

Point at **Sensitivity cards**:
> "If claim vagueness were 0, the rating would drop to 2.44. We can see the
> exact marginal contribution of each component."

Point at **What-if scenario**:
> "And here's the demo's killer feature: if vagueness dropped to 0.30, the
> industry median, the rating would fall from 7.13 to 2.62. That's a
> specific, actionable, auditable number."

---

## Scene 4 — Explainability (2 minutes)

**Screenshot 5:** ESG Factor Contributions chart (10 factors).

> "Raw model tokens are mapped to 10 real ESG factors — Climate & Carbon,
> Employee Welfare, Board Governance, Diversity & Inclusion, and six others.
> This is what a regulator actually wants to see."

**Screenshot 6:** SHAP chart with per-token bars.

> "Below that, the per-token SHAP attributions. Green bars push toward
> substantiated. Red bars push toward unsubstantiated. This uses real SHAP
> via KernelExplainer — not a fallback."

Point at 2-3 bars and read them aloud:
> "'emissions' at -0.165 — the model saw this as a strong substantiation signal.
> 'renewable energy' at -0.069 — also substantiated."

---

## Scene 5 — Claim explorer + evidence table (1.5 minutes)

**Screenshot 7:** Claim Explorer with divergence badges + Evidence table on result page.

> "And here's where the pipeline gets concrete. Every claim is annotated with
> its divergence from the company's own disclosed indicators. High divergence
> claims are flagged in red."

Point at the Evidence table:
> "For each numeric claim, we compare what the company said against what its
> own BRSR section shows. 'We reduced emissions by 32%' vs the actual YoY
> change. That's the divergence signal."

---

## Scene 6 — Responsible AI (30 seconds)

Scroll to the disclaimer at the bottom of the result page.

> "Finally — and this is non-negotiable for our framework — every output is
> labelled 'potential greenwashing risk'. We never assert intent. Human
> review is required before any external use. That's the Responsible AI
> principle the entire system is built around."

---

## Common Q&A

**Q: What's the model?**
A: TF-IDF + Random Forest. F1 0.88, AUC 0.94 on 220 hand-labelled claims. Trained with 5-fold stratified CV.

**Q: Why not a transformer?**
A: We have 220 labels. That's a Random Forest's sweet spot. Transformer would overfit catastrophically. Future work expands labels to 1000+ then adds ClimateBERT embeddings.

**Q: What's the novelty?**
A: Three things. (1) The 0-10 rating that decomposes to weighted components. (2) The sensitivity analysis — "what if X were 0". (3) The claim-vs-indicator divergence engine.

**Q: What's not done?**
A: TCS/Reliance/MSFT don't have indicators yet — only Infosys. Real SHAP is via KernelExplainer, not TreeExplainer (sklearn 1.6 incompat). Human review workflow is designed but not wired.

**Q: How is greenwashing defined here?**
A: Not "bad ESG performance". It's the gap between claims and disclosed numbers. A company that honestly reports weakness is not greenwashing.

---

## Screenshot checklist

- [ ] Landing hero
- [ ] Dashboard (both charts visible)
- [ ] Analysis Result hero card
- [ ] "Why this rating?" waterfall + sensitivity
- [ ] ESG Factor Contributions chart
- [ ] SHAP token bars
- [ ] Claim Explorer + Evidence table
