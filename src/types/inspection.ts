export type DefectType = 'tear' | 'stain' | 'water_mark' | 'other';
export type GarmentType = 'auto' | 't_shirt' | 'dress' | 'shirt' | 'pants' | 'other';
export type StoredGarmentType = 't_shirt' | 'dress' | 'shirt' | 'pants' | 'other' | 'any';
export type RuleResult = 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
export type VerdictType = 'PASS' | 'NEEDS_REVIEW' | 'FAIL';

export interface CustomerRule {
  id: string;
  name: string;
  enabled: boolean;
  garmentTypes: StoredGarmentType[]; // stored in Gemini enum format: ["t_shirt", "dress", ...] or ["any"]
  defectType: DefectType; // "tear" | "stain" | "water_mark" | "other"
  maxSizeMm: number | null; // stored as number or null (never string)
  result: RuleResult;
  examplePhoto: string | null; // base64 or null
  note?: string;
}

export interface GeminiDefect {
  type: DefectType | string;
  image_index: number;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  location: string;
  size_mm: number;
  size_basis: 'reference_object' | 'garment_proportions';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  stain_uncertain: boolean;
  description: string;
}

export interface GeminiInspectionResult {
  garment_type: string;
  image_quality: 'good' | 'poor';
  image_quality_note: string;
  defects: GeminiDefect[];
  summary: string;
}

export interface RuleEvaluationDetail {
  ruleId: string;
  ruleName: string;
  enabled: boolean;
  matched: boolean;
  failedCondition?: 'garment type' | 'defect type' | 'size' | 'size unknown' | 'disabled';
  details?: string;
}

export interface EvaluatedDefect extends GeminiDefect {
  id: string;
  verdict: VerdictType;
  ruleApplied: string;
  reason: string;
  isAllowedByCustomerRule: boolean;
  normalizedType: string;
  normalizedGarmentType: string;
  ruleEvaluations: RuleEvaluationDetail[];
}

export interface InspectionVerdict {
  verdict: VerdictType;
  reason: string;
  evaluatedDefects: EvaluatedDefect[];
  effectiveGarmentType: string;
  normalizedGarmentType: string;
  imageQuality: 'good' | 'poor';
  imageQualityNote: string;
  summary: string;
}

export interface UploadedGarmentPhoto {
  id: string;
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  fileSizeKb: number;
}
