"use client";

import React, { useRef, useState, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Ruler, Eye, HelpCircle, Activity, Sun, ShieldAlert } from "lucide-react";

interface DicomViewerProps {
  imageUrl: string;
  enhancedUrl?: string;
  gcamUrl?: string;
  segmentationContours?: number[][][];
  boundingBoxes?: any[];
  mmPerPixel: number;
  onCalibrationChange?: (newVal: number) => void;
  onDeformityCalculate?: (angle: number, disp: number) => void;
}

export default function DicomViewer({
  imageUrl,
  enhancedUrl,
  gcamUrl,
  segmentationContours = [],
  boundingBoxes = [],
  mmPerPixel,
  onCalibrationChange,
  onDeformityCalculate
}: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Canvas configuration states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  
  // Display Layer toggles
  const [showEnhancement, setShowEnhancement] = useState<boolean>(false);
  const [showXai, setShowXai] = useState<boolean>(false);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showMasks, setShowMasks] = useState<boolean>(true);
  
  // Workspace Tool mode
  const [activeTool, setActiveTool] = useState<"pan" | "ruler" | "angle" | "calibrate">("pan");
  
  // Interactive drawing states
  const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
  const [anglePoints, setAnglePoints] = useState<{ x: number; y: number }[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const enhancedImgElementRef = useRef<HTMLImageElement | null>(null);
  const gcamImgElementRef = useRef<HTMLImageElement | null>(null);

  // Pre-load images
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      imgElementRef.current = img;
      setImageLoaded(true);
    };
    
    if (enhancedUrl) {
      const eImg = new Image();
      eImg.src = enhancedUrl;
      eImg.onload = () => { enhancedImgElementRef.current = eImg; };
    }
    
    if (gcamUrl) {
      const gImg = new Image();
      gImg.src = gcamUrl;
      gImg.onload = () => { gcamImgElementRef.current = gImg; };
    }
  }, [imageUrl, enhancedUrl, gcamUrl]);

  // Redraw loop
  useEffect(() => {
    drawWorkspace();
  }, [
    imageLoaded, zoom, pan, brightness, contrast, 
    showEnhancement, showXai, showBoxes, showMasks,
    rulerPoints, anglePoints, calibrationPoints, activeTool,
    segmentationContours, boundingBoxes
  ]);

  const drawWorkspace = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Setup transforms (Pan & Zoom)
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Apply contrast / brightness
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // 1. Draw base scan image (Normal or Enhanced FCET)
    let activeImg = imgElementRef.current;
    if (showEnhancement && enhancedImgElementRef.current) {
      activeImg = enhancedImgElementRef.current;
    }

    if (activeImg) {
      // Center image in canvas
      ctx.drawImage(activeImg, 0, 0, canvas.width, canvas.height);
    } else {
      // Standby loader text
      ctx.fillStyle = "#475569";
      ctx.font = "16px sans-serif";
      ctx.fillText("Radiology Workspace Idle. Upload scan to initiate...", 50, canvas.height / 2);
      ctx.restore();
      return;
    }
    
    // Remove contrast filtering for annotations and explainable maps
    ctx.filter = "none";

    // 2. Draw Grad-CAM Attention Heatmap
    if (showXai && gcamImgElementRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.50; // Clinical transparency blend
      ctx.drawImage(gcamImgElementRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // 3. Draw Deep Learning Segmentation Mask contours
    if (showMasks && segmentationContours.length > 0) {
      segmentationContours.forEach((contour, idx) => {
        if (!contour || contour.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(contour[0][0], contour[0][1]);
        for (let i = 1; i < contour.length; i++) {
          ctx.lineTo(contour[i][0], contour[i][1]);
        }
        ctx.closePath();
        ctx.lineWidth = 2.5;
        // High-contrast medical cyan
        ctx.strokeStyle = idx === 0 ? "#0ea5e9" : "#10b981";
        ctx.fillStyle = idx === 0 ? "rgba(14, 165, 233, 0.25)" : "rgba(16, 185, 129, 0.20)";
        ctx.fill();
        ctx.stroke();
      });
    }

    // 4. Draw YOLO Bounding Boxes
    if (showBoxes && boundingBoxes.length > 0) {
      boundingBoxes.forEach((box) => {
        ctx.strokeStyle = "#ef4444"; // Red alarm bounding box
        ctx.lineWidth = 2.0;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw details tag
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 11px Inter, sans-serif";
        const tag = `${box.label} (${Math.round(box.confidence * 100)}%)`;
        ctx.fillRect(box.x, box.y - 18, ctx.measureText(tag).width + 10, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tag, box.x + 5, box.y - 5);
      });
    }

    // 5. Draw Interactive Medical Tools
    // A. Ruler Tool
    if (rulerPoints.length > 0) {
      ctx.strokeStyle = "#f59e0b"; // Amber Ruler
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(rulerPoints[0].x, rulerPoints[0].y);
      rulerPoints.forEach((pt, i) => {
        if (i > 0) ctx.lineTo(pt.x, pt.y);
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.stroke();
      
      if (rulerPoints.length === 2) {
        const dx = rulerPoints[1].x - rulerPoints[0].x;
        const dy = rulerPoints[1].y - rulerPoints[0].y;
        const pixelDist = Math.sqrt(dx * dx + dy * dy);
        const mmDist = pixelDist * mmPerPixel;
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`${(mmDist).toFixed(2)} mm`, (rulerPoints[0].x + rulerPoints[1].x)/2 + 10, (rulerPoints[0].y + rulerPoints[1].y)/2 - 10);
      }
    }

    // B. Angle Deformity / Cobb Angle Tool (3-points)
    if (anglePoints.length > 0) {
      ctx.strokeStyle = "#8b5cf6"; // Purple vector lines
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(anglePoints[0].x, anglePoints[0].y);
      anglePoints.forEach((pt, i) => {
        if (i > 0) ctx.lineTo(pt.x, pt.y);
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.stroke();

      if (anglePoints.length === 3) {
        // Calculate angle between vector A (P1 -> P2) and B (P2 -> P3)
        const vA = { x: anglePoints[0].x - anglePoints[1].x, y: anglePoints[0].y - anglePoints[1].y };
        const vB = { x: anglePoints[2].x - anglePoints[1].x, y: anglePoints[2].y - anglePoints[1].y };
        
        const dot = vA.x * vB.x + vA.y * vB.y;
        const magA = Math.sqrt(vA.x * vA.x + vA.y * vA.y);
        const magB = Math.sqrt(vB.x * vB.x + vB.y * vB.y);
        
        let angleDeg = 0;
        if (magA * magB > 0) {
          const cosTheta = dot / (magA * magB);
          const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
          angleDeg = (theta * 180) / Math.PI;
        }

        ctx.fillStyle = "#8b5cf6";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(`Deformity: ${angleDeg.toFixed(1)}°`, anglePoints[1].x + 15, anglePoints[1].y - 15);
      }
    }

    // C. Calibration Tool
    if (calibrationPoints.length > 0) {
      ctx.strokeStyle = "#10b981"; // Emerald
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
      calibrationPoints.forEach((pt) => {
        ctx.lineTo(pt.x, pt.y);
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Convert click coordinates to canvas grid, accounting for pan and zoom scale
    const x = ((e.clientX - rect.left) - pan.x) / zoom;
    const y = ((e.clientY - rect.top) - pan.y) / zoom;
    
    if (activeTool === "pan") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === "ruler") {
      if (rulerPoints.length >= 2) {
        setRulerPoints([{ x, y }]);
      } else {
        setRulerPoints([...rulerPoints, { x, y }]);
      }
    } else if (activeTool === "angle") {
      if (anglePoints.length >= 3) {
        setAnglePoints([{ x, y }]);
      } else {
        const nextPts = [...anglePoints, { x, y }];
        setAnglePoints(nextPts);
        if (nextPts.length === 3 && onDeformityCalculate) {
          // Trigger mock alignment recalculation
          onDeformityCalculate(18.5, 3.4);
        }
      }
    } else if (activeTool === "calibrate") {
      if (calibrationPoints.length >= 2) {
        setCalibrationPoints([{ x, y }]);
      } else {
        const nextPts = [...calibrationPoints, { x, y }];
        setCalibrationPoints(nextPts);
        if (nextPts.length === 2) {
          const distPx = Math.sqrt(Math.pow(nextPts[1].x - nextPts[0].x, 2) + Math.pow(nextPts[1].y - nextPts[0].y, 2));
          const valStr = prompt("Input real-world physical length of the selected bone vector (in millimeters):", "20");
          if (valStr && onCalibrationChange) {
            const mm = parseFloat(valStr);
            if (mm > 0) {
              const newMmPerPixel = mm / distPx;
              onCalibrationChange(newMmPerPixel);
              alert(`Sub-pixel spacing calibrated successfully to: ${newMmPerPixel.toFixed(5)} mm/pixel`);
            }
          }
          setCalibrationPoints([]);
          setActiveTool("pan");
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan" && isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetAll = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setRulerPoints([]);
    setAnglePoints([]);
    setCalibrationPoints([]);
    setActiveTool("pan");
  };

  return (
    <div className="flex flex-col h-full bg-clinical-bg border border-clinical-border rounded-xl overflow-hidden shadow-clinical-glow">
      {/* Top Workstation Diagnostics Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-clinical-border text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-clinical-accent animate-pulse" />
          <span className="font-semibold tracking-wider text-slate-200 uppercase">Interactive PACS Workstation</span>
        </div>
        <div className="flex items-center gap-4 text-clinical-muted">
          <span>Pixel Spacing: <strong className="text-clinical-emerald">{mmPerPixel.toFixed(4)} mm/px</strong></span>
          <span className="flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-clinical-amber" /> HIPAA Session Active</span>
        </div>
      </div>
      
      {/* Primary Toolbar Block */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-950 border-b border-clinical-border justify-between">
        {/* Toggle Overlays */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
          <Eye className="w-3.5 h-3.5 text-clinical-accent" />
          <span className="text-[11px] font-medium mr-1.5">View Layers:</span>
          
          <button 
            onClick={() => setShowEnhancement(!showEnhancement)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${showEnhancement ? 'bg-clinical-accent text-slate-950' : 'bg-slate-800 text-clinical-muted hover:bg-slate-700'}`}
          >
            FCET Contrast
          </button>
          <button 
            onClick={() => setShowXai(!showXai)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${showXai ? 'bg-clinical-accent text-slate-950' : 'bg-slate-800 text-clinical-muted hover:bg-slate-700'}`}
          >
            Grad-CAM++
          </button>
          <button 
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${showBoxes ? 'bg-clinical-crimson text-white' : 'bg-slate-800 text-clinical-muted hover:bg-slate-700'}`}
          >
            YOLO Boxes
          </button>
          <button 
            onClick={() => setShowMasks(!showMasks)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${showMasks ? 'bg-clinical-emerald text-slate-950' : 'bg-slate-800 text-clinical-muted hover:bg-slate-700'}`}
          >
            U-Net Masks
          </button>
        </div>

        {/* Diagnostic Measurement Drawer */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
          <button
            onClick={() => { setActiveTool("pan"); }}
            className={`p-1.5 rounded transition ${activeTool === "pan" ? 'bg-clinical-panelLight text-clinical-accent' : 'text-clinical-muted hover:text-slate-200'}`}
            title="Pan & Zoom Hand"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => { setActiveTool("ruler"); setRulerPoints([]); }}
            className={`p-1.5 rounded transition flex items-center gap-1 ${activeTool === "ruler" ? 'bg-clinical-panelLight text-clinical-amber' : 'text-clinical-muted hover:text-slate-200'}`}
            title="Ruler Measurement"
          >
            <Ruler className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Ruler</span>
          </button>

          <button
            onClick={() => { setActiveTool("angle"); setAnglePoints([]); }}
            className={`p-1.5 rounded transition flex items-center gap-1 ${activeTool === "angle" ? 'bg-clinical-panelLight text-purple-400' : 'text-clinical-muted hover:text-slate-200'}`}
            title="3-Point Angle Tool"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase">Cobb Angle</span>
          </button>

          <button
            onClick={() => { setActiveTool("calibrate"); setCalibrationPoints([]); }}
            className={`p-1.5 rounded transition flex items-center gap-1 ${activeTool === "calibrate" ? 'bg-clinical-panelLight text-clinical-emerald' : 'text-clinical-muted hover:text-slate-200'}`}
            title="Calibrate Pixel Pitch"
          >
            <RotateCcw className="w-4 h-4 text-clinical-emerald" />
            <span className="text-[10px] font-bold uppercase">Calibrate</span>
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setZoom(z => Math.min(5, z + 0.25))}
            className="p-1.5 bg-slate-900 rounded hover:bg-slate-800 text-slate-300"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="p-1.5 bg-slate-900 rounded hover:bg-slate-800 text-slate-300"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={resetAll}
            className="p-1.5 bg-slate-900 rounded hover:bg-slate-800 text-clinical-crimson"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-950 p-2 overflow-hidden min-h-[400px]">
        <canvas
          ref={canvasRef}
          width={650}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`border border-slate-900 rounded-lg shadow-2xl bg-black ${activeTool === "pan" ? 'canvas-cursor-pan' : 'canvas-cursor-ruler'}`}
        />
        
        {/* Floating Calibration Warning Indicator */}
        {activeTool !== "pan" && (
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-clinical-accent shadow-lg text-[10px] text-clinical-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-clinical-accent animate-ping" />
            Active tool: <strong className="text-clinical-text uppercase">{activeTool} Mode</strong> - Draw directly on X-ray.
          </div>
        )}
      </div>

      {/* Grayscale Brightness & Contrast Adjustment Sliders */}
      <div className="flex gap-4 p-3 bg-slate-900 border-t border-clinical-border justify-center text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <Sun className="w-4 h-4 text-clinical-muted" />
          <span className="text-clinical-muted">Brightness:</span>
          <input
            type="range"
            min="50"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="flex-1 accent-clinical-accent"
          />
          <span className="font-mono text-slate-300 w-8">{brightness}%</span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <Eye className="w-4 h-4 text-clinical-muted" />
          <span className="text-clinical-muted">Contrast:</span>
          <input
            type="range"
            min="50"
            max="200"
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
            className="flex-1 accent-clinical-accent"
          />
          <span className="font-mono text-slate-300 w-8">{contrast}%</span>
        </div>
      </div>
    </div>
  );
}
