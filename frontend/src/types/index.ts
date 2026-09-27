export type UserRole = 'admin' | 'analyst' | 'reviewer' | 'viewer'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  organization: string | null
  created_at: string
}

export interface CompanyOverview {
  id: string
  name: string
  ticker: string | null
  country: string | null
  sector: string | null
  industry: string | null
  description: string | null
  website: string | null
  is_demo: boolean
  created_at: string
  updated_at: string

  latest_analysis_id: string | null
  esg_trust_score: number | null
  esg_performance_score: number | null
  greenwashing_risk: RiskLevel | null
  confidence_score: number | null
  analysis_status: string | null
  last_analyzed_at: string | null
}

export interface DashboardStats {
  total_companies: number
  total_reports: number
  total_analyses: number
  total_claims: number
  pending_reviews: number
  avg_trust_score: number | null
  avg_performance_score: number | null
  risk_distribution: Record<string, number>
  sector_distribution: { sector: string; count: number }[]
}

export interface Analysis {
  id: string
  company_id: string
  report_id: string | null
  model_version: string | null
  esg_performance_score: number | null
  esg_trust_score: number | null
  environmental_score: number | null
  social_score: number | null
  governance_score: number | null
  claim_credibility_score: number | null
  greenwashing_risk: RiskLevel | null
  greenwashing_probability: number | null
  confidence_score: number | null
  status: string
  is_demo: boolean
  missing_data: Record<string, unknown> | null
  feature_vector: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AnalysisResult {
  analysis: Analysis
  scoring_version: string
  explanations: {
    claim_credibility: Record<string, unknown>
    esg_performance: Record<string, unknown>
    esg_trust: Record<string, unknown>
    greenwashing_risk: Record<string, unknown>
  }
}
