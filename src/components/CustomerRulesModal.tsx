import React, { useState } from 'react';
import { CustomerRule, DefectType, RuleResult, StoredGarmentType } from '../types/inspection';
import { normalizeGarmentType, normalizeDefectType } from '../utils/verdictEngine';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface CustomerRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: CustomerRule[];
  onSaveRules: (updated: CustomerRule[]) => void;
  onRulesUpdated?: () => void;
}

const PRESET_RULES: Omit<CustomerRule, 'id'>[] = [
  {
    name: 'Micro Fabric Spot Allowance',
    enabled: true,
    garmentTypes: ['any'],
    defectType: 'stain',
    maxSizeMm: 4,
    result: 'PASS',
    examplePhoto: null,
    note: 'Tiny spot under 4mm allowed for washing/spot cleaning',
  },
  {
    name: 'Minor Seam Opening Review',
    enabled: true,
    garmentTypes: ['any'],
    defectType: 'tear',
    maxSizeMm: 8,
    result: 'NEEDS_REVIEW',
    examplePhoto: null,
    note: 'Small seam separation (<8mm) can be re-stitched',
  },
];

export const CustomerRulesModal: React.FC<CustomerRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  onRulesUpdated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [defectType, setDefectType] = useState<DefectType>('stain');
  const [garmentType, setGarmentType] = useState<string>('any');
  const [maxSizeMm, setMaxSizeMm] = useState<string>('25');
  const [result, setResult] = useState<RuleResult>('PASS');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    onSaveRules(updated);
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    onSaveRules(updated);
    if (onRulesUpdated) onRulesUpdated();
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const normGarment = normalizeGarmentType(garmentType);
    const newRule: CustomerRule = {
      id: `rule-${Date.now()}`,
      name: name.trim(),
      enabled: true,
      garmentTypes: normGarment === 'any' ? ['any'] : [normGarment],
      defectType: normalizeDefectType(defectType),
      maxSizeMm: maxSizeMm ? Number(maxSizeMm) : null,
      result,
      examplePhoto: null,
      note: note.trim() || undefined,
    };

    const updated = [...rules, newRule];
    onSaveRules(updated);
    if (onRulesUpdated) onRulesUpdated();

    // Reset form
    setName('');
    setNote('');
    setMaxSizeMm('25');
    setShowAddForm(false);
  };

  const handleLoadPresets = () => {
    const newRules: CustomerRule[] = PRESET_RULES.map((preset, idx) => ({
      ...preset,
      id: `preset-${Date.now()}-${idx}`,
    }));
    const updated = [...rules, ...newRules];
    onSaveRules(updated);
    if (onRulesUpdated) onRulesUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 id="rules-modal-title" className="text-base font-bold flex items-center gap-2">
              Customer QC Rules
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {rules.length} configured
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Rules override default failures based on buyer/brand tolerances.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            aria-label="Close rules modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-98 text-white shadow-md shadow-cyan-900/20"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel New Rule' : 'Add Custom Rule'}</span>
            </button>
            {rules.length === 0 && (
              <button
                onClick={handleLoadPresets}
                className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 font-medium text-xs flex items-center justify-center gap-1.5 text-neutral-200 border border-neutral-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Presets</span>
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <form
              onSubmit={handleAddRule}
              className="p-4 rounded-xl bg-neutral-950/80 border border-cyan-800/50 space-y-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                New Quality Tolerance Rule
              </h3>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water mark under 25mm allowed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Defect Type
                  </label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value as DefectType)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="stain">Stain (Discoloration, spots, marks)</option>
                    <option value="tear">Tear (Rips, holes, seam splits)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Garment Target
                  </label>
                  <select
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="any">Any Garment</option>
                    <option value="t-shirt">T-shirt</option>
                    <option value="dress">Dress</option>
                    <option value="shirt">Shirt</option>
                    <option value="pants">Pants</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Max Size (mm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 25 (blank for any)"
                    value={maxSizeMm}
                    onChange={(e) => setMaxSizeMm(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Rule Decision
                  </label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as RuleResult)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                  >
                    <option value="PASS">PASS (Green)</option>
                    <option value="NEEDS_REVIEW">NEEDS REVIEW (Amber)</option>
                    <option value="FAIL">FAIL (Red)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acceptable evaporation spot"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Save Rule
                </button>
              </div>
            </form>
          )}

          {/* Rule items */}
          {rules.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-neutral-800 text-neutral-400">
              <HelpCircle className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-medium text-neutral-300">No customer rules set</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Currently running standard default QC: tears and stains FAIL, minor threads review.
              </p>
              <button
                onClick={handleLoadPresets}
                className="mt-3 text-xs text-cyan-400 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Click to load sample factory rules
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rules.map((rule) => {
                const badgeColor =
                  rule.result === 'PASS'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : rule.result === 'NEEDS_REVIEW'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30';

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border transition ${
                      rule.enabled
                        ? 'bg-neutral-800/80 border-neutral-700/80'
                        : 'bg-neutral-900/40 border-neutral-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-neutral-100">
                            {rule.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}
                          >
                            {rule.result.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                          <span className="capitalize text-neutral-300">
                            {rule.defectType.replace('_', ' ')}
                          </span>
                          <span>•</span>
                          <span>
                            {rule.maxSizeMm !== null
                              ? `≤ ${rule.maxSizeMm} mm`
                              : 'Any size'}
                          </span>
                          <span>•</span>
                          <span className="capitalize">
                            {rule.garmentTypes.join(', ')}
                          </span>
                        </div>

                        {rule.note && (
                          <p className="text-[11px] text-neutral-400 mt-1 italic">
                            "{rule.note}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                            rule.enabled ? 'bg-cyan-600' : 'bg-neutral-700'
                          }`}
                          aria-label={`Toggle rule ${rule.name}`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              rule.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800 transition"
                          title="Delete rule"
                          aria-label={`Delete rule ${rule.name}`}
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

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <span>Key: localStorage("stitchcheck_rules")</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
