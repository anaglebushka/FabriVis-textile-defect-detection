import React, { useState } from 'react';
import {
  EvaluatedDefect,
  InspectionVerdict,
  UploadedGarmentPhoto,
} from '../types/inspection';
import { PhotoWithBoxes } from './PhotoWithBoxes';
import { formatDefectType } from '../utils/imageUtils';
import {
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Layers,
  Ruler,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface ResultScreenProps {
  verdict: InspectionVerdict;
  photos: UploadedGarmentPhoto[];
  onReapplyRules: () => void;
  onInspectNext: () => void;
  onOpenRulesModal?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  verdict,
  photos,
  onReapplyRules,
  onInspectNext,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [activeDetailDefect, setActiveDetailDefect] = useState<EvaluatedDefect | null>(null);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Verdict banner styles - Clean & Certain specification
  const isPass = verdict.verdict === 'PASS';
  const isFail = verdict.verdict === 'FAIL';

  const bannerConfig = isPass
    ? {
        bg: 'bg-[#12B76A]',
        title: 'PASS',
        icon: <Check className="w-10 h-10 text-white stroke-[3.5]" />,
      }
    : isFail
    ? {
        bg: 'bg-[#E5484D]',
        title: 'FAIL',
        icon: <X className="w-10 h-10 text-white stroke-[3.5]" />,
      }
    : {
        bg: 'bg-[#F5A524]',
        title: 'NEEDS REVIEW',
        icon: <AlertTriangle className="w-10 h-10 text-white stroke-[3]" />,
      };

  const handleSelectDefect = (defect: EvaluatedDefect) => {
    setSelectedDefectId(defect.id);
    setActiveDetailDefect(defect);
    if (defect.image_index >= 0 && defect.image_index < photos.length) {
      setSelectedPhotoIndex(defect.image_index);
    }
  };

  const handleBoxClick = (defectId: string) => {
    const defect = verdict.evaluatedDefects.find((d) => d.id === defectId);
    if (defect) {
      handleSelectDefect(defect);
    }
  };

  return (
    <div className="space-y-4 pb-48 animate-in fade-in duration-150">
      {/* 1. Verdict Banner: full width, solid status color, white text, large icon + 40px word, reason line underneath */}
      <div
        className={`w-full p-6 rounded-[12px] flex flex-col items-center justify-center text-center ${bannerConfig.bg}`}
      >
        <div className="flex items-center justify-center gap-3">
          {bannerConfig.icon}
          <h2 className="text-[40px] font-bold uppercase text-white tracking-tight leading-none">
            {bannerConfig.title}
          </h2>
        </div>

        {/* Reason line underneath in white text */}
        <p className="text-white text-[15px] font-medium text-center mt-2.5 max-w-sm">
          {verdict.reason}
        </p>
      </div>

      {/* 2. Photo with Bounding Boxes */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-[#0F2A44]" />
            <h3 className="text-[15px] font-semibold text-[#0F1B2D]">
              Defect Map {photos.length > 1 ? `(${selectedPhotoIndex + 1}/${photos.length})` : ''}
            </h3>
          </div>

          {/* Status legend: never color alone, always icon + label */}
          <div className="flex items-center gap-3 text-[12px] font-medium text-[#5B6B7F]">
            <span className="flex items-center gap-1 text-[#E5484D]">
              <X className="w-3.5 h-3.5 stroke-[3]" /> FAIL
            </span>
            <span className="flex items-center gap-1 text-[#F5A524]">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" /> REVIEW
            </span>
            <span className="flex items-center gap-1 text-[#12B76A]">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> PASS
            </span>
          </div>
        </div>

        {photos[selectedPhotoIndex] && (
          <PhotoWithBoxes
            photoUrl={photos[selectedPhotoIndex].dataUrl}
            imageIndex={selectedPhotoIndex}
            defects={verdict.evaluatedDefects}
            selectedDefectId={selectedDefectId}
            onSelectDefect={handleBoxClick}
          />
        )}

        {/* Tap guide */}
        {verdict.evaluatedDefects.length > 0 && (
          <p className="text-[13px] text-center text-[#5B6B7F]">
            Tap any box on the photo or list below to view defect details
          </p>
        )}

        {/* Thumbnails switcher */}
        {photos.length > 1 && (
          <div className="flex items-center gap-2.5 pt-1 overflow-x-auto">
            {photos.map((photo, idx) => {
              const countForThisPhoto = verdict.evaluatedDefects.filter(
                (d) => d.image_index === idx
              ).length;
              return (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`min-h-[48px] min-w-[48px] relative w-16 h-16 rounded-[12px] overflow-hidden border transition-all flex-shrink-0 ${
                    selectedPhotoIndex === idx
                      ? 'border-[#2F6FED] ring-2 ring-[#2F6FED]'
                      : 'border-[#DCE3EB] opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Photo ${idx + 1}`}
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Angle ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 bg-[#0F2A44]/80 text-[10px] font-mono px-1 rounded text-white">
                    #{idx + 1}
                  </span>
                  {countForThisPhoto > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#E5484D] text-white font-bold text-[10px] flex items-center justify-center">
                      {countForThisPhoto}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Detected Defects List */}
      <div className="space-y-2.5">
        <h3 className="text-[18px] font-semibold text-[#0F1B2D]">
          Detected Defects ({verdict.evaluatedDefects.length})
        </h3>

        {verdict.evaluatedDefects.length === 0 ? (
          <div className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] text-center">
            <div className="w-10 h-10 rounded-full bg-[#E7F8EF] text-[#12B76A] mx-auto mb-2 flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="text-[15px] font-semibold text-[#0F1B2D]">Zero Defects Found</p>
            <p className="text-[13px] text-[#5B6B7F] mt-0.5">
              Fabric surface and seams meet quality standards.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {verdict.evaluatedDefects.map((defect) => {
              const isSelected = selectedDefectId === defect.id;

              // Never color alone: Tinted background with colored text and icon
              let badgeBg = 'bg-[#FDECEC] text-[#E5484D]';
              let StatusIcon = <X className="w-3.5 h-3.5 stroke-[3]" />;
              let statusLabel = 'FAIL';

              if (defect.isAllowedByCustomerRule || defect.verdict === 'PASS') {
                badgeBg = 'bg-[#E7F8EF] text-[#12B76A]';
                StatusIcon = <Check className="w-3.5 h-3.5 stroke-[3]" />;
                statusLabel = 'PASS (Rule)';
              } else if (defect.verdict === 'NEEDS_REVIEW') {
                badgeBg = 'bg-[#FFF6E5] text-[#F5A524]';
                StatusIcon = <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />;
                statusLabel = 'NEEDS REVIEW';
              }

              return (
                <div
                  key={defect.id}
                  onClick={() => handleSelectDefect(defect)}
                  className={`min-h-[48px] p-4 rounded-[12px] bg-[#FFFFFF] border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#2F6FED] ring-2 ring-[#2F6FED]'
                      : 'border-[#DCE3EB] hover:border-[#5B6B7F]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[15px] text-[#0F1B2D]">
                        {formatDefectType(defect.type)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-[4px] ${badgeBg}`}
                      >
                        {StatusIcon}
                        <span>{statusLabel}</span>
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5B6B7F] mt-1 line-clamp-1">
                      {defect.description}
                    </p>
                  </div>

                  <div className="min-h-[48px] flex items-center gap-1 text-[#2F6FED] text-[13px] font-semibold flex-shrink-0 pl-2">
                    <span>Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary note if present */}
      {verdict.summary && (
        <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] text-[13px] text-[#5B6B7F]">
          <span className="font-semibold text-[#0F1B2D] block mb-0.5">
            Inspection Summary
          </span>
          {verdict.summary}
        </div>
      )}

      {/* 4. Collapsible Debug Section */}
      <div className="rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsDebugOpen(!isDebugOpen)}
          className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left hover:bg-[#F5F8FB] transition"
          aria-expanded={isDebugOpen}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#F5F8FB] text-[#0F2A44] border border-[#DCE3EB]">
              DEBUG
            </span>
            <span className="text-[14px] font-semibold text-[#0F1B2D]">
              Rule Engine Diagnostics ({verdict.evaluatedDefects.length} defect{verdict.evaluatedDefects.length !== 1 ? 's' : ''})
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#5B6B7F] transition-transform duration-200 ${
              isDebugOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDebugOpen && (
          <div className="p-4 pt-2 border-t border-[#DCE3EB] space-y-4 text-[13px] bg-[#F5F8FB]">
            <div className="text-[12px] text-[#5B6B7F]">
              <span>Normalized Garment Type: </span>
              <strong className="text-[#0F1B2D] font-mono">{verdict.normalizedGarmentType}</strong>
              <span className="ml-1 text-[11px] text-[#5B6B7F]">
                (raw: "{verdict.effectiveGarmentType}")
              </span>
            </div>

            {verdict.evaluatedDefects.length === 0 ? (
              <p className="text-[13px] text-[#5B6B7F] italic">No defects detected on garment.</p>
            ) : (
              verdict.evaluatedDefects.map((defect, dIdx) => (
                <div
                  key={defect.id}
                  className="p-3.5 rounded-[8px] bg-[#FFFFFF] border border-[#DCE3EB] space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE3EB]">
                    <span className="font-bold text-[14px] text-[#0F1B2D]">
                      Defect #{dIdx + 1}: <span className="font-mono text-[#2F6FED]">{defect.normalizedType}</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                        defect.verdict === 'PASS'
                          ? 'bg-[#E7F8EF] text-[#12B76A]'
                          : defect.verdict === 'NEEDS_REVIEW'
                          ? 'bg-[#FFF6E5] text-[#F5A524]'
                          : 'bg-[#FDECEC] text-[#E5484D]'
                      }`}
                    >
                      {defect.verdict}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[12px] font-mono bg-[#F5F8FB] p-2 rounded">
                    <div>
                      <span className="text-[#5B6B7F] block text-[10px] font-sans">Normalized Type</span>
                      <strong className="text-[#0F1B2D]">{defect.normalizedType}</strong>
                    </div>
                    <div>
                      <span className="text-[#5B6B7F] block text-[10px] font-sans">Size (mm)</span>
                      <strong className="text-[#0F1B2D]">{defect.size_mm ?? 'missing'}</strong>
                    </div>
                    <div>
                      <span className="text-[#5B6B7F] block text-[10px] font-sans">Garment</span>
                      <strong className="text-[#0F1B2D]">{defect.normalizedGarmentType}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#5B6B7F] uppercase tracking-wider block">
                      Customer Rules Breakdown:
                    </span>
                    {(!defect.ruleEvaluations || defect.ruleEvaluations.length === 0) ? (
                      <p className="text-[12px] text-[#5B6B7F] italic">No enabled customer rules configured.</p>
                    ) : (
                      defect.ruleEvaluations.map((re) => (
                        <div
                          key={re.ruleId}
                          className="flex items-start justify-between gap-2 text-[12px] p-2.5 rounded border border-[#DCE3EB] bg-[#FFFFFF]"
                        >
                          <div className="flex-1">
                            <span className="font-semibold text-[#0F1B2D] block">
                              {re.ruleName}
                            </span>
                            {re.details && (
                              <span className="text-[11px] text-[#5B6B7F] font-mono block mt-0.5">
                                {re.details}
                              </span>
                            )}
                          </div>
                          <div>
                            {re.matched ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#12B76A] bg-[#E7F8EF] px-2 py-0.5 rounded">
                                <Check className="w-3 h-3 stroke-[3]" /> Matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E5484D] bg-[#FDECEC] px-2 py-0.5 rounded">
                                <X className="w-3 h-3 stroke-[3]" /> Failed: {re.failedCondition}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-1 text-[12px] text-[#5B6B7F]">
                    <span>Outcome Applied: </span>
                    <strong className="text-[#0F1B2D]">{defect.ruleApplied}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom actions: primary action (56px) + Re-apply rules (48px) */}
      <div className="fixed bottom-[64px] left-0 right-0 z-30 bg-[#F5F8FB]/95 backdrop-blur-xs border-t border-[#DCE3EB] p-4 space-y-2">
        <div className="max-w-md mx-auto space-y-2">
          {/* Primary Action Button: full width, 56px tall, primary color, white text, 12px radius */}
          <button
            type="button"
            onClick={onInspectNext}
            className="w-full h-[56px] min-h-[56px] rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] active:bg-[#091b2c] text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition shadow-xs"
          >
            <PlusCircle className="w-5 h-5 text-white" />
            <span>Inspect Next Garment</span>
          </button>

          {/* Re-apply rules button: reloads latest rules from localStorage and recomputes */}
          <button
            type="button"
            onClick={onReapplyRules}
            className="w-full min-h-[48px] h-[48px] rounded-[12px] bg-[#FFFFFF] hover:bg-[#F5F8FB] border border-[#DCE3EB] text-[#0F1B2D] font-semibold text-[14px] flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4 text-[#5B6B7F]" />
            <span>Re-apply rules</span>
          </button>
        </div>
      </div>

      {/* Defect Details Sheet */}
      {activeDetailDefect && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveDetailDefect(null)}
        >
          <div
            className="w-full max-w-md bg-[#FFFFFF] border border-[#DCE3EB] rounded-t-[12px] sm:rounded-[12px] p-5 text-[#0F1B2D] space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#DCE3EB] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-semibold text-[#0F1B2D]">
                  {formatDefectType(activeDetailDefect.type)} Details
                </h3>
              </div>
              <button
                onClick={() => setActiveDetailDefect(null)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center text-[#5B6B7F] hover:text-[#0F1B2D] transition"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-[12px] bg-[#F5F8FB] border border-[#DCE3EB] text-[13px] text-[#0F1B2D]">
              <span className="text-[11px] uppercase font-bold text-[#5B6B7F] block mb-1">
                Visual Observation
              </span>
              {activeDetailDefect.description}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div className="p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Estimated Size
                </span>
                <span className="text-[15px] font-bold text-[#0F1B2D] font-mono mt-0.5 block">
                  ~{activeDetailDefect.size_mm} mm
                </span>
              </div>

              <div className="p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Photo Index
                </span>
                <span className="text-[15px] font-semibold text-[#0F1B2D] mt-0.5 block">
                  Photo #{activeDetailDefect.image_index + 1}
                </span>
              </div>

              <div className="p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Location
                </span>
                <span className="text-[14px] font-semibold text-[#0F1B2D] mt-0.5 block">
                  {activeDetailDefect.location || 'Garment surface'}
                </span>
              </div>

              <div className="p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Confidence
                </span>
                <span className="text-[14px] font-semibold text-[#0F1B2D] mt-0.5 block">
                  {Math.round(activeDetailDefect.confidence * 100)}%
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Sizing Basis
                </span>
                <span className="text-[13px] font-semibold text-[#0F1B2D] mt-0.5 flex items-center gap-1.5 capitalize">
                  <Ruler className="w-4 h-4 text-[#2F6FED]" />
                  {activeDetailDefect.size_basis.replace('_', ' ')}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB]">
                <span className="text-[11px] text-[#5B6B7F] uppercase block font-medium">
                  Rule Applied
                </span>
                <span className="text-[13px] font-medium text-[#0F1B2D] mt-0.5 block">
                  {activeDetailDefect.ruleApplied}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveDetailDefect(null)}
              className="w-full min-h-[48px] h-[48px] rounded-[12px] bg-[#0F2A44] hover:bg-[#1a3f65] text-white font-semibold text-[14px] transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
