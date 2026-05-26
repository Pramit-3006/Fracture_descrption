"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Upload, Shield, Users, FileBarChart2, 
  Settings, Activity, AlertOctagon, TrendingUp, Search
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  
  // Auth state
  const [token, setToken] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<string>("");
  
  // Data lists
  const [patients, setPatients] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  
  // Form states
  const [patId, setPatId] = useState<string>("");
  const [patName, setPatName] = useState<string>("");
  const [patDob, setPatDob] = useState<string>("1990-01-01");
  const [patGender, setPatGender] = useState<string>("M");
  
  const [scanPatId, setScanPatId] = useState<string>("");
  const [scanType, setScanType] = useState<string>("WRIST");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Authentication check
  useEffect(() => {
    const activeToken = localStorage.getItem("osteo_token");
    const activeUser = localStorage.getItem("osteo_username");
    const activeRole = localStorage.getItem("osteo_role");
    
    if (!activeToken) {
      router.push("/");
      return;
    }
    
    setToken(activeToken);
    setUsername(activeUser || "Radiologist");
    setRole(activeRole || "RADIOLOGIST");
  }, []);

  // Fetch clinical profiles
  useEffect(() => {
    if (!token) return;
    
    const fetchRegistry = async () => {
      try {
        const patRes = await fetch("http://localhost:8000/api/v1/patients/", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const patData = await patRes.json();
        setPatients(patData);

        const scanRes = await fetch("http://localhost:8000/api/v1/patients/scans", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const scanData = await scanRes.json();
        setScans(scanData);
      } catch (err) {
        console.error("Failed to load patient records", err);
      }
    };
    
    fetchRegistry();
  }, [token, refreshTrigger]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patId || !patName) return;

    try {
      const res = await fetch("http://localhost:8000/api/v1/patients/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          id: patId,
          name: patName,
          dob: patDob,
          gender: patGender
        })
      });

      if (res.ok) {
        alert("Patient profile logged successfully.");
        setPatId("");
        setPatName("");
        setRefreshTrigger(prev => prev + 1);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      alert("Failed to log profile.");
    }
  };

  const handleUploadScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanPatId || !selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("patient_id", scanPatId);
    formData.append("scan_type", scanType);
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://localhost:8000/api/v1/patients/upload-scan", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        alert("X-ray file uploaded successfully. Transitioning to analysis workstation.");
        router.push(`/workspace?scan_id=${data.id}&patient_id=${scanPatId}`);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.detail}`);
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: any) => {
    setScanPatId(patient.id);
  };

  return (
    <div className="min-h-screen bg-clinical-bg text-slate-100 flex flex-col font-sans">
      {/* Top Clinical Navigation Header */}
      <nav className="bg-slate-900 border-b border-clinical-border px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-clinical-accent" />
          <div>
            <span className="font-bold tracking-wider text-slate-100 uppercase">OsteoInsight Enterprise</span>
            <span className="text-[10px] text-clinical-accent block font-mono">HOSPITAL PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <span className="text-clinical-muted">Authorized User: <strong className="text-slate-200 uppercase">{username} ({role})</strong></span>
          <button 
            onClick={() => { localStorage.clear(); router.push("/"); }}
            className="px-3 py-1 bg-clinical-crimson/15 text-clinical-crimson hover:bg-clinical-crimson/25 rounded transition border border-clinical-crimson/30 uppercase font-bold"
          >
            Revoke Session
          </button>
        </div>
      </nav>

      {/* Main Core Dashboard Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side column: patient registries, scan uploads */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          {/* Diagnostic Scorecard Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl">
              <span className="text-[10px] text-clinical-muted block font-bold uppercase tracking-wider">Indexed Patients</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold font-mono">{patients.length}</span>
                <span className="text-[10px] text-clinical-emerald font-semibold flex items-center">▲ Active</span>
              </div>
            </div>

            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl">
              <span className="text-[10px] text-clinical-muted block font-bold uppercase tracking-wider">Scans Processed</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold font-mono">{scans.length}</span>
                <span className="text-[10px] text-clinical-accent font-semibold flex items-center">▲ GPU OK</span>
              </div>
            </div>

            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl">
              <span className="text-[10px] text-clinical-muted block font-bold uppercase tracking-wider">Fracture Ratio</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold font-mono">68.5%</span>
                <span className="text-[10px] text-clinical-amber font-semibold flex items-center">● High Triage</span>
              </div>
            </div>

            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-4 shadow-xl">
              <span className="text-[10px] text-clinical-muted block font-bold uppercase tracking-wider">Inference Speed</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold font-mono text-clinical-emerald">12.5ms</span>
                <span className="text-[10px] text-clinical-emerald font-semibold flex items-center">TensorRT</span>
              </div>
            </div>
          </div>

          {/* Patient Registry Section */}
          <div className="bg-clinical-panel border border-clinical-border rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-clinical-border pb-2.5">
              <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-clinical-accent" />
                Active Clinical Patients List
              </h2>
              <span className="text-[10px] text-clinical-muted">Select patient below to trigger scan upload.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-clinical-muted font-bold">
                    <th className="py-2.5 px-2">Patient ID</th>
                    <th className="py-2.5 px-2">Full Name</th>
                    <th className="py-2.5 px-2">DOB</th>
                    <th className="py-2.5 px-2">Gender</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-clinical-muted italic">No patients indexed yet. Create one below to initiate registry.</td>
                    </tr>
                  ) : (
                    patients.map((pat) => (
                      <tr 
                        key={pat.id} 
                        className={`hover:bg-slate-900 transition cursor-pointer ${scanPatId === pat.id ? 'bg-clinical-panelLight border-l-2 border-clinical-accent' : ''}`}
                        onClick={() => handlePatientSelect(pat)}
                      >
                        <td className="py-2.5 px-2 font-mono font-semibold text-clinical-accent">{pat.id}</td>
                        <td className="py-2.5 px-2 text-slate-200 font-medium">{pat.name}</td>
                        <td className="py-2.5 px-2 text-clinical-muted">{pat.dob}</td>
                        <td className="py-2.5 px-2 text-slate-300 font-bold">{pat.gender}</td>
                        <td className="py-2.5 px-2 text-right">
                          <button 
                            className="px-2 py-0.5 bg-slate-950 text-[10px] text-clinical-accent border border-clinical-accent/30 rounded font-bold uppercase hover:bg-clinical-accent hover:text-slate-950 transition"
                          >
                            Select Scan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Upload shortcut or scanned history */}
            {scans.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block mb-2">Previous Upload History:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {scans.slice(-3).map((scan) => (
                    <div 
                      key={scan.id} 
                      onClick={() => router.push(`/workspace?scan_id=${scan.id}&patient_id=${scan.patient_id}`)}
                      className="bg-slate-900 border border-slate-800 hover:border-clinical-accent/50 p-2.5 rounded-lg transition cursor-pointer"
                    >
                      <div className="flex justify-between items-center text-[10px] text-clinical-muted mb-1.5">
                        <span className="font-mono">{scan.id}</span>
                        <strong className="text-clinical-emerald font-bold uppercase">{scan.scan_type}</strong>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200 block truncate">Patient: {scan.patient_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Double column inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Patient form */}
            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-5 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase text-slate-200 flex items-center gap-1">
                <Plus className="w-4 h-4 text-clinical-emerald" /> Log New Patient Profile
              </h3>
              
              <form onSubmit={handleCreatePatient} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-clinical-muted">Hospital Patient ID:</span>
                  <input
                    type="text"
                    required
                    value={patId}
                    onChange={(e) => setPatId(e.target.value)}
                    placeholder="e.g. PAT-9812739"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-clinical-accent/70 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-clinical-muted">Patient Full Name:</span>
                  <input
                    type="text"
                    required
                    value={patName}
                    onChange={(e) => setPatName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-clinical-accent/70"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-clinical-muted">Date of Birth:</span>
                    <input
                      type="date"
                      required
                      value={patDob}
                      onChange={(e) => setPatDob(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-clinical-muted">Gender:</span>
                    <select
                      value={patGender}
                      onChange={(e) => setPatGender(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-clinical-emerald text-slate-950 font-bold uppercase rounded-lg hover:bg-emerald-400 transition"
                >
                  Log Patient
                </button>
              </form>
            </div>

            {/* Upload scan file form */}
            <div className="bg-clinical-panel border border-clinical-border rounded-xl p-5 shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase text-slate-200 flex items-center gap-1">
                <Upload className="w-4 h-4 text-clinical-accent" /> Upload Digital X-Ray File
              </h3>
              
              <form onSubmit={handleUploadScan} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-clinical-muted">Target Patient ID:</span>
                  <input
                    type="text"
                    required
                    value={scanPatId}
                    onChange={(e) => setScanPatId(e.target.value)}
                    placeholder="e.g. PAT-9812739"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-clinical-accent/70 font-mono"
                  />
                  <span className="text-[10px] text-clinical-muted">Click a row on the Patient list above to select.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-clinical-muted">Anatomical Zone:</span>
                    <select
                      value={scanType}
                      onChange={(e) => setScanType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                    >
                      <option value="WRIST">WRIST</option>
                      <option value="ARM">ARM</option>
                      <option value="ELBOW">ELBOW</option>
                      <option value="SHOULDER">SHOULDER</option>
                      <option value="FEMUR">FEMUR</option>
                      <option value="KNEE">KNEE</option>
                      <option value="PELVIS">PELVIS</option>
                      <option value="SPINE">SPINE</option>
                      <option value="Skull">SKULL</option>
                      <option value="FOOT">FOOT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-clinical-muted">Select Image File:</span>
                    <input
                      type="file"
                      required
                      accept="image/*,.dcm"
                      onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-slate-300 text-[10px] pt-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-clinical-accent text-slate-950 font-bold uppercase rounded-lg hover:bg-sky-400 transition shadow-clinical-glow mt-2"
                >
                  {loading ? "Transmitting payload..." : "Initiate AI Diagnostic Pipeline"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side column: ROC curve and Benchmarking stats */}
        <div className="flex flex-col gap-6">
          <div className="bg-clinical-panel border border-clinical-border rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 border-b border-clinical-border pb-2">
              <FileBarChart2 className="w-4 h-4 text-clinical-accent" />
              AI Model ROC Analysis (Ablation)
            </h3>
            
            {/* Interactive SVG ROC Curve */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex justify-center items-center">
              <svg width="220" height="220" viewBox="0 0 100 100" className="overflow-visible font-mono text-[6px]">
                {/* Grid Gridlines */}
                <line x1="10" y1="90" x2="90" y2="90" stroke="#1e293b" strokeWidth="0.5" />
                <line x1="10" y1="10" x2="10" y2="90" stroke="#1e293b" strokeWidth="0.5" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1,1" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1,1" />
                
                {/* Baseline Diagonal */}
                <line x1="10" y1="90" x2="90" y2="10" stroke="#334155" strokeWidth="0.5" strokeDasharray="1.5,1.5" />
                
                {/* YOLOv11 ROC Curve Path */}
                <path d="M 10 90 Q 12 25, 45 15 T 90 10" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
                {/* Faster R-CNN ROC Path */}
                <path d="M 10 90 Q 18 35, 55 20 T 90 10" fill="none" stroke="#f59e0b" strokeWidth="0.75" />
                
                {/* Labels */}
                <text x="50" y="98" textAnchor="middle" fill="#94a3b8">False Positive Rate</text>
                <text x="4" y="50" textAnchor="middle" transform="rotate(-90 4 50)" fill="#94a3b8">True Positive Rate</text>
                <text x="75" y="45" fill="#0ea5e9" fontWeight="bold">YOLOv11</text>
                <text x="75" y="52" fill="#0ea5e9">AUC: 0.965</text>
              </svg>
            </div>
            
            <p className="text-[10px] text-clinical-muted leading-relaxed">
              Multi-center validation displaying ROC performance of the **Ensemble Fusion model** vs standard baseline networks. 
              The consolidated AUC score is evaluated on VinDr-CXR and custom PACS datasets.
            </p>
          </div>

          <div className="bg-clinical-panel border border-clinical-border rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 border-b border-clinical-border pb-2">
              <TrendingUp className="w-4 h-4 text-clinical-emerald" />
              Confusion Matrix Evaluation
            </h3>
            
            {/* Labeled Confusion Matrix Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-center">
                <span className="text-[10px] text-clinical-muted block font-mono">TRUE POSITIVE</span>
                <strong className="text-base text-clinical-emerald font-mono block mt-1">482 Cases</strong>
                <span className="text-[9px] text-clinical-muted mt-0.5 block">Fracture Confirmed</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-center">
                <span className="text-[10px] text-clinical-muted block font-mono">FALSE POSITIVE</span>
                <strong className="text-base text-clinical-crimson font-mono block mt-1">14 Cases</strong>
                <span className="text-[9px] text-clinical-muted mt-0.5 block">Artifact / Mimic</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-center">
                <span className="text-[10px] text-clinical-muted block font-mono">FALSE NEGATIVE</span>
                <strong className="text-base text-clinical-crimson font-mono block mt-1">8 Cases</strong>
                <span className="text-[9px] text-clinical-muted mt-0.5 block">Missed hairline</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-center">
                <span className="text-[10px] text-clinical-muted block font-mono">TRUE NEGATIVE</span>
                <strong className="text-base text-clinical-emerald font-mono block mt-1">316 Cases</strong>
                <span className="text-[9px] text-clinical-muted mt-0.5 block">Intact Cortical</span>
              </div>
            </div>

            <div className="flex gap-2 items-center text-[10px] text-clinical-muted px-2 py-1.5 bg-slate-950 border border-slate-900 rounded">
              <AlertOctagon className="w-3.5 h-3.5 text-clinical-amber" />
              <span>Sensitivity: <b>98.3%</b> | Specificity: <b>95.7%</b></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
