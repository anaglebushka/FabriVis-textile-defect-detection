import React, { useState, useRef } from 'react';
import {
  CustomerRule,
  DefectType,
  RuleResult,
  StoredGarmentType,
} from '../types/inspection';
import {
  formatRuleInPlainEnglish,
  resizeImageToMax800,
} from '../utils/imageUtils';
import {
  normalizeGarmentType,
  normalizeDefectType,
} from '../utils/verdictEngine';
import {
  Check,
  X,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Camera,
  Eye,
} from 'lucide-react';

interface RulesScreenProps {
  rules: CustomerRule[];
  onSaveRules: (updated: CustomerRule[]) => void;
}

const DEFAULT_RULES = [
  {
    title: 'Any tear or hole',
    verdict: 'FAIL' as RuleResult,
    description: 'Rips, cuts, punctures, or open seams fail standard QC',
  },
  {
    title: 'Any stain, including water marks',
    verdict: 'FAIL' as RuleResult,
    description: 'Discoloration, food, oil, ink, makeup, or water stains fail',
  },
  {
    title: 'Other damage',
    verdict: 'FAIL' as RuleResult,
    customBadge: 'FAIL / REVIEW',
    description: 'High severity fails standard QC; minor or moderate requires manual review',
    isMixed: true,
  },
  {
    title: 'Confidence under 50%',
    verdict: 'NEEDS_REVIEW' as RuleResult,
    description: 'Low-confidence detections flagged for inspector verification',
  },
  {
    title: 'Blurry or unclear photo',
    verdict: 'NEEDS_REVIEW' as RuleResult,
    description: 'Poor lighting, motion blur, or obscured fabric prompts photo retake',
  },
];

const GARMENT_OPTIONS: { id: StoredGarmentType; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 't_shirt', label: 'T-shirt' },
  { id: 'dress', label: 'Dress' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'pants', label: 'Pants' },
  { id: 'other', label: 'Other' },
];

export const RulesScreen: React.FC<RulesScreenProps> = ({
  rules,
  onSaveRules,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formGarments, setFormGarments] = useState<StoredGarmentType[]>(['any']);
  const [formDefectType, setFormDefectType] = useState<DefectType>('water_mark');
  const [formMaxSize, setFormMaxSize] = useState<string>('40');
  const [formResult, setFormResult] = useState<RuleResult>('PASS');
  const [formExamplePhoto, setFormExamplePhoto] = useState<string | null>(null);
  const [formNote, setFormNote] = useState('');

  // Example photo zoom preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormName('');
    setFormGarments(['any']);
    setFormDefectType('water_mark');
    setFormMaxSize('40');
    setFormResult('PASS');
    setFormExamplePhoto(null);
    setFormNote('');
    setEditingRuleId(null);
    setIsFormOpen(false);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (rule: CustomerRule) => {
    setEditingRuleId(rule.id);
    setFormName(rule.name);
    setFormGarments(
      rule.garmentTypes && rule.garmentTypes.length > 0
        ? rule.garmentTypes.map((g) => normalizeGarmentType(g))
        : ['any']
    );
    setFormDefectType(normalizeDefectType(rule.defectType));
    setFormMaxSize(rule.maxSizeMm !== null && rule.maxSizeMm !== undefined ? String(rule.maxSizeMm) : '');
    setFormResult(rule.result);
    setFormExamplePhoto(rule.examplePhoto);
    setFormNote(rule.note || '');
    setIsFormOpen(true);
  };

  const handleToggleGarment = (id: string) => {
    const normId = normalizeGarmentType(id);
    if (normId === 'any') {
      setFormGarments(['any']);
      return;
    }
    const filtered = formGarments.filter((g) => g !== 'any');
    if (filtered.includes(normId)) {
      const next = filtered.filter((g) => g !== normId);
      setFormGarments(next.length === 0 ? ['any'] : next);
    } else {
      setFormGarments([...filtered, normId]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageToMax800(file);
      setFormExamplePhoto(resized.dataUrl);
    } catch (err) {
      console.error('Failed to resize example photo:', err);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const parsedSize =
      formMaxSize.trim() !== '' && !isNaN(Number(formMaxSize))
        ? Number(formMaxSize)
        : null;

    const normalizedGarments: StoredGarmentType[] = formGarments.map((g) =>
      normalizeGarmentType(g)
    );
    const normalizedDefect = normalizeDefectType(formDefectType);

    if (editingRuleId) {
      const updated = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              name: formName.trim(),
              garmentTypes: normalizedGarments,
              defectType: normalizedDefect,
              maxSizeMm: parsedSize,
              result: formResult,
              examplePhoto: formExamplePhoto,
              note: formNote.trim() || undefined,
            }
          : r
      );
      onSaveRules(updated);
    } else {
      const newRule: CustomerRule = {
        id: `rule-${Date.now()}`,
        name: formName.trim(),
        enabled: true,
        garmentTypes: normalizedGarments,
        defectType: normalizedDefect,
        maxSizeMm: parsedSize,
        result: formResult,
        examplePhoto: formExamplePhoto,
        note: formNote.trim() || undefined,
      };
      onSaveRules([...rules, newRule]);
    }

    resetForm();
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    onSaveRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    onSaveRules(updated);
  };

  const handleResetToDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmResetToDefaults = () => {
    onSaveRules([]);
    setShowResetConfirm(false);
  };

  const livePreviewText = formatRuleInPlainEnglish({
    defectType: formDefectType,
    garmentTypes: formGarments,
    maxSizeMm: formMaxSize.trim() ? Number(formMaxSize) : null,
    result: formResult,
  });

  const getStatusBadgeConfig = (res: RuleResult, customLabel?: string) => {
    if (res === 'PASS') {
      return {
        borderClass: 'border-l-4 border-l-[#12B76A]',
        badgeClass: 'bg-[#E7F8EF] text-[#12B76A]',
        icon: <Check className="w-3.5 h-3.5 stroke-[3]" />,
        label: customLabel || 'PASS',
      };
    }
    if (res === 'NEEDS_REVIEW') {
      return {
        borderClass: 'border-l-4 border-l-[#F5A524]',
        badgeClass: 'bg-[#FFF6E5] text-[#F5A524]',
        icon: <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />,
        label: customLabel || 'NEEDS REVIEW',
      };
    }
    return {
      borderClass: 'border-l-4 border-l-[#E5484D]',
      badgeClass: 'bg-[#FDECEC] text-[#E5484D]',
      icon: <X className="w-3.5 h-3.5 stroke-[3]" />,
      label: customLabel || 'FAIL',
    };
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150">
      {/* Header Info */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-[18px] font-semibold text-[#0F1B2D]">Inspection Rules</h2>
          <p className="text-[13px] text-[#5B6B7F]">
            Quality standards & customer tolerance overrides
          </p>
        </div>
        {rules.length > 0 && (
          <button
            onClick={handleResetToDefaults}
            className="min-h-[48px] px-3 py-2 rounded-[8px] bg-white border border-[#DCE3EB] text-[13px] font-semibold text-[#5B6B7F] hover:text-[#E5484D] flex items-center gap-1.5 transition active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to defaults</span>
          </button>
        )}
      </div>

      {/* SECTION A: Default Rules (Read-Only) */}
      <div className="space-y-3">
        <h3 className="text-[15px] font-semibold text-[#0F1B2D]">
          Section A – Default rules (read-only)
        </h3>

        <div className="space-y-2.5">
          {DEFAULT_RULES.map((rule, idx) => {
            const config = getStatusBadgeConfig(
              rule.verdict,
              rule.customBadge
            );

            return (
              <div
                key={idx}
                className={`p-4 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] ${config.borderClass} flex items-start justify-between gap-3`}
              >
                <div className="space-y-1">
                  <span className="text-[15px] font-semibold text-[#0F1B2D] block">
                    {rule.title}
                  </span>
                  <p className="text-[13px] text-[#5B6B7F] leading-snug">
                    {rule.description}
                  </p>
                </div>

                {/* Never color alone: icon + label */}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-[4px] flex-shrink-0 mt-0.5 ${config.badgeClass}`}
                >
                  {config.icon}
                  <span>{config.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B: Customer Rules (Override Defaults) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#0F1B2D]">
            Section B – Customer rules (override defaults)
          </h3>

          <button
            onClick={openAddForm}
            className="min-h-[48px] px-4 py-2 rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] text-white text-[14px] font-semibold flex items-center gap-1.5 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add rule</span>
          </button>
        </div>

        {/* Form Panel */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmitForm}
            className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] space-y-4 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#DCE3EB] pb-2.5">
              <h4 className="text-[15px] font-semibold text-[#0F1B2D]">
                {editingRuleId ? 'Edit Rule' : 'New Customer Rule'}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#5B6B7F] hover:text-[#0F1B2D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Plain-English Preview */}
            <div className="p-3.5 rounded-[12px] bg-[#F5F8FB] border border-[#DCE3EB] space-y-1">
              <span className="text-[11px] uppercase font-bold text-[#5B6B7F] block">
                Rule Preview
              </span>
              <p className="text-[15px] font-semibold text-[#0F1B2D] leading-snug">
                "{livePreviewText}"
              </p>
            </div>

            {/* Rule Name */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Water marks on T-shirts smaller than 40 mm"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="min-h-[48px] w-full bg-[#FFFFFF] border border-[#DCE3EB] rounded-[12px] px-3.5 text-[15px] text-[#0F1B2D] focus:outline-hidden focus:border-[#2F6FED]"
              />
            </div>

            {/* Garment Types Multi-select Chips */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">
                Garment Types (multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {GARMENT_OPTIONS.map((g) => {
                  const isSelected = formGarments.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleGarment(g.id)}
                      className={`min-h-[48px] px-3.5 rounded-[12px] text-[13px] font-semibold border transition ${
                        isSelected
                          ? 'bg-[#0F2A44] border-[#0F2A44] text-white'
                          : 'bg-[#FFFFFF] border-[#DCE3EB] text-[#5B6B7F] hover:border-[#0F2A44]'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Defect Type & Max Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1">
                  Defect Type
                </label>
                <select
                  value={formDefectType}
                  onChange={(e) => setFormDefectType(e.target.value as DefectType)}
                  className="min-h-[48px] w-full bg-[#FFFFFF] border border-[#DCE3EB] rounded-[12px] px-3 text-[14px] text-[#0F1B2D] focus:outline-hidden focus:border-[#2F6FED]"
                >
                  <option value="water_mark">Water mark</option>
                  <option value="stain">Stain</option>
                  <option value="tear">Tear</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1">
                  Max Size (mm)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Empty = any size"
                  value={formMaxSize}
                  onChange={(e) => setFormMaxSize(e.target.value)}
                  className="min-h-[48px] w-full bg-[#FFFFFF] border border-[#DCE3EB] rounded-[12px] px-3 text-[14px] text-[#0F1B2D] focus:outline-hidden focus:border-[#2F6FED]"
                />
              </div>
            </div>

            {/* Result */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1.5">
                Result
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PASS', 'NEEDS_REVIEW', 'FAIL'] as RuleResult[]).map((res) => {
                  const isSelected = formResult === res;
                  let activeStyle = 'bg-[#FFFFFF] border-[#DCE3EB] text-[#5B6B7F]';

                  if (isSelected) {
                    if (res === 'PASS') activeStyle = 'bg-[#E7F8EF] border-[#12B76A] text-[#12B76A] font-bold';
                    else if (res === 'NEEDS_REVIEW') activeStyle = 'bg-[#FFF6E5] border-[#F5A524] text-[#F5A524] font-bold';
                    else activeStyle = 'bg-[#FDECEC] border-[#E5484D] text-[#E5484D] font-bold';
                  }

                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setFormResult(res)}
                      className={`min-h-[48px] py-2 px-1 rounded-[12px] text-[12px] border transition flex items-center justify-center gap-1 ${activeStyle}`}
                    >
                      {res === 'PASS' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      {res === 'FAIL' && <X className="w-3.5 h-3.5 stroke-[3]" />}
                      {res === 'NEEDS_REVIEW' && <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />}
                      <span>{res.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Example Photo (Optional) */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1">
                Example Photo (optional)
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              {formExamplePhoto ? (
                <div className="flex items-center gap-3 p-3 rounded-[12px] bg-[#F5F8FB] border border-[#DCE3EB]">
                  <img
                    src={formExamplePhoto}
                    alt="Rule example"
                    className="w-14 h-14 rounded-[8px] object-cover border border-[#DCE3EB]"
                  />
                  <div className="flex-1">
                    <span className="text-[13px] text-[#0F1B2D] font-medium block">
                      Example defect attached
                    </span>
                    <span className="text-[11px] text-[#5B6B7F] block">
                      Max 800px reference
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormExamplePhoto(null)}
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#E5484D]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="min-h-[48px] w-full py-3 rounded-[12px] border-2 border-dashed border-[#DCE3EB] hover:border-[#2F6FED] bg-[#FFFFFF] text-[#5B6B7F] hover:text-[#2F6FED] flex items-center justify-center gap-2 text-[13px] font-medium transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Show an example of this defect (max 800px)</span>
                </button>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0F1B2D] mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Buyer tolerance agreement"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="min-h-[48px] w-full bg-[#FFFFFF] border border-[#DCE3EB] rounded-[12px] px-3.5 text-[14px] text-[#0F1B2D] focus:outline-hidden focus:border-[#2F6FED]"
              />
            </div>

            {/* Primary Action Button: 56px tall, primary color, white text, 12px radius */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[56px] flex-1 rounded-[12px] bg-[#FFFFFF] hover:bg-[#F5F8FB] border border-[#DCE3EB] text-[#0F1B2D] font-semibold text-[15px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[56px] h-[56px] flex-1 rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] text-white font-semibold text-[15px]"
              >
                {editingRuleId ? 'Update Rule' : 'Save Rule'}
              </button>
            </div>
          </form>
        )}

        {/* Customer Rules List: Rule cards with 4px left border in result color */}
        {rules.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-[12px] border border-dashed border-[#DCE3EB] bg-[#FFFFFF] text-[#5B6B7F] space-y-2">
            <p className="text-[15px] font-semibold text-[#0F1B2D]">No customer rules set</p>
            <p className="text-[13px] text-[#5B6B7F] max-w-xs mx-auto">
              Default quality rules currently apply. Add customer rules above to allow buyer tolerances.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const plainEnglish = formatRuleInPlainEnglish(rule);
              const config = getStatusBadgeConfig(rule.result);

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] ${config.borderClass} transition ${
                    rule.enabled ? 'opacity-100' : 'opacity-60 bg-[#F5F8FB]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[15px] text-[#0F1B2D]">
                          {rule.name}
                        </span>
                        {/* Never color alone: Tinted background, colored text, AND icon */}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-[4px] ${config.badgeClass}`}
                        >
                          {config.icon}
                          <span>{config.label}</span>
                        </span>
                      </div>

                      {/* Plain English statement */}
                      <p className="text-[14px] font-medium text-[#0F1B2D] leading-snug">
                        "{plainEnglish}"
                      </p>

                      {rule.note && (
                        <p className="text-[12px] text-[#5B6B7F]">
                          Note: {rule.note}
                        </p>
                      )}
                    </div>

                    {/* Example photo thumbnail */}
                    {rule.examplePhoto && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(rule.examplePhoto)}
                        className="min-h-[48px] min-w-[48px] relative w-12 h-12 rounded-[8px] overflow-hidden border border-[#DCE3EB] flex-shrink-0 group"
                        title="View reference photo"
                      >
                        <img
                          src={rule.examplePhoto}
                          alt="Example defect"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Actions Row with min 48px tap targets */}
                  <div className="mt-3 pt-3 border-t border-[#DCE3EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id)}
                        className={`min-h-[48px] flex items-center gap-2 text-[13px] font-medium text-[#5B6B7F]`}
                        aria-label={`Toggle rule ${rule.name}`}
                      >
                        <div
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                            rule.enabled ? 'bg-[#0F2A44]' : 'bg-[#DCE3EB]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-200 ${
                              rule.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                        <span>{rule.enabled ? 'Active' : 'Disabled'}</span>
                      </button>
                    </div>

                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => openEditForm(rule)}
                        className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#5B6B7F] hover:text-[#0F1B2D] transition"
                        title="Edit rule"
                        aria-label="Edit rule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#5B6B7F] hover:text-[#E5484D] transition"
                        title="Delete rule"
                        aria-label="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Photo Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-sm w-full bg-[#FFFFFF] rounded-[12px] overflow-hidden border border-[#DCE3EB] p-3">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="min-h-[48px] min-w-[48px] absolute top-2 right-2 z-10 flex items-center justify-center text-[#0F1B2D]"
              aria-label="Close photo"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Reference example defect"
              className="w-full h-auto max-h-[75vh] object-contain rounded-[8px] block mx-auto"
            />
            <p className="text-center text-[13px] text-[#5B6B7F] py-2">
              Customer Reference Example Photo
            </p>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#FFFFFF] rounded-[12px] border border-[#DCE3EB] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FDECEC] text-[#E5484D] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-[#0F1B2D]">Reset to Defaults?</h4>
                <p className="text-[13px] text-[#5B6B7F] mt-0.5">
                  All custom rules will be removed and inspection will follow standard QC rules.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 min-h-[48px] h-[48px] rounded-[12px] border border-[#DCE3EB] bg-[#FFFFFF] text-[#0F1B2D] font-semibold text-[14px] hover:bg-[#F5F8FB] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetToDefaults}
                className="flex-1 min-h-[48px] h-[48px] rounded-[12px] bg-[#E5484D] text-white font-semibold text-[14px] hover:bg-[#cf383d] transition shadow-xs"
              >
                Reset Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
