import {
  CustomerRule,
  DefectType,
  EvaluatedDefect,
  GarmentType,
  GeminiDefect,
  GeminiInspectionResult,
  InspectionVerdict,
  RuleEvaluationDetail,
  RuleResult,
  StoredGarmentType,
  VerdictType,
} from '../types/inspection';

export const LOCAL_STORAGE_RULES_KEY = 'stitchcheck_rules';

// Leniency ranking: PASS (highest/most lenient) > NEEDS_REVIEW > FAIL
const LENIENCY_RANK: Record<RuleResult, number> = {
  PASS: 3,
  NEEDS_REVIEW: 2,
  FAIL: 1,
};

// Verdict severity ranking: FAIL (worst) > NEEDS_REVIEW > PASS (best)
const SEVERITY_RANK: Record<VerdictType, number> = {
  FAIL: 3,
  NEEDS_REVIEW: 2,
  PASS: 1,
};

/**
 * 1. Normalize all garment types before comparing:
 * lowercase, trim, and replace spaces and hyphens with underscores.
 * So "T-shirt", "t-shirt", "tshirt", "T shirt", "tee" all become "t_shirt".
 */
export function normalizeGarmentType(gt?: string | null): StoredGarmentType {
  if (!gt) return 'other';
  const val = gt.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (val === 'tshirt' || val === 'tee' || val === 't_shirt' || val === 'tshirt') {
    return 't_shirt';
  }
  if (val === 'dress') return 'dress';
  if (val === 'shirt') return 'shirt';
  if (val === 'pants' || val === 'pant' || val === 'trousers') return 'pants';
  if (val === 'any') return 'any';
  if (val === 'other') return 'other';
  return (val as StoredGarmentType) || 'other';
}

/**
 * 1. Normalize all defect types before comparing:
 * lowercase, trim, and replace spaces and hyphens with underscores.
 * "Water mark", "water-mark", "water_mark" all become "water_mark".
 */
export function normalizeDefectType(dt?: string | null): DefectType {
  if (!dt) return 'other';
  const val = dt.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (val === 'water_mark' || val === 'watermark') return 'water_mark';
  if (val === 'stain') return 'stain';
  if (val === 'tear' || val === 'rip' || val === 'hole') return 'tear';
  if (val === 'other') return 'other';
  return (val as DefectType) || 'other';
}

/**
 * 2. Store rule values in the same format as Gemini's enums:
 * defectType as "tear" | "stain" | "water_mark" | "other",
 * garmentTypes as "t_shirt" | "dress" | "shirt" | "pants" | "other" | "any".
 * Migrate any rules already in localStorage to this format when loading.
 */
export function loadCustomerRules(): CustomerRule[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let migrated = false;
    const cleanRules: CustomerRule[] = parsed.map((r: any, idx: number) => {
      const normDefect = normalizeDefectType(r.defectType);
      const rawGarments = Array.isArray(r.garmentTypes) ? r.garmentTypes : ['any'];
      const normGarments: StoredGarmentType[] = rawGarments.map((g: string) =>
        normalizeGarmentType(g)
      );

      // Make sure maxSizeMm is stored as a number, not a string
      let normMaxSize: number | null = null;
      if (r.maxSizeMm !== null && r.maxSizeMm !== undefined && r.maxSizeMm !== '') {
        const num = Number(r.maxSizeMm);
        normMaxSize = isNaN(num) ? null : num;
      }

      if (
        normDefect !== r.defectType ||
        JSON.stringify(normGarments) !== JSON.stringify(r.garmentTypes) ||
        normMaxSize !== r.maxSizeMm
      ) {
        migrated = true;
      }

      return {
        id: r.id || `rule-${Date.now()}-${idx}`,
        name: String(r.name || 'Customer Rule'),
        enabled: r.enabled !== false,
        garmentTypes: normGarments.length > 0 ? normGarments : ['any'],
        defectType: normDefect,
        maxSizeMm: normMaxSize,
        result: (['PASS', 'NEEDS_REVIEW', 'FAIL'].includes(r.result)
          ? r.result
          : 'PASS') as RuleResult,
        examplePhoto: r.examplePhoto || null,
        note: r.note ? String(r.note) : undefined,
      };
    });

    if (migrated) {
      saveCustomerRules(cleanRules);
    }

    return cleanRules;
  } catch (err) {
    console.warn('Failed to parse customer rules from localStorage', err);
    return [];
  }
}

export function saveCustomerRules(rules: CustomerRule[]): void {
  try {
    // Ensure every rule stored is strictly normalized and maxSizeMm is a number or null
    const normalizedRules: CustomerRule[] = rules.map((r) => {
      let maxSizeNum: number | null = null;
      if (r.maxSizeMm !== null && r.maxSizeMm !== undefined && r.maxSizeMm !== (' ' as any)) {
        const n = Number(r.maxSizeMm);
        maxSizeNum = isNaN(n) ? null : n;
      }
      return {
        ...r,
        garmentTypes: (r.garmentTypes || ['any']).map((g) => normalizeGarmentType(g)),
        defectType: normalizeDefectType(r.defectType),
        maxSizeMm: maxSizeNum,
      };
    });
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(normalizedRules));
  } catch (err) {
    console.error('Failed to save customer rules to localStorage', err);
  }
}

/**
 * Evaluates the inspection result against customer rules (first) and default rules (fallback).
 */
export function evaluateInspection(
  geminiResult: GeminiInspectionResult,
  selectedGarmentType: GarmentType | string,
  customerRules: CustomerRule[]
): InspectionVerdict {
  // 3. Garment type: use dropdown value if not "Auto-detect", otherwise Gemini's garment_type.
  // Normalize it the same way.
  const isAuto =
    !selectedGarmentType ||
    selectedGarmentType.toLowerCase().trim() === 'auto' ||
    selectedGarmentType.toLowerCase().trim() === 'auto-detect' ||
    selectedGarmentType.toLowerCase().trim() === 'autodetect';

  const effectiveRawGarmentType = isAuto
    ? geminiResult.garment_type
    : selectedGarmentType;

  const normalizedGarmentType = normalizeGarmentType(effectiveRawGarmentType);

  const isPoorQuality = geminiResult.image_quality === 'poor';
  const qualityNote = geminiResult.image_quality_note || '';

  const rawDefects = geminiResult.defects || [];

  const evaluatedDefects: EvaluatedDefect[] = rawDefects.map(
    (defect: GeminiDefect, index: number) => {
      const id = `defect-${index}-${defect.type}-${defect.image_index}`;
      const normalizedType = normalizeDefectType(defect.type);

      // 4. Size check: if size_mm is missing, null, or 0, the rule does NOT match;
      // mark the defect NEEDS REVIEW ("Size unknown").
      const sizeMm = defect.size_mm;
      const isSizeUnknown =
        sizeMm === undefined ||
        sizeMm === null ||
        isNaN(sizeMm) ||
        sizeMm <= 0;

      // 8. Debug evaluation tracking for every enabled customer rule
      const ruleEvaluations: RuleEvaluationDetail[] = customerRules.map((rule) => {
        if (!rule.enabled) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            enabled: false,
            matched: false,
            failedCondition: 'disabled',
            details: 'Rule is disabled',
          };
        }

        // Defect type check
        const normalizedRuleDefect = normalizeDefectType(rule.defectType);
        if (normalizedRuleDefect !== normalizedType) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            enabled: true,
            matched: false,
            failedCondition: 'defect type',
            details: `Defect "${normalizedType}" != rule "${normalizedRuleDefect}"`,
          };
        }

        // Garment type check
        const normRuleGarments = (rule.garmentTypes || ['any']).map((g) =>
          normalizeGarmentType(g)
        );
        const garmentMatches =
          normRuleGarments.includes('any') ||
          normRuleGarments.includes(normalizedGarmentType);
        if (!garmentMatches) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            enabled: true,
            matched: false,
            failedCondition: 'garment type',
            details: `Garment "${normalizedGarmentType}" not in [${normRuleGarments.join(', ')}]`,
          };
        }

        // Size check
        if (isSizeUnknown) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            enabled: true,
            matched: false,
            failedCondition: 'size unknown',
            details: 'Defect size_mm is missing or 0',
          };
        }

        if (rule.maxSizeMm !== null && sizeMm > rule.maxSizeMm) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            enabled: true,
            matched: false,
            failedCondition: 'size',
            details: `Size ${sizeMm} mm > max ${rule.maxSizeMm} mm`,
          };
        }

        // All conditions met!
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          enabled: true,
          matched: true,
          details: `Matched! Result: ${rule.result}`,
        };
      });

      // 5. Customer rules must be checked BEFORE the default rules,
      // and a matching rule's result must replace the default result for that defect.
      const matchingRuleEvals = ruleEvaluations.filter((re) => re.matched);

      if (matchingRuleEvals.length > 0) {
        // Find best matching customer rule by leniency (PASS > NEEDS_REVIEW > FAIL)
        const matchingRules = customerRules.filter((r) =>
          matchingRuleEvals.some((m) => m.ruleId === r.id)
        );
        matchingRules.sort(
          (a, b) => LENIENCY_RANK[b.result] - LENIENCY_RANK[a.result]
        );
        const bestRule = matchingRules[0];

        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: bestRule.result,
          ruleApplied: `Customer Rule: ${bestRule.name}`,
          reason: bestRule.note
            ? `${bestRule.name} (${bestRule.note})`
            : `Allowed by customer rule "${bestRule.name}"`,
          isAllowedByCustomerRule: bestRule.result === 'PASS',
        };
      }

      // Check if size was unknown on a defect that otherwise matched a customer rule
      const hadSizeUnknownFailure = ruleEvaluations.some(
        (re) => re.failedCondition === 'size unknown'
      );
      if (hadSizeUnknownFailure) {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'NEEDS_REVIEW',
          ruleApplied: 'Size Unknown Check',
          reason: 'Size unknown – defect size is missing or 0 mm',
          isAllowedByCustomerRule: false,
        };
      }

      // Low confidence detection check
      if (defect.confidence < 0.5) {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'NEEDS_REVIEW',
          ruleApplied: 'Confidence under 50%',
          reason: 'Low detection confidence (< 50%)',
          isAllowedByCustomerRule: false,
        };
      }

      // 5. Default rules (fallback when no customer rules matched):
      // - Any tear or hole → FAIL
      if (normalizedType === 'tear') {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'FAIL',
          ruleApplied: 'Default Rule: Tear or hole',
          reason: 'Any tear, hole, or open seam → FAIL',
          isAllowedByCustomerRule: false,
        };
      }

      // - Any stain, including water marks → FAIL
      if (normalizedType === 'stain' || normalizedType === 'water_mark') {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'FAIL',
          ruleApplied: `Default Rule: ${
            normalizedType === 'water_mark' ? 'Water mark' : 'Stain'
          }`,
          reason: `Any ${
            normalizedType === 'water_mark' ? 'water mark' : 'stain'
          } without customer rule exemption → FAIL`,
          isAllowedByCustomerRule: false,
        };
      }

      // - Other damage: high severity → FAIL, otherwise NEEDS REVIEW
      if (defect.severity === 'high') {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'FAIL',
          ruleApplied: 'Default Rule: Other damage (high severity)',
          reason: 'High severity other damage → FAIL',
          isAllowedByCustomerRule: false,
        };
      } else {
        return {
          ...defect,
          id,
          normalizedType,
          normalizedGarmentType,
          ruleEvaluations,
          verdict: 'NEEDS_REVIEW',
          ruleApplied: 'Default Rule: Other damage (moderate/low)',
          reason: 'Other damage requires inspector review',
          isAllowedByCustomerRule: false,
        };
      }
    }
  );

  // Overall verdict = worst result (FAIL > NEEDS REVIEW > PASS). No defects → PASS.
  let overallVerdict: VerdictType = 'PASS';
  let overallReason = 'No defects detected. Garment passed quality inspection.';

  if (evaluatedDefects.length === 0) {
    if (isPoorQuality) {
      overallVerdict = 'NEEDS_REVIEW';
      overallReason = qualityNote
        ? `Retake photo: ${qualityNote}`
        : 'Retake photo: Blurry or unclear photo';
    } else {
      overallVerdict = 'PASS';
      overallReason = 'No defects detected. Garment passed quality check.';
    }
  } else {
    let worstRank = 1; // PASS
    for (const d of evaluatedDefects) {
      const rank = SEVERITY_RANK[d.verdict];
      if (rank > worstRank) {
        worstRank = rank;
      }
    }

    if (worstRank === 3) {
      overallVerdict = 'FAIL';
      const failCount = evaluatedDefects.filter((d) => d.verdict === 'FAIL').length;
      overallReason = `${failCount} defect${failCount > 1 ? 's' : ''} failed quality standards`;
    } else if (worstRank === 2 || isPoorQuality) {
      overallVerdict = 'NEEDS_REVIEW';
      if (isPoorQuality) {
        overallReason = qualityNote
          ? `Retake photo: ${qualityNote}`
          : 'Retake photo: Blurry or unclear photo';
      } else {
        const reviewCount = evaluatedDefects.filter(
          (d) => d.verdict === 'NEEDS_REVIEW'
        ).length;
        overallReason = `${reviewCount} defect${reviewCount > 1 ? 's' : ''} require manual review`;
      }
    } else {
      overallVerdict = 'PASS';
      overallReason = 'All detected defects are within approved customer rules.';
    }
  }

  return {
    verdict: overallVerdict,
    reason: overallReason,
    evaluatedDefects,
    effectiveGarmentType: effectiveRawGarmentType,
    normalizedGarmentType,
    imageQuality: geminiResult.image_quality,
    imageQualityNote: qualityNote,
    summary: geminiResult.summary || overallReason,
  };
}
