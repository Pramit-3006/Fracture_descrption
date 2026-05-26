"use client";

import React, { useState } from "react";
import { UserCheck, ShieldAlert, Binary, CheckCircle2, AlertTriangle, Play } from "lucide-react";

interface ComparativePanelProps {
  dice: number;
  iou: number;
  precision: number;
  recall: number;
  sensitivity: number;
  specificity: number;
  onTriggerComparison: () => void;
  hasHumanPolygon: boolean;
}

export default function ComparativePanel({
  dice,
  iou,
  precision,
  recall,
  sensitivity,
  specificity,
  onTriggerComparison,
  hasHumanPolygon
}: ComparativePanelProps) {
  const [showErrorOverlays, setShowErrorOverlays] = useState<boolean>(false);

  // Compute color based on agreement (Dice > 90% is excellent)
  const scoreColor = dice >= 0.90 ? 'text-clinical-emerald' : dice >= 0.75 ? 'text-clinical-amber' : 'text-clinical-crimson';
  const scoreStatus = dice >= 0.90 ? 'Excellent Agreement' : dice >= 0.75 ? 'Moderate Concordance' : 'Low Concordance - Manual Edit Recommended';

  return (
    <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-clinical-border pb-2.5">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-clinical-accent" />
          Human vs AI Comparative Study
        </h3>
        <span className="bg-slate-900 border border-slate-800 text-clinical-muted text-[10px] px-2 py-0.5 rounded font-mono">
          dice-iou-engine v1.0
        </span>
      </div>

      {/* Benchmark Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase">Dice Coefficient</span>
          <strong className={`text-xl font-mono block mt-1 ${scoreColor}`}>
            {dice > 0 ? dice.toFixed(4) : "0.0000"}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase">Intersection over Union</span>
          <strong className="text-xl font-mono text-slate-200 block mt-1">
            {iou > 0 ? iou.toFixed(4) : "0.0000"}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase">Precision</span>
          <strong className="text-xl font-mono text-slate-200 block mt-1">
            {precision > 0 ? precision.toFixed(4) : "0.0000"}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase">Recall / Sensitivity</span>
          <strong className="text-xl font-mono text-slate-200 block mt-1">
            {recall > 0 ? recall.toFixed(4) : "0.0000"}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase">Specificity</span>
          <strong className="text-xl font-mono text-slate-200 block mt-1">
            {specificity > 0 ? specificity.toFixed(4) : "0.0000"}
          </strong>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-center items-center">
          <span className="text-[10px] text-clinical-muted block font-medium uppercase mb-1">Error Overlay</span>
          <button
            onClick={() => setShowErrorOverlays(!showErrorOverlays)}
            disabled={dice === 0}
            className={`w-full py-1 text-[10px] font-bold rounded uppercase transition ${
              dice === 0 ? 'bg-slate-950 text-slate-700 cursor-not-allowed' : showErrorOverlays ? 'bg-clinical-crimson text-white' : 'bg-slate-850 text-clinical-muted hover:bg-slate-800 border border-slate-700'
            }`}
          >
            {showErrorOverlays ? "Hide Error Diff" : "Show Error Diff"}
          </button>
        </div>
      </div>

      {/* Comparison Workspace Trigger Section */}
      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 flex items-center gap-1">
            <Binary className="w-3.5 h-3.5 text-clinical-accent animate-pulse" />
            Human Annotation Status:
          </span>
          <span className={`font-bold ${hasHumanPolygon ? "text-clinical-emerald" : "text-clinical-amber"}`}>
            {hasHumanPolygon ? "GROUND TRUTH READY" : "NO GROUND TRUTH ANNOTATED"}
          </span>
        </div>
        
        <p className="text-[10px] text-clinical-muted leading-relaxed">
          {hasHumanPolygon 
            ? "Ground truth polygon is loaded from active workspace coordinates. Click 'Compare' to render sub-pixel Dice, Sensitivity, and Specificity metrics." 
            : "Draw a custom closed polygon on the canvas viewer utilizing the Cobb Angle / Cobb Vector tools to establish Ground Truth margins."}
        </p>

        <button
          onClick={onTriggerComparison}
          disabled={!hasHumanPolygon}
          className={`w-full py-2 mt-1.5 text-xs font-bold rounded-lg uppercase flex items-center justify-center gap-1 transition ${
            hasHumanPolygon ? 'bg-clinical-accent text-slate-950 hover:bg-sky-400 font-extrabold shadow-clinical-glow' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-900'
          }`}
        >
          <Play className="w-3.5 h-3.5" fill="currentColor" /> Compute Human-vs-AI Matrix
        </button>
      </div>

      {/* Concordance status bar */}
      {dice > 0 && (
        <div className="flex gap-2 items-center text-xs px-3 py-2 bg-slate-950 border border-slate-900 rounded-md">
          {dice >= 0.85 ? (
            <CheckCircle2 className="w-4 h-4 text-clinical-emerald shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-clinical-amber shrink-0" />
          )}
          <span className="text-clinical-muted">Concordance: <strong className="text-slate-200">{scoreStatus}</strong></span>
        </div>
      )}
    </div>
  );
}
