import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, BookOpen, Database, Eye, FileCheck, GitBranch, HeartHandshake,
  Layers, Lock, Scale, Shield, ShieldCheck, Sparkles, TrendingUp, UserCheck, Users,
} from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { DashboardStats } from '@/types'

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  children: React.ReactNode
}

function Section({ icon: Icon, title, subtitle, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  )
}

function LifecycleStage({ n, label, detail, current }: { n: number; label: string; detail: string; current?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${current ? 'border-brand-300 bg-brand-50' : 'border-line bg-surface-muted'}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold ${current ? 'bg-brand-700 text-white' : 'bg-surface text-ink-muted border border-line-strong'}`}>
        {n}
      </div>
      <div>
        <p className={`text-sm font-medium ${current ? 'text-brand-800' : 'text-ink'}`}>{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{detail}</p>
      </div>
    </div>
  )
}

function PrincipleCard({ icon: Icon, title, body, mapped }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; mapped: string }) {
  return (
    <div className="surface p-4">
      <Icon className="h-4 w-4 text-brand-700" />
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-3 border-t border-line-subtle pt-2">
        <p className="text-2xs uppercase tracking-wider text-ink-faint">Implemented as</p>
        <p className="mt-0.5 font-mono text-2xs text-brand-700">{mapped}</p>
      </div>
    </div>
  )
}

function FrameworkRow({ label, tone, description }: { label: string; tone: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line-subtle py-3 last:border-0">
      <Badge className={tone}>{label}</Badge>
      <p className="text-sm text-ink-muted">{description}</p>
    </div>
  )
}

export function Governance() {
  const { data: stats } = useQuery({
    queryKey: ['gov-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  })

  return (
    <div className="space-y-6 stagger">
      <header>
        <div className="flex items-center gap-2">
          <p className="label text-brand-700">Responsible AI</p>
          <Badge className="border-brand-200 bg-brand-50 text-brand-700">v0.1</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">AI Governance</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          How XplainESG implements responsible AI principles across the full lifecycle —
          from data collection to human review. Every claim below links to a live
          feature in this application.
        </p>
      </header>

      {/* Unit I — AI Lifecycle Governance --------------------------------- */}
      <Section
        icon={GitBranch}
        title="AI Lifecycle Governance"
        subtitle="Unit I — AI lifecycle, codes of conduct, Indian AI policy"
      >
        <div className="grid gap-3 md:grid-cols-5">
          <LifecycleStage n={1} label="Data Collection" detail="Four public ESG reports tracked with full provenance in manifest.csv." />
          <LifecycleStage n={2} label="Preprocessing" detail="PDF extraction, spaCy segmentation, rule-based claim mining." />
          <LifecycleStage n={3} label="Model Training" detail="TF-IDF + Random Forest, 5-fold CV, F1=0.88 on held-out test." />
          <LifecycleStage n={4} label="Validation" detail="SHAP + LIME attributions for every prediction. Sensitivity analysis." current />
          <LifecycleStage n={5} label="Human Review" detail="Reviewer accept/reject workflow with full audit trail." />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className="label-strong">Code of Conduct</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eco-700" /> No automated accusation — outputs labelled "potential risk".</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eco-700" /> Human review required before any external use.</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eco-700" /> Versioned formulas — every scoring change is tracked.</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-eco-700" /> No fabricated data — missing values are explicit, not imputed.</li>
            </ul>
          </div>
          <div>
            <p className="label-strong">Indian AI Policy Alignment</p>
            <p className="mt-2 text-xs text-ink-muted">
              NITI Aayog's Responsible AI framework (2021) identifies seven principles for
              AI for All. Our implementation:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
              <li>• <span className="font-medium text-ink">Safety &amp; Reliability</span> — human-in-the-loop gate on every result.</li>
              <li>• <span className="font-medium text-ink">Equality</span> — fairness dashboard tracks sector / region distribution.</li>
              <li>• <span className="font-medium text-ink">Inclusivity</span> — 4-tier RBAC + open scoring formulas.</li>
              <li>• <span className="font-medium text-ink">Transparency</span> — SHAP + LIME on every prediction.</li>
              <li>• <span className="font-medium text-ink">Privacy</span> — RLS, JWT, private storage bucket.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Unit II — ART Framework ---------------------------------------- */}
      <Section
        icon={Shield}
        title="The ART Framework"
        subtitle="Unit II — Accountability, Responsibility, Transparency"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PrincipleCard
            icon={FileCheck}
            title="Accountability"
            body="Every state-changing action is logged. Reviewers are identified. Admin actions are auditable."
            mapped={`audit_logs (${stats ? 'live' : '…'})`}
          />
          <PrincipleCard
            icon={UserCheck}
            title="Responsibility"
            body="AI produces potential-risk indicators, not verdicts. Human review is a hard requirement for external use."
            mapped="human_reviews workflow"
          />
          <PrincipleCard
            icon={Eye}
            title="Transparency"
            body="Every rating decomposes to weighted components. Sensitivity analysis shows what would change it."
            mapped="rating-attribution endpoint"
          />
        </div>
      </Section>

      {/* Unit III — Responsible AI Principles --------------------------- */}
      <Section
        icon={Sparkles}
        title="Responsible AI Principles"
        subtitle="Unit III — Fairness, Transparency, Accountability, Privacy, Inclusiveness"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PrincipleCard icon={Scale} title="Fairness" body="Sector and region distribution tracked. Disparate Impact Ratio placeholder — pending more labelled data." mapped="/fairness" />
          <PrincipleCard icon={Eye} title="Transparency" body="Two independent explainability methods (SHAP + LIME) agree on the top features." mapped="/explanations/{id}/shap" />
          <PrincipleCard icon={FileCheck} title="Accountability" body="Every write is audited with user, action, entity, previous and new value." mapped="/audit-logs" />
          <PrincipleCard icon={Lock} title="Privacy" body="Row-level security on every table. Service-role key never leaves the backend." mapped="Supabase RLS" />
          <PrincipleCard icon={Users} title="Inclusiveness" body="Four user roles. Report data from four companies across two countries, two sectors." mapped="RBAC" />
          <PrincipleCard icon={HeartHandshake} title="AI for Social Good" body="Designed for regulators, journalists, and academics — not speculative trading." mapped="landing mission" />
        </div>
      </Section>

      {/* Unit IV — Bias + Privacy --------------------------------------- */}
      <Section
        icon={AlertTriangle}
        title="Bias Sources & Mitigation"
        subtitle="Unit IV — Fairness, sources of bias, algorithmic discrimination"
      >
        <div className="space-y-1">
          <FrameworkRow
            label="Sampling bias"
            tone="border-amber-200 bg-amber-50 text-amber-700"
            description="4 companies from 3 sectors. Our 220 labelled claims are skewed toward IT. Mitigation: expand labels across 10 companies and 5 sectors (Phase 4)."
          />
          <FrameworkRow
            label="Label bias"
            tone="border-amber-200 bg-amber-50 text-amber-700"
            description="Single labeller. Mitigation: document the labelling guidelines; publish the CSV for community review."
          />
          <FrameworkRow
            label="Domain bias"
            tone="border-amber-200 bg-amber-50 text-amber-700"
            description="Trained on tech-sector language; may not generalise to manufacturing or utilities. Mitigation: sector-specific models in Phase 4."
          />
          <FrameworkRow
            label="Metric choice"
            tone="border-eco-200 bg-eco-50 text-eco-700"
            description="We use macro-F1, not accuracy, to prevent the model from ignoring the minority class."
          />
        </div>
      </Section>

      <Section
        icon={Database}
        title="Data Governance & Privacy"
        subtitle="Unit IV — Privacy-preserving AI, data ethics"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="label-strong">What we do</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
              <li>• Row-Level Security on all 9 tables</li>
              <li>• JWT verification on every API request</li>
              <li>• Private storage bucket + signed URLs</li>
              <li>• Service-role key confined to backend</li>
              <li>• Environment secrets, never committed</li>
              <li>• Full audit trail on writes</li>
            </ul>
          </div>
          <div>
            <p className="label-strong">Concept documented, not yet implemented</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
              <li>• Differential privacy in training data aggregation</li>
              <li>• Federated learning across company silos</li>
              <li>• Adversarial robustness testing</li>
              <li>• Inference-attack resistance</li>
            </ul>
            <p className="mt-3 text-xs text-ink-faint">
              These are noted for completeness and future work; not claimed as shipped.
            </p>
          </div>
        </div>
      </Section>

      {/* Human in the loop --------------------------------------------- */}
      <Section
        icon={UserCheck}
        title="Human-in-the-Loop Workflow"
        subtitle="The system never makes the final call"
      >
        <div className="grid gap-3 md:grid-cols-5">
          <LifecycleStage n={1} label="AI prediction" detail="Rating + probability produced by trained model." />
          <LifecycleStage n={2} label="Explanation" detail="SHAP + LIME + factor chart + narrative." />
          <LifecycleStage n={3} label="Human reviewer" detail="Reviews the analysis with full evidence." />
          <LifecycleStage n={4} label="Accept / Reject / Flag" detail="Decision recorded in human_reviews table." />
          <LifecycleStage n={5} label="Audit trail" detail="Every decision is immutable and traceable." current />
        </div>
        {stats && (
          <p className="mt-4 text-xs text-ink-muted">
            Live: <span className="font-semibold text-ink">{stats.pending_reviews}</span>{' '}
            {stats.pending_reviews === 1 ? 'analysis' : 'analyses'} awaiting review.
          </p>
        )}
      </Section>

      {/* Ethical frameworks ------------------------------------------- */}
      <Section
        icon={BookOpen}
        title="Ethical Frameworks Alignment"
        subtitle="Unit II — Utilitarianism, Deontology, Virtue Ethics"
      >
        <div className="space-y-1">
          <FrameworkRow
            label="Utilitarian"
            tone="border-brand-200 bg-brand-50 text-brand-700"
            description="The 0-10 rating aggregates harm across all claims — the greatest number of potential misrepresentations weighs most."
          />
          <FrameworkRow
            label="Deontological"
            tone="border-brand-200 bg-brand-50 text-brand-700"
            description="Hard rules: never accuse, always disclose uncertainty, always require human review. Non-negotiable."
          />
          <FrameworkRow
            label="Virtue Ethics"
            tone="border-brand-200 bg-brand-50 text-brand-700"
            description="The system is designed with honesty, fairness, and humility — every output states its own limitations."
          />
        </div>
      </Section>

      {/* IP rights ---------------------------------------------------- */}
      <Section
        icon={FileCheck}
        title="IP Rights & Attribution"
        subtitle="Unit I — IP rights and AI"
      >
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            All ESG reports are sourced from public company websites. Provenance is tracked
            in <span className="font-mono text-xs">ml/datasets/raw/reports/manifest.csv</span>.
            We do not redistribute the PDFs — only derived features and predictions.
          </p>
          <p>
            Our lexicon, scoring formulas, model weights, and this codebase are original
            contributions of the project. The 220 hand-labelled claims and trained models
            are intended for academic review.
          </p>
        </div>
      </Section>

      {/* Live stats --------------------------------------------------- */}
      {stats && (
        <Section icon={TrendingUp} title="Current System State" subtitle="Live from the database">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Companies tracked', value: stats.total_companies },
              { label: 'Reports ingested', value: stats.total_reports },
              { label: 'ESG claims extracted', value: stats.total_claims.toLocaleString() },
              { label: 'Analyses run', value: stats.total_analyses },
            ].map(({ label, value }) => (
              <div key={label} className="surface-muted p-3">
                <p className="label">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Disclaimer ---------------------------------------------------- */}
      <div className="disclaimer">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium">Research prototype notice</p>
            <p className="mt-1">
              XplainESG is a research tool. It does not produce certified ESG ratings, and
              its output is not a legal determination of wrongdoing. All outputs are
              labelled "potential risk" and require human review before any external use.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
