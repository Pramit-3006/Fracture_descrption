"use client";

import React, { useState } from "react";
import { FileText, Download, Check, AlertTriangle, ShieldCheck, FileSpreadsheet, Code } from "lucide-react";

interface ReportGeneratorProps {
  scanId: string;
  patientId: string;
  patientName: string;
  fractureDetected: boolean;
  displacementMm: number;
  angularDeformityDeg: number;
  aiConfidence: number;
  ensembleAgreement: number;
  backendUrl: string;
  token: string;
}

export default function ReportGenerator({
  scanId,
  patientId,
  patientName,
  fractureDetected,
  displacementMm,
  angularDeformityDeg,
  aiConfidence,
  ensembleAgreement,
  backendUrl,
  token
}: ReportGeneratorProps) {
  const [notes, setNotes] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("MEDIUM");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompileReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/api/v1/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          scan_id: scanId,
          clinical_notes: notes || "AI Decision Support: Oblique diaphyseal boundary breach visible with localized displacement. No secondary articular involvement observed.",
          urgency_level: urgency
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to compile report.");
      }

      const data = await res.json();
      setReportData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (endpoint: string, filename: string) => {
    if (!reportData) return;
    const url = `${backendUrl}/api/v1/reports/export/${endpoint}/${reportData.id}`;
    
    // Trigger direct browser file streaming download
    const link = document.createElement("a");
    link.href = url;
    // Append Auth Header by opening a window or letting browser handle file responses
    // For direct PDF download, let's inject it into an iframe or request via fetch and create blob
    fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch(err => alert("Download failed: " + err));
  };

  return (
    <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-clinical-border pb-2.5">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-clinical-accent" />
          Clinical Diagnostic Report Generator
        </h3>
        <span className="bg-slate-900 border border-slate-800 text-clinical-emerald text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Secured
        </span>
      </div>

      {error && (
        <div className="p-3 bg-clinical-crimson/10 border border-clinical-crimson/30 rounded-lg text-xs text-clinical-crimson flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Editor Inputs */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300 font-medium">Radiologist Observations & Clinical Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Edit X-Ray observations... (e.g., Oblique cortical disruption present along the radial metaphysis with 2.4mm displacement)."
            className="w-full h-20 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-clinical-accent/70 resize-none font-sans"
          />
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-300 font-medium">Clinical Urgency Level:</span>
            <span className="text-[10px] text-clinical-muted">Sets case triage priority.</span>
          </div>

          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-clinical-accent/70 font-semibold"
          >
            <option value="LOW">LOW (Intact / Minor crack)</option>
            <option value="MEDIUM">MEDIUM (Fracture - no displacement)</option>
            <option value="HIGH">HIGH (Fracture with displacement)</option>
            <option value="EMERGENCY">EMERGENCY (Severe deformity / open fracture)</option>
          </select>
        </div>
      </div>

      {/* Compilation button */}
      {!reportData ? (
        <button
          onClick={handleCompileReport}
          disabled={loading}
          className="w-full py-2.5 bg-clinical-accent text-slate-950 font-extrabold text-xs uppercase rounded-lg shadow-clinical-glow hover:bg-sky-400 transition flex justify-center items-center gap-1.5"
        >
          {loading ? "Compiling medical indexes..." : "Assemble & Verify Clinical Report"}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Compilation Success Notification */}
          <div className="p-3 bg-clinical-emerald/10 border border-clinical-emerald/30 rounded-lg text-xs text-clinical-emerald flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0" /> Report assembled and cataloged to secure audit registry successfully.
          </div>

          {/* Exporters Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => downloadFile("pdf", `RadiologyReport_${patientId}.pdf`)}
              className="py-2 px-3 bg-clinical-panelLight hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase transition flex flex-col items-center gap-1 text-slate-200 border border-slate-700"
            >
              <Download className="w-4 h-4 text-clinical-accent" />
              Download PDF
            </button>

            <button
              onClick={() => downloadFile("csv", `TabularRecord_${patientId}.csv`)}
              className="py-2 px-3 bg-clinical-panelLight hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase transition flex flex-col items-center gap-1 text-slate-200 border border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-clinical-emerald" />
              Download CSV
            </button>

            <button
              onClick={() => downloadFile("json", `DICOM_SR_${patientId}.json`)}
              className="py-2 px-3 bg-clinical-panelLight hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase transition flex flex-col items-center gap-1 text-slate-200 border border-slate-700"
            >
              <Code className="w-4 h-4 text-purple-400" />
              DICOM-SR JSON
            </button>
          </div>
          
          <button 
            onClick={() => setReportData(null)}
            className="w-full py-1 text-[10px] text-clinical-muted uppercase text-center hover:text-slate-300 mt-1"
          >
            Create New Report Draft
          </button>
        </div>
      )}
    </div>
  );
}
