"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Shield, User, FileText, ChevronRight, 
  Activity, Zap, Compass, Ruler, HelpCircle, FileCheck
} from "lucide-react";
import DicomViewer from "@/components/DicomViewer";
import ModelBenchmarking from "@/components/ModelBenchmarking";
import ComparativePanel from "@/components/ComparativePanel";
import ReportGenerator from "@/components/ReportGenerator";

export default function WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Search queries
  const scanId = searchParams.get("scan_id") || "demo_scan_102";
  const patientId = searchParams.get("patient_id") || "PAT-87291";

  // Auth state
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  // Clinical records
  const [patient, setPatient] = useState<any>({
    id: patientId,
    name: "Eleanor Vance (Demo Case)",
    dob: "1984-06-12",
    gender: "F"
  });
  
  const [scan, setScan] = useState<any>({
    id: scanId,
    scan_type: "WRIST",
    image_url: "/static/demo_xray.jpg", // Default placeholder
    dicom_metadata: {
      PatientName: "Eleanor Vance",
      PatientID: patientId,
      PixelSpacing: [0.139, 0.139],
      Modality: "DX",
      Manufacturer: "Siemens Medical Systems",
      KVP: 72.0,
      ExposureInuAs: 100.0
    }
  });

  // Diagnostics and Metrics State
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [mmPerPixel, setMmPerPixel] = useState<number>(0.139);
  const [activeGcam, setActiveGcam] = useState<string>("");
  
  // Human ground truth sandbox state
  const [humanPolygon, setHumanPolygon] = useState<List<List<float>>>([
    [250, 180], [350, 180], [350, 240], [250, 240] // Default ground truth area
  ]);
  const [hasHumanPolygon, setHasHumanPolygon] = useState<boolean>(true);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    const activeToken = localStorage.getItem("osteo_token");
    const activeUser = localStorage.getItem("osteo_username");
    
    if (!activeToken) {
      router.push("/");
      return;
    }
    
    setToken(activeToken);
    setUsername(activeUser || "Radiologist");
  }, []);

  // Fetch or simulate Scan & AI analysis
  useEffect(() => {
    if (!token) return;
    
    const initializeWorkspace = async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Attempt to load scan details from API
        const scanRes = await fetch(`http://localhost:8000/api/v1/patients/scans`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (scanRes.ok) {
          const scansList = await scanRes.json();
          const activeScan = scansList.find((s: any) => s.id === scanId);
          if (activeScan) {
            setScan(activeScan);
            if (activeScan.dicom_metadata?.PixelSpacing) {
              setMmPerPixel(activeScan.dicom_metadata.PixelSpacing[0]);
            }
          }
        }

        // Step 2: Attempt to retrieve matching patient profile
        const patRes = await fetch(`http://localhost:8000/api/v1/patients/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (patRes.ok) {
          const patList = await patRes.json();
          const activePat = patList.find((p: any) => p.id === patientId);
          if (activePat) {
            setPatient(activePat);
          }
        }

        // Step 3: Trigger full AI diagnostics pipeline
        await triggerAiAnalysis();
      } catch (err: any) {
        console.error("Workspace init failed", err);
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, [token, scanId]);

  const triggerAiAnalysis = async (humanPolyOverride?: any) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/analysis/run/${scanId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          human_bbox: null,
          human_polygon: humanPolyOverride || (hasHumanPolygon ? humanPolygon : null)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Clinical analysis trigger failed.");
      }

      const data = await res.json();
      setAnalysis(data);
      if (data.xai?.gcam_url) {
        setActiveGcam(data.xai.gcam_url);
      }
    } catch (e: any) {
      setError(e.message || "Failed to execute deep learning models.");
    }
  };

  const handleCalibrationChange = (newVal: number) => {
    setMmPerPixel(newVal);
  };

  const handleDeformityRecalculate = (angle: number, disp: number) => {
    if (analysis) {
      setAnalysis({
        ...analysis,
        deformity: {
          ...analysis.deformity,
          angular_deformity_deg: angle,
          displacement_mm: disp
        }
      });
    }
  };

  // Mock drawing ground truth manually
  const handleToggleHumanAnnotation = () => {
    setHasHumanPolygon(!hasHumanPolygon);
  };

  const handleTriggerComparisonStudy = async () => {
    if (!hasHumanPolygon) return;
    await triggerAiAnalysis(humanPolygon);
    alert("Human ground truth overlaid. Statistics matrices updated successfully.");
  };

  // Helper color tags for urgency
  const getUrgencyBadge = (urgency: string) => {
    switch(urgency) {
      case "EMERGENCY": return "bg-clinical-crimson/15 text-clinical-crimson border-clinical-crimson/40";
      case "HIGH": return "bg-clinical-amber/15 text-clinical-amber border-clinical-amber/40";
      case "MEDIUM": return "bg-clinical-accent/10 text-clinical-accent border-clinical-accent/30";
      default: return "bg-clinical-emerald/15 text-clinical-emerald border-clinical-emerald/40";
    }
  };

  return (
    <div className="min-h-screen bg-clinical-bg text-slate-100 flex flex-col font-sans">
      {/* Navigation and patient path */}
      <nav className="bg-slate-900 border-b border-clinical-border px-4 py-3 flex justify-between items-center shadow-lg text-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard")}
            className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded transition text-clinical-muted hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5 text-clinical-muted">
            <span className="cursor-pointer hover:text-slate-200" onClick={() => router.push("/dashboard")}>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200 font-bold uppercase">Workstation</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-clinical-emerald flex items-center gap-1">
            <Shield className="w-4 h-4" /> HIPAA SAFE MODE ACTIVE
          </span>
          <span className="text-clinical-muted">Active Session: <strong>{username}</strong></span>
        </div>
      </nav>

      {/* Primary Workstation Flex Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* Left Hand: Patient Card, Clinical scorecards */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Patient demographics */}
          <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-accent border-b border-clinical-border pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" /> Patient Demographics
            </h3>
            
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-clinical-muted">Full Name:</span>
                <strong className="text-slate-200">{patient.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-clinical-muted">Hospital ID:</span>
                <strong className="text-clinical-accent font-mono">{patient.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-clinical-muted">Date of Birth:</span>
                <strong className="text-slate-200">{patient.dob}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-clinical-muted">Gender:</span>
                <strong className="text-slate-200">{patient.gender === "M" ? "Male (M)" : "Female (F)"}</strong>
              </div>
            </div>
          </div>

          {/* AI Clinical Findings scorecards */}
          <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl flex flex-col gap-3 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-accent border-b border-clinical-border pb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> AI Diagnostics Index
            </h3>

            {analysis ? (
              <div className="flex flex-col gap-3 text-xs">
                {/* Triage Badge */}
                <div className={`p-2 rounded-lg border text-center font-bold ${getUrgencyBadge(analysis.detected_type === "None" ? "LOW" : analysis.detected_type)}`}>
                  {analysis.fracture_detected ? `${analysis.detected_type} TRIAGE ALARM` : "INTACT - LOW TRIAGE"}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Fracture Detected:</span>
                  <strong className={`font-bold ${analysis.fracture_detected ? 'text-clinical-crimson' : 'text-clinical-emerald'}`}>
                    {analysis.fracture_detected ? "YES" : "NO"}
                  </strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Classification:</span>
                  <strong className="text-slate-200">{analysis.detected_type}</strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Displacement Distance:</span>
                  <strong className="text-slate-200 font-mono">{analysis.deformity.displacement_mm} mm</strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Angular Deformity:</span>
                  <strong className="text-slate-200 font-mono">{analysis.deformity.angular_deformity_deg}°</strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Cortical Disruption:</span>
                  <strong className="text-slate-200 font-mono">{analysis.deformity.cortical_disruption_pct}%</strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex justify-between items-center">
                  <span className="text-clinical-muted">Bayesian Confidence:</span>
                  <strong className="text-clinical-accent font-mono">{(analysis.overall_confidence * 100).toFixed(0)}%</strong>
                </div>

                {/* DICOM scan header readout */}
                <div className="mt-2 p-2 bg-slate-950/60 rounded border border-slate-900 text-[10px] text-clinical-muted flex flex-col gap-1">
                  <span>Modality: <b>Digital Radiography (DX)</b></span>
                  <span>Manufacturer: <b>{scan.dicom_metadata?.Manufacturer || "Siemens Medical"}</b></span>
                  <span>KVP / Focus: <b>{scan.dicom_metadata?.KVP || "72.0"} kVp</b></span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex justify-center items-center text-clinical-muted italic text-center p-4">
                Diagnostic matrices loaded. Triggering deep inference...
              </div>
            )}
          </div>
        </div>

        {/* Center Section: Primary Workstation Canvas Viewer */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <DicomViewer
            imageUrl={`http://localhost:8000${scan.image_url}`}
            enhancedUrl={analysis?.enhanced_image_url ? `http://localhost:8000${analysis.enhanced_image_url}` : undefined}
            gcamUrl={activeGcam ? `http://localhost:8000${activeGcam}` : undefined}
            segmentationContours={analysis?.models_benchmark[0]?.segmentation_mask ? [analysis.models_benchmark[0].segmentation_mask] : []}
            boundingBoxes={analysis?.models_benchmark ? [analysis.models_benchmark[0].bounding_boxes[0]] : []}
            mmPerPixel={mmPerPixel}
            onCalibrationChange={handleCalibrationChange}
            onDeformityCalculate={handleDeformityRecalculate}
          />
          
          {/* Explainable text observations panel */}
          {analysis && (
            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1">
                <Compass className="w-4 h-4 text-purple-400" /> Explainable AI (XAI) Local Interpretations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-clinical-muted mt-1">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                  <strong className="text-purple-400 block mb-1">LIME Decision Path:</strong>
                  {analysis.xai.lime_explanation}
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                  <strong className="text-pink-400 block mb-1">SHAP Force Indicators:</strong>
                  {analysis.xai.shap_explanation}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Multi-Model, Comparative Study, Exporters */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[85vh] pr-1">
          {/* Multi-model list */}
          {analysis && (
            <ModelBenchmarking
              models={analysis.models_benchmark}
              onSelectModelGcam={(gcamUrl) => setActiveGcam(gcamUrl)}
            />
          )}

          {/* Comparative study sandbox */}
          <ComparativePanel
            dice={analysis?.comparison_metrics?.dice_coefficient || 0}
            iou={analysis?.comparison_metrics?.iou || 0}
            precision={analysis?.comparison_metrics?.precision || 0}
            recall={analysis?.comparison_metrics?.recall || 0}
            sensitivity={analysis?.comparison_metrics?.sensitivity || 0}
            specificity={analysis?.comparison_metrics?.specificity || 0}
            onTriggerComparison={handleTriggerComparisonStudy}
            hasHumanPolygon={hasHumanPolygon}
          />

          {/* PDF Report compile panel */}
          {analysis && (
            <ReportGenerator
              scanId={scanId}
              patientId={patientId}
              patientName={patient.name}
              fractureDetected={analysis.fracture_detected}
              displacementMm={analysis.deformity.displacement_mm}
              angularDeformityDeg={analysis.deformity.angular_deformity_deg}
              aiConfidence={analysis.overall_confidence}
              ensembleAgreement={analysis.ensemble_agreement}
              backendUrl="http://localhost:8000"
              token={token}
            />
          )}
        </div>
      </div>
    </div>
  );
}
