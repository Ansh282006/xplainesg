import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, FileText, Layers, LineChart, Scale, ShieldCheck, Sparkles, TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'

const PILLARS = [
  { icon: FileText,    title: 'Report ingestion',   body: 'Upload ESG and sustainability reports. PDFs are extracted, segmented, and mined for ESG claims at sentence level.' },
  { icon: Sparkles,    title: 'Explainable models', body: 'Real SHAP and LIME attributions for every prediction. See exactly which tokens pushed the model, and by how much.' },
  { icon: Scale,       title: 'Transparent scoring',body: 'Documented, versioned formulas. Weights are configurable. No black boxes — every rating decomposes to real components.' },
  { icon: ShieldCheck, title: 'Human in the loop',  body: 'No automated accusation. Every result is labelled "potential risk" and routed to a human reviewer before use.' },
]

const FEATURES = [
  { icon: TrendingUp, title: '0–10 Greenwashing Risk Rating', body: 'A single interpretable number derived from claim vagueness, claim-vs-indicator divergence, and indicator weakness.' },
  { icon: BarChart3,  title: 'Why this rating?',              body: 'Waterfall decomposition. Sensitivity analysis. What-if scenarios. The exact three components that produced the number.' },
  { icon: Layers,     title: '10 real ESG factors',           body: 'Raw model tokens are mapped to Climate & Carbon, Employee Welfare, Board Governance, and seven other GRI-based factors.' },
  { icon: LineChart,  title: 'Claim vs Indicator Evidence',   body: 'Every numeric claim is compared against the company\u2019s own disclosed indicators. Divergence is quantified per claim.' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              X
            </div>
            <span className="font-semibold tracking-tight text-ink">XplainESG</span>
          </div>
          <nav className="hidden gap-6 text-sm text-ink-muted md:flex">
            <a href="#features"    className="transition-colors hover:text-ink">Features</a>
            <a href="#how"         className="transition-colors hover:text-ink">How it works</a>
            <a href="#responsible" className="transition-colors hover:text-ink">Responsible AI</a>
          </nav>
          <Link to="/login">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      {/* HERO with animated gradient background */}
      <section className="relative overflow-hidden">
        {/* Animated gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.10]">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-eco-400 to-brand-300 animate-gradient" />
        </div>

        {/* Floating decorative shapes */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl animate-float" />
          <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-eco-100/50 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="label text-brand-700 animate-hero-reveal">Responsible &amp; Explainable AI</p>

          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
            <span className="block animate-hero-reveal delay-100">
              Trustworthy ESG
            </span>
            <span className="block animate-hero-reveal delay-200">
              assessment and
            </span>
            <span className="block animate-hero-reveal delay-300">
              <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-eco-600 bg-clip-text text-transparent">
                greenwashing risk detection.
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-2xl animate-hero-reveal delay-400 text-lg leading-relaxed text-ink-muted">
            XplainESG combines natural-language analysis of sustainability disclosures with
            structured ESG indicators to surface <strong className="font-medium text-ink">potential</strong>{' '}
            greenwashing risk — and explains exactly why.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 animate-hero-reveal delay-500">
            <Link to="/dashboard">
              <Button size="lg" variant="eco" className="shadow-md hover:shadow-lg transition-shadow">
                Analyze a company
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>

          <div className="disclaimer mt-10 max-w-3xl animate-hero-reveal delay-500">
            XplainESG is a research prototype. It does not produce certified ESG ratings, and
            its output is not a legal determination of wrongdoing. All risk indicators require
            human review before any external use.
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-line bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2 lg:grid-cols-4 stagger">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface hover-elevate p-6">
              <Icon className="h-5 w-5 text-brand-700" />
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <p className="label text-brand-700">Key capabilities</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink">
          Not just a score. A traceable answer.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-ink-muted">
          Every prediction ships with an explanation. Not just "what" — but "why", "how much",
          and "what would change it".
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 stagger">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-line bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label text-brand-700">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            From PDF to explainable rating in five stages.
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-5 stagger">
            {[
              { n: '1', t: 'Ingest',  d: 'PDFs stored in Supabase Storage.' },
              { n: '2', t: 'Extract', d: 'Text, sentences, ESG claims.' },
              { n: '3', t: 'Analyze', d: 'ML classifier + indicator divergence.' },
              { n: '4', t: 'Explain', d: 'SHAP, LIME, factor aggregation.' },
              { n: '5', t: 'Review',  d: 'Human sign-off + audit trail.' },
            ].map((s) => (
              <li key={s.n} className="surface hover-elevate p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                  {s.n}
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Responsible AI */}
      <section id="responsible" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="label text-brand-700">Responsible AI</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              We never call it greenwashing.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Poor ESG performance is not greenwashing. A company that honestly reports weak
              performance is underperforming — not misleading. XplainESG is designed around
              that distinction.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              We detect <strong className="font-medium text-ink">divergence</strong> between
              what a company claims and what its own disclosed numbers show. Every output is
              labelled "potential risk" and routed to a human reviewer.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink">
              {[
                'No automated accusation — only potential-risk indicators.',
                'Every result carries the disclaimer on the result page.',
                'Full audit trail on every state-changing action.',
                'Weights and formulas are open and versioned.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-eco-700" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="surface hover-elevate p-8">
            <p className="label">Our definition of greenwashing risk</p>
            <blockquote className="mt-3 text-lg font-medium leading-snug text-ink">
              The gap between what a company <em>claims</em> and what its own{' '}
              <em>disclosed numbers</em> show.
            </blockquote>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              This is a claim-vs-evidence assessment, not an absolute ESG rating. It is the
              framing that distinguishes a potential misrepresentation signal from a weak
              sustainability report.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 text-xs text-ink-faint md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            XplainESG — research prototype. Not an official ESG rating.
          </div>
          <p>Built with FastAPI · React · Supabase · SHAP · LIME</p>
        </div>
      </footer>
    </div>
  )
}
