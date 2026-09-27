import React, { useState, useEffect } from 'react';
import {
  CustomerRule,
  GeminiInspectionResult,
  InspectionVerdict,
  UploadedGarmentPhoto,
} from './types/inspection';
import { Header } from './components/Header';
import { InspectScreen } from './components/InspectScreen';
import { ResultScreen } from './components/ResultScreen';
import { RulesScreen } from './components/RulesScreen';
import { BottomNav } from './components/BottomNav';
import {
  evaluateInspection,
  loadCustomerRules,
  saveCustomerRules,
} from './utils/verdictEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspect' | 'rules'>('inspect');
  const [currentScreen, setCurrentScreen] = useState<'inspect' | 'result'>('inspect');
  const [photos, setPhotos] = useState<UploadedGarmentPhoto[]>([]);
  const [selectedGarmentType, setSelectedGarmentType] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [customerRules, setCustomerRules] = useState<CustomerRule[]>([]);

  // Cached Gemini raw output to allow zero-API re-evaluations
  const [savedGeminiResult, setSavedGeminiResult] = useState<GeminiInspectionResult | null>(null);
  const [verdict, setVerdict] = useState<InspectionVerdict | null>(null);

  // Load customer rules from localStorage key "stitchcheck_rules" on mount with auto-migration
  useEffect(() => {
    const loaded = loadCustomerRules();
    setCustomerRules(loaded);
  }, []);

  const handleSaveRules = (updated: CustomerRule[]) => {
    setCustomerRules(updated);
    saveCustomerRules(updated);

    // If a cached Gemini result exists, automatically refresh the verdict
    if (savedGeminiResult) {
      const refreshed = evaluateInspection(
        savedGeminiResult,
        selectedGarmentType,
        updated
      );
      setVerdict(refreshed);
    }
  };

  const handleAddPhoto = (photo: UploadedGarmentPhoto) => {
    if (photos.length < 3) {
      setPhotos((prev) => [...prev, photo]);
      setErrorMessage(null);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleInspect = async () => {
    if (photos.length === 0) {
      setErrorMessage('Please capture or select at least 1 garment photo.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // If any enabled rules have example photos, add them to the Gemini request BEFORE garment photos
      const enabledReferenceRules = customerRules.filter(
        (r) => r.enabled && Boolean(r.examplePhoto)
      );

      const referenceExamples = enabledReferenceRules.map((r) => ({
        defectType: r.defectType,
        data: r.examplePhoto!,
        mimeType: 'image/jpeg',
      }));

      const payload = {
        images: photos.map((p) => ({
          data: p.base64,
          mimeType: 'image/jpeg',
        })),
        referenceExamples,
        garmentTypeHint: selectedGarmentType,
      };

      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server error occurred during inspection.');
      }

      const geminiResult: GeminiInspectionResult = data.result;
      setSavedGeminiResult(geminiResult);

      // Evaluate through the local Verdict Engine with customer rules and garment type
      const computedVerdict = evaluateInspection(
        geminiResult,
        selectedGarmentType,
        customerRules
      );

      setVerdict(computedVerdict);
      setCurrentScreen('result');
      setActiveTab('inspect');
    } catch (err: any) {
      console.error('Inspection failed:', err);
      let msg = err?.message || 'Failed to inspect garment. Please check lighting or network and try again.';
      try {
        if (typeof msg === 'string' && (msg.startsWith('{') || msg.includes('{"error"'))) {
          const jsonStart = msg.indexOf('{');
          const jsonEnd = msg.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const parsed = JSON.parse(msg.slice(jsonStart, jsonEnd + 1));
            if (parsed?.error?.message) {
              msg = parsed.error.message;
            } else if (parsed?.message) {
              msg = parsed.message;
            }
          }
        }
      } catch (_) {}
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. "Re-apply rules" must reload the latest rules from localStorage (not a stale copy) and recompute the verdict.
  const handleReapplyRules = () => {
    if (!savedGeminiResult) return;
    const freshRules = loadCustomerRules();
    setCustomerRules(freshRules);
    const recomputed = evaluateInspection(
      savedGeminiResult,
      selectedGarmentType,
      freshRules
    );
    setVerdict(recomputed);
  };

  // Inspect next garment: Resets photo state and returns to Screen 1
  const handleInspectNext = () => {
    setPhotos([]);
    setSavedGeminiResult(null);
    setVerdict(null);
    setErrorMessage(null);
    setCurrentScreen('inspect');
    setActiveTab('inspect');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FB] text-[#0F1B2D] flex flex-col font-sans selection:bg-[#2F6FED] selection:text-white">
      {/* Top Header: navy bar with FabriVis wordmark in white semibold */}
      <Header
        onOpenRules={() => setActiveTab('rules')}
        rulesCount={customerRules.filter((r) => r.enabled).length}
      />

      {/* Main Container - Mobile first, max-w-md centered, 16px page padding */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 flex flex-col">
        {activeTab === 'inspect' ? (
          currentScreen === 'inspect' ? (
            <InspectScreen
              photos={photos}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={handleRemovePhoto}
              selectedGarmentType={selectedGarmentType}
              onSelectGarmentType={setSelectedGarmentType}
              onInspect={handleInspect}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onClearError={() => setErrorMessage(null)}
            />
          ) : (
            verdict && (
              <ResultScreen
                verdict={verdict}
                photos={photos}
                onReapplyRules={handleReapplyRules}
                onInspectNext={handleInspectNext}
              />
            )
          )
        ) : (
          <RulesScreen
            rules={customerRules}
            onSaveRules={handleSaveRules}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation: Inspect | Rules */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        rulesCount={customerRules.filter((r) => r.enabled).length}
      />
    </div>
  );
}
