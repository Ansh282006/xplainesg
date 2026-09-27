import { Link } from 'react-router-dom'
import { ArrowRight, FileText, LineChart, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PILLARS = [
  {
    icon: FileText,
    title: 'Report ingestion',
    body: 'Upload ESG and sustainability reports. Text is extracted, segmented and mined for ESG claims.',
  },
  {
    icon: Sparkles,
    title: 'Explainable models',
    body: 'NLP features fused with structured ESG indicators, classified and explained with SHAP and LIME.',
  },
  {
    icon: ShieldCheck,
    title: 'Human in the loop',
    body: 'No automated accusation. Every result is labelled "potential risk" and routed to a human reviewer.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
              X
            </div>
            <span className="font-semibold text-slate-900">XplainESG</span>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="label text-brand-700">Responsible &amp; Explainable AI</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
          Trustworthy ESG assessment and greenwashing risk detection.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          XplainESG combines natural-language analysis of sustainability disclosures
          with structured ESG indicators to surface{' '}
          <strong className="font-medium text-slate-800">potential</strong> greenwashing
          risk — and explains exactly why.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/dashboard">
            <Button size="lg" variant="eco">
              Analyze a company
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>

        <div className="disclaimer mt-10 max-w-3xl">
          XplainESG is a research prototype. It does not produce certified ESG
          ratings, and its output is not a legal determination of wrongdoing.
          All risk indicators require human review before any external use.
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface p-6">
              <Icon className="h-5 w-5 text-brand-700" />
              <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 text-xs text-slate-500">
          <LineChart className="h-4 w-4" />
          XplainESG — research prototype. Not an official ESG rating.
        </div>
      </footer>
    </div>
  )
}
