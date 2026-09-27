import React, { useState } from 'react';
import { EvaluatedDefect } from '../types/inspection';
import { formatDefectType } from '../utils/imageUtils';
import { Check, X, AlertTriangle } from 'lucide-react';

interface PhotoWithBoxesProps {
  photoUrl: string;
  imageIndex: number;
  defects: EvaluatedDefect[];
  selectedDefectId?: string | null;
  onSelectDefect?: (defectId: string) => void;
  isScanning?: boolean;
}

export const PhotoWithBoxes: React.FC<PhotoWithBoxesProps> = ({
  photoUrl,
  imageIndex,
  defects,
  selectedDefectId,
  onSelectDefect,
  isScanning = false,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Filter defects for this photo index
  const photoDefects = defects.filter(
    (d) =>
      d.image_index === imageIndex && (d.type === 'stain' || d.type === 'tear')
  );

  return (
    <div className="relative w-full rounded-[12px] overflow-hidden bg-[#FFFFFF] border border-[#DCE3EB] select-none flex items-center justify-center p-1">
      {/* Container that strictly wraps the exact rendered image width and height */}
      <div className="relative inline-block max-w-full">
        {/* The base image */}
        <img
          src={photoUrl}
          alt={`Garment photo ${imageIndex + 1}`}
          onLoad={() => setImgLoaded(true)}
          className="max-w-full max-h-[65vh] h-auto w-auto object-contain block mx-auto rounded-[8px]"
        />

        {/* Scanning status overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-[#0F2A44]/60 backdrop-blur-[1px] rounded-[8px] flex flex-col items-center justify-center overflow-hidden z-20">
            {/* Animated laser scan line */}
            <div className="absolute left-0 right-0 h-1 bg-[#2F6FED] animate-[scan_2s_ease-in-out_infinite]" />

            {/* Status card */}
            <div className="px-5 py-3 rounded-[12px] bg-[#FFFFFF] border border-[#DCE3EB] flex items-center space-x-2 text-[#0F1B2D]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F6FED] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2F6FED]"></span>
              </span>
              <span className="text-[15px] font-semibold">
                Inspecting garment…
              </span>
            </div>
          </div>
        )}

        {/* Bounding box overlays */}
        {!isScanning &&
          imgLoaded &&
          photoDefects.map((defect) => {
            const [ymin, xmin, ymax, xmax] = defect.box_2d || [0, 0, 0, 0];

            // Normalized 0-1000 to percentages relative to this exact image
            const topPct = Math.max(0, Math.min(100, (ymin / 1000) * 100));
            const leftPct = Math.max(0, Math.min(100, (xmin / 1000) * 100));
            const heightPct = Math.max(
              3,
              Math.min(100 - topPct, ((ymax - ymin) / 1000) * 100)
            );
            const widthPct = Math.max(
              3,
              Math.min(100 - leftPct, ((xmax - xmin) / 1000) * 100)
            );

            const isSelected = selectedDefectId === defect.id;

            // Strict status styling:
            // FAIL (default unallowed): 3px solid #E5484D
            // ALLOWED (PASS via rule): 3px dashed #12B76A
            // NEEDS REVIEW: 3px solid #F5A524
            let borderClass = 'border-[3px] border-[#E5484D] bg-[#E5484D]/15';
            let badgeBg = 'bg-[#E5484D] text-white';
            let StatusIcon = <X className="w-3 h-3 stroke-[3]" />;

            if (defect.isAllowedByCustomerRule || defect.verdict === 'PASS') {
              borderClass = 'border-[3px] border-dashed border-[#12B76A] bg-[#12B76A]/15';
              badgeBg = 'bg-[#12B76A] text-white';
              StatusIcon = <Check className="w-3 h-3 stroke-[3]" />;
            } else if (defect.verdict === 'NEEDS_REVIEW') {
              borderClass = 'border-[3px] border-[#F5A524] bg-[#F5A524]/15';
              badgeBg = 'bg-[#F5A524] text-white';
              StatusIcon = <AlertTriangle className="w-3 h-3 stroke-[2.5]" />;
            }

            const placeLabelBelow = topPct < 8;

            return (
              <div
                key={defect.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectDefect) onSelectDefect(defect.id);
                }}
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute cursor-pointer transition-all duration-150 ${borderClass} ${
                  isSelected
                    ? 'ring-4 ring-[#2F6FED] z-30'
                    : 'hover:opacity-90 z-20'
                }`}
                title="Tap to view defect details"
              >
                {/* Never color alone: Badge contains icon + defect label */}
                <div
                  className={`absolute ${
                    placeLabelBelow ? 'top-full mt-1' : '-top-6'
                  } left-0 whitespace-nowrap z-30 pointer-events-none`}
                >
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold tracking-tight ${badgeBg}`}
                  >
                    {StatusIcon}
                    <span>{formatDefectType(defect.type)}</span>
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
