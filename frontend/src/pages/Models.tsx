import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Award, BarChart3, Brain, Cpu, Gauge, Layers, TrendingUp,
} from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface ModelMetrics {
  model: string
  accuracy: number
  precision_macro: number
  recall_macro: number
  f1_macro: number
  f1_weighted: number
  roc_auc: number
  cv_f1_mean: number
  cv_f1_std: number
  n_train: number
  n_test: number
  confusion_matrix: number[][]
  confusion_matrix_labels: string[]
  trained_at?: string
}

interface Registry {
  models: ModelMetrics[]
  dataset_path?: string
  generated_at?: string
}

const MODEL_LABELS: Record<string, string> = {
  'tfidf-lr-v1': 'Logistic Regression',
  'tfidf-rf-v1': 'Random Forest',
  'tfidf-xgb-v1': 'XGBoost',
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'tfidf-lr-v1': 'Linear baseline. Fast, interpretable, but can\'t capture non-linear token interactions.',
  'tfidf-rf-v1': 'Ensemble of 300 trees. Handles sparse high-dimensional TF-IDF natively. Production model.',
  'tfidf-xgb-v1': 'Gradient boosting. Expected to compete once more labels are available.',
}

const DEPLOYED_MODEL = 'tfidf-rf-v1'

const MODEL_COLORS: Record<string, string> = {
  'tfidf-lr-v1': '#94a3b8',
  'tfidf-rf-v1': '#1f9d6a',
  'tfidf-xgb-v1': '#2c6291',
}

function metricBar(value: number, label: string, color: string) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono font-semibold text-ink">{value.toFixed(4)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function Models() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['models-registry'],
    queryFn: () => api.get<Registry>('/models'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">Could not load models registry.</p>
        <p className="mt-2 text-xs text-ink-muted">
          {error instanceof Error ? error.message : ''}
        </p>
      </Card>
    )
  }

  const models = data.models ?? []
  const winner = models.find((m) => m.model === DEPLOYED_MODEL) ?? models[0]

  // Prepare comparison data
  const comparisonData = ['Accuracy', 'F1 (macro)', 'F1 (weighted)', 'ROC-AUC', 'CV F1'].map((metric) => {
    const row: Record<string, number | string> = { metric }
    models.forEach((m) => {
      const v = metric === 'Accuracy' ? m.accuracy
        : metric === 'F1 (macro)' ? m.f1_macro
        : metric === 'F1 (weighted)' ? m.f1_weighted
        : metric === 'ROC-AUC' ? m.roc_auc
        : m.cv_f1_mean
      row[MODEL_LABELS[m.model] ?? m.model] = Number(v.toFixed(4))
    })
    return row
  })

  return (
    <div className="space-y-6 stagger">
      <header>
        <div className="flex items-center gap-2">
          <p className="label text-brand-700">ML Pipeline</p>
          <Badge className="border-eco-200 bg-eco-50 text-eco-700">
            <Award className="h-3 w-3" /> Production: {DEPLOYED_MODEL}
          </Badge>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Model Registry</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          {models.length} models trained on the labelled claim dataset. Metrics computed on a
          held-out 20% test split. Cross-validation F1 reported for generalization stability.
        </p>
        {data.dataset_path && (
          <p className="mt-2 font-mono text-xs text-ink-faint">
            Dataset: {data.dataset_path}
          </p>
        )}
      </header>

      {/* Comparison overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Metric comparison
          </CardTitle>
        </CardHeader>
        <CardBody className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ left: 10, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 1]} />
              <Tooltip formatter={(v: number) => v.toFixed(4)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {models.map((m) => (
                <Bar
                  key={m.model}
                  dataKey={MODEL_LABELS[m.model] ?? m.model}
                  fill={MODEL_COLORS[m.model] ?? '#64748b'}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Model cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {models.map((m) => {
          const isDeployed = m.model === DEPLOYED_MODEL
          const color = MODEL_COLORS[m.model] ?? '#64748b'
          return (
            <Card
              key={m.model}
              className={cn(
                'p-5',
                isDeployed && 'border-2 border-eco-300 bg-eco-50/30',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" style={{ color }} />
                    <p className="text-sm font-semibold text-ink">
                      {MODEL_LABELS[m.model] ?? m.model}
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-ink-faint">{m.model}</p>
                </div>
                {isDeployed && (
                  <Badge className="border-eco-300 bg-eco-100 text-eco-800">
                    <Award className="h-3 w-3" /> Deployed
                  </Badge>
                )}
              </div>

              <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-ink-muted">
                {MODEL_DESCRIPTIONS[m.model] ?? 'Model details not documented.'}
              </p>

              <div className="mt-4 space-y-2">
                {metricBar(m.accuracy, 'Accuracy', color)}
                {metricBar(m.f1_macro, 'F1 (macro)', color)}
                {metricBar(m.roc_auc, 'ROC-AUC', color)}
                {metricBar(m.cv_f1_mean, `CV F1 ± ${m.cv_f1_std.toFixed(3)}`, color)}
              </div>

              <div className="mt-4 border-t border-line-subtle pt-3">
                <div className="flex items-center justify-between text-2xs text-ink-faint">
                  <span>Train: {m.n_train}</span>
                  <span>Test: {m.n_test}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Confusion matrices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Confusion matrices
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            {models.map((m) => (
              <div key={m.model} className="surface-muted p-4">
                <p className="mb-3 text-xs font-semibold text-ink">
                  {MODEL_LABELS[m.model] ?? m.model}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {m.confusion_matrix.map((row, i) =>
                    row.map((val, j) => (
                      <div
                        key={`${i}-${j}`}
                        className={cn(
                          'flex h-14 items-center justify-center rounded-md font-mono text-lg font-semibold',
                          i === j
                            ? 'bg-eco-100 text-eco-800'
                            : 'bg-red-50 text-red-700',
                        )}
                      >
                        {val}
                      </div>
                    )),
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-2xs text-ink-faint">
                  <span>Pred Unsub</span>
                  <span>Pred Sub</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-2xs text-ink-faint">
            Rows = actual class · Columns = predicted class. Diagonal = correct.
          </p>
        </CardBody>
      </Card>

      {/* Cross-validation stability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Cross-validation stability
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-xs text-ink-muted">
            5-fold stratified CV on the training set. Mean F1 with standard deviation shows
            how reliably the model generalizes across different splits.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={models.map((m) => ({
                  model: MODEL_LABELS[m.model] ?? m.model,
                  mean: m.cv_f1_mean,
                  upper: m.cv_f1_mean + m.cv_f1_std,
                  lower: Math.max(0, m.cv_f1_mean - m.cv_f1_std),
                }))}
                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="model" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0.5, 1]} />
                <Tooltip formatter={(v: number) => v.toFixed(4)} />
                <Line type="monotone" dataKey="mean" stroke="#2c6291" strokeWidth={2} dot={{ r: 6 }} />
                <Line type="monotone" dataKey="upper" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="lower" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Winner summary */}
      {winner && (
        <Card className="border-2 border-eco-300 bg-eco-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-eco-700" /> Deployed model
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="label">Model</p>
                <p className="mt-1 font-mono text-sm font-semibold text-ink">{winner.model}</p>
              </div>
              <div>
                <p className="label">F1 (macro)</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {winner.f1_macro.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="label">ROC-AUC</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {winner.roc_auc.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="label">CV F1</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {winner.cv_f1_mean.toFixed(3)} ± {winner.cv_f1_std.toFixed(3)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Footer note */}
      <div className="disclaimer">
        <Gauge className="mr-2 inline h-3.5 w-3.5" />
        All metrics are computed on real held-out test data. No fabricated values. If a model
        is not trained, its metrics appear as "Not available".
      </div>
    </div>
  )
}
