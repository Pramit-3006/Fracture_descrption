"use client";

import React from "react";
import { Cpu, Zap, Target, Sparkles, CheckCircle2 } from "lucide-react";

interface ModelOutput {
  model_name: str;
  confidence: number;
  inference_time_ms: number;
  bounding_boxes: any[];
  gcam_overlay_url?: string;
}

interface ModelBenchmarkingProps {
  models: ModelOutput[];
  onSelectModelGcam?: (gcamUrl: string) => void;
}

export default function ModelBenchmarking({ models = [], onSelectModelGcam }: ModelBenchmarkingProps) {
  // Sort models by accuracy (confidence) and speed (latency)
  const rankedModels = [...models].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-clinical-border pb-2.5">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-clinical-accent" />
          Multi-Model Competitive Benchmarking
        </h3>
        <span className="bg-clinical-accent/10 border border-clinical-accent/30 text-clinical-accent text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Bayesian Consensus Active
        </span>
      </div>

      {/* Model Benchmark Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[300px]">
        {rankedModels.map((model, idx) => {
          // Compute color scales for visual distinction
          const speedColor = model.inference_time_ms < 20 ? 'text-clinical-emerald' : model.inference_time_ms < 45 ? 'text-clinical-amber' : 'text-clinical-crimson';
          
          return (
            <div 
              key={model.model_name}
              className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-clinical-accent/40 transition cursor-pointer relative"
              onClick={() => onSelectModelGcam && model.gcam_overlay_url && onSelectModelGcam(model.gcam_overlay_url)}
            >
              {/* Rank Tag */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950 text-[10px] text-clinical-muted font-bold px-1.5 py-0.5 rounded border border-slate-800">
                {idx === 0 ? <CheckCircle2 className="w-3 h-3 text-clinical-emerald" /> : null}
                RANK #{idx + 1}
              </div>

              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                {model.model_name}
              </h4>
              
              <div className="mt-3 flex justify-between text-[11px] border-t border-slate-800 pt-2 text-clinical-muted">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Confidence</span>
                  <strong className="text-slate-100 font-mono text-xs">{(model.confidence * 100).toFixed(0)}%</strong>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="flex items-center gap-1 justify-end"><Zap className="w-3 h-3" /> Latency</span>
                  <strong className={`font-mono text-xs ${speedColor}`}>{model.inference_time_ms} ms</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ensemble Comparison Metrics */}
      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-clinical-muted">
        <strong className="text-slate-200 block mb-1">Ensemble Decision Strategy:</strong>
        We apply **Weighted Box Voting (WBV)** and **Bayesian Confidence updates** to fuse the bounding coordinates and classifications of YOLO, DETR, and Faster R-CNN networks. Individual model CAM weights are mapped inside MongoDB for ablation analytics. Click any model panel to display its standalone explainable activation map in the canvas view.
      </div>
    </div>
  );
}
