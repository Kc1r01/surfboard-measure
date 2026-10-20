import { useState, useRef, useEffect } from "react";

const C = {
  navy:'#0d1b2a', turq:'#00c9b1', turq2:'#009e8d',
  sand:'#e8dcc8', sand2:'#c8b89a', foam:'#f0f7f6',
  muted:'#4a6274', red:'#e05c5c',
  nose:'#ff6b6b', tail:'#ffd93d',
  max:'#00c9b1', w05:'#34d399', w13:'#a78bfa', w23:'#fb923c', w45:'#f472b6',
};

const MR = 12;
const BAND = 60;

function mdp(pt) { return { x: pt.x, y: pt.y - MR*4 }; }

function drawMarker(ctx, pt, color, label) {
  const d = mdp(pt);
  ctx.beginPath(); ctx.arc(d.x, d.y, MR+4, 0, Math.PI*2);
  ctx.strokeStyle=color; ctx.lineWidth=2; ctx.globalAlpha=.35; ctx.stroke(); ctx.globalAlpha=1;
  ctx.beginPath(); ctx.arc(d.x, d.y, MR, 0, Math.PI*2);
  ctx.fillStyle=color+'b3'; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(d.x-MR,d.y); ctx.lineTo(d.x+MR,d.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(d.x,d.y-MR); ctx.lineTo(d.x,d.y+MR); ctx.stroke();
  if (label) {
    const fs=16;
    ctx.font=`bold ${fs}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    const tw=ctx.measureText(label).width;
    ctx.fillStyle='rgba(0,0,0,.8)';
    ctx.beginPath(); ctx.roundRect(d.x-tw/2-5,d.y-MR-fs-2,tw+10,fs+4,3); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillText(label,d.x,d.y-MR);
  }
}

function drawLine(ctx, a, b, color, lw, dashed) {
  ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
  ctx.strokeStyle=color; ctx.lineWidth=lw||3;
  ctx.setLineDash(dashed?[10,6]:[]); ctx.stroke(); ctx.setLineDash([]);
}

function drawGuideLine(ctx, nose, tail, t, color, label, cW, cH) {
  const totalPx = Math.hypot(tail.x-nose.x, tail.y-nose.y);
  if (!totalPx) return;
  const ux=(tail.x-nose.x)/totalPx, uy=(tail.y-nose.y)/totalPx;
  const px=-uy, py=ux;
  const cx=nose.x+(tail.x-nose.x)*t, cy=nose.y+(tail.y-nose.y)*t;
  const far=Math.max(cW,cH)*2;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, cW, cH); ctx.clip();
  ctx.beginPath(); ctx.moveTo(cx-px*far,cy-py*far); ctx.lineTo(cx+px*far,cy+py*far);
  ctx.strokeStyle=color; ctx.lineWidth=3; ctx.setLineDash([14,8]); ctx.stroke();
  ctx.restore();
  const fs=15;
  ctx.save();
  ctx.font=`bold ${fs}px sans-serif`;
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const tw=ctx.measureText(label).width;
  const lx=cW-tw-20, ly=Math.max(fs+6,Math.min(cH-fs-6, cy+py*far*0.5));
  ctx.fillStyle='rgba(0,0,0,.75)';
  ctx.beginPath(); ctx.roundRect(lx-6,ly-fs/2-3,tw+12,fs+6,3); ctx.fill();
  ctx.fillStyle=color; ctx.fillText(label,lx,ly);
  ctx.restore();
}

function dist(a,b) { return a&&b ? Math.hypot(a.x-b.x,a.y-b.y) : 0; }

function constrain(pt, nose, tail, t) {
  if (!nose||!tail) return pt;
  const mn=mdp(nose), mt=mdp(tail);
  const totalPx = Math.hypot(mt.x-mn.x, mt.y-mn.y);
  if (!totalPx) return pt;
  const ux=(mt.x-mn.x)/totalPx, uy=(mt.y-mn.y)/totalPx;
  const px=-uy, py=ux;
  const cx=mn.x+(mt.x-mn.x)*t, cy=mn.y+(mt.y-mn.y)*t;
  const mp=mdp(pt);
  const dx=mp.x-cx, dy=mp.y-cy;
  const proj=dx*px+dy*py;
  const mx=cx+px*proj, my=cy+py*proj;
  return { x: mx, y: my+MR*4 };
}

export default function App() {
  const [step, setStep]       = useState(0);
  const [imgSrc, setImgSrc]   = useState(null);
  const [imgW, setImgW]       = useState(0);
  const [imgH, setImgH]       = useState(0);
  const [boardLen, setBoardLen] = useState('');
  const [maxWInput, setMaxWInput] = useState('');
  const [maxWInt, setMaxWInt] = useState('');
  const [maxWNum, setMaxWNum] = useState('');
  const [maxWDen, setMaxWDen] = useState('');
  const [nosePt, setNosePt]   = useState(null);
  const [tailPt, setTailPt]   = useState(null);
  const [maxPts, setMaxPts]   = useState([]);
  const [w05Pts, setW05Pts] = useState([]);
  const [w13Pts, setW13Pts] = useState([]);
  const [w23Pts, setW23Pts] = useState([]);
  const [w45Pts, setW45Pts] = useState([]);
  const [isPinTail, setIsPinTail] = useState(null);
  const [tailWPts, setTailWPts] = useState([]);
  const [resultImg, setResultImg] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [lenFt, setLenFt] = useState('');
  const [lenIn, setLenIn] = useState('');

  function cmToFtIn(cm) {
    const totalIn = parseFloat(cm)/2.54;
    const ft = Math.floor(totalIn/12);
    const inch = Math.round((totalIn%12)*100)/100;
    return { ft:String(ft), inch:String(inch) };
  }
  function ftInToCm(ft, inch) {
    return (((parseFloat(ft)||0)*12+(parseFloat(inch)||0))*2.54).toFixed(1);
  }
  function onLenCmChange(val) {
    setBoardLen(val);
    if (val && !isNaN(parseFloat(val))) {
      const { ft, inch } = cmToFtIn(parseFloat(val));
      setLenFt(ft); setLenIn(inch);
    } else { setLenFt(''); setLenIn(''); }
  }
  function onLenFtChange(val) {
    setLenFt(val);
    const cm=ftInToCm(val,lenIn);
    if(parseFloat(cm)>0) setBoardLen(cm);
  }
  function onLenInChange(val) {
    setLenIn(val);
    const cm=ftInToCm(lenFt,val);
    if(parseFloat(cm)>0) setBoardLen(cm);
  }
  function onMaxWCmChange(val) {
    setMaxWInput(val);
    if (val && !isNaN(parseFloat(val))) {
      const totalIn = parseFloat(val)/2.54;
      const intPart = Math.floor(totalIn);
      const fracPart = totalIn - intPart;
      const eighths = Math.round(fracPart*8);
      setMaxWInt(String(intPart));
      setMaxWNum(String(eighths));
      setMaxWDen('8');
    } else { setMaxWInt(''); setMaxWNum(''); setMaxWDen(''); }
  }
  function onMaxWInchChange(intV, numV, denV) {
    if (intV !== undefined) setMaxWInt(intV);
    if (numV !== undefined) setMaxWNum(numV);
    if (denV !== undefined) setMaxWDen(denV);
    const i = parseFloat(intV ?? maxWInt)||0;
    const n = parseFloat(numV ?? maxWNum)||0;
    const d = parseFloat(denV ?? maxWDen)||1;
    const totalIn = i + (d>0 ? n/d : 0);
    if (totalIn > 0) setMaxWInput((totalIn*2.54).toFixed(1));
    else setMaxWInput('');
  }

  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const fileRef   = useRef(null);
  const dragging  = useRef(false);
  const dragSlot  = useRef(null);
  const dragIdx   = useRef(0);
  const zoomRef   = useRef(null);
  const lastPtr   = useRef(null);
  const autoRaf   = useRef(null);

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const tmp = new Image();
      tmp.onload = () => {
        const MAX=1600; let w=tmp.width, h=tmp.height;
        if(w>MAX||h>MAX){ if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;} }
        const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        cv.getContext('2d').drawImage(tmp,0,0,w,h);
        const url=cv.toDataURL('image/jpeg',0.88);
        setImgSrc(url); setImgW(w); setImgH(h);
        const img=new Image(); img.onload=()=>{ imgRef.current=img; }; img.src=url;
      };
      tmp.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  useEffect(()=>{
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  },[]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (step < 1 || step > 6) && step !== 8) return;
    function blockScroll(e) {
      if (dragging.current) e.preventDefault();
    }
    canvas.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', blockScroll);
    };
  }, [step]);

  useEffect(() => {
    if (!imgRef.current||step===0) return;
    const canvas=canvasRef.current;
    if (!canvas) return;
    const img=imgRef.current;
    const cw=canvas.parentElement.clientWidth;
    const sc=img.width/cw;
    canvas.width=img.width; canvas.height=img.height;
    canvas.style.width=cw+'px';
    canvas.style.height=Math.round(img.height/sc)+'px';
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0);

    const cW=canvas.width, cH=canvas.height;
    const b = pt => ({x:pt.x, y:pt.y+BAND});

    const bL=parseFloat(boardLen)||200;
    const bmdpN = nosePt ? {x:mdp(nosePt).x, y:mdp(nosePt).y+BAND} : null;
    const bmdpT = tailPt ? {x:mdp(tailPt).x, y:mdp(tailPt).y+BAND} : null;
    if (nosePt&&tailPt&&step>=3) drawGuideLine(ctx,bmdpN,bmdpT,50/bL,C.w05,'Nから0.5m',cW,cH);
    if (nosePt&&tailPt&&step>=4) drawGuideLine(ctx,bmdpN,bmdpT,100/bL,C.w13,'Nから1m',cW,cH);
    if (nosePt&&tailPt&&step>=5) drawGuideLine(ctx,bmdpN,bmdpT,1-100/bL,C.w23,'Tから1m',cW,cH);
    if (nosePt&&tailPt&&step>=6) drawGuideLine(ctx,bmdpN,bmdpT,1-50/bL,C.w45,'Tから0.5m',cW,cH);

    const bmdp = pt => ({x:mdp(pt).x, y:mdp(pt).y+BAND});
    if (maxPts.length===2) drawLine(ctx,bmdp(maxPts[0]),bmdp(maxPts[1]),C.max,4,false);
    if (w05Pts.length===2) drawLine(ctx,bmdp(w05Pts[0]),bmdp(w05Pts[1]),C.w05,4,false);
    if (w13Pts.length===2) drawLine(ctx,bmdp(w13Pts[0]),bmdp(w13Pts[1]),C.w13,4,false);
    if (w23Pts.length===2) drawLine(ctx,bmdp(w23Pts[0]),bmdp(w23Pts[1]),C.w23,4,false);
    if (w45Pts.length===2) drawLine(ctx,bmdp(w45Pts[0]),bmdp(w45Pts[1]),C.w45,4,false);

    maxPts.forEach(p=>drawMarker(ctx,b(p),C.max,''));
    w05Pts.forEach(p=>drawMarker(ctx,b(p),C.w05,''));
    w13Pts.forEach(p=>drawMarker(ctx,b(p),C.w13,''));
    w23Pts.forEach(p=>drawMarker(ctx,b(p),C.w23,''));
    w45Pts.forEach(p=>drawMarker(ctx,b(p),C.w45,''));
    if (tailWPts.length===2) drawLine(ctx,bmdp(tailWPts[0]),bmdp(tailWPts[1]),'#e879f9',4,false);
    tailWPts.forEach(p=>drawMarker(ctx,b(p),'#e879f9',''));
    if (nosePt) drawMarker(ctx,b(nosePt),C.nose,'N');
    if (tailPt) drawMarker(ctx,b(tailPt),C.tail,'T');

  }, [step,nosePt,tailPt,maxPts,w05Pts,w13Pts,w23Pts,w45Pts,tailWPts,imgSrc,imgW,imgH]);

  function getpt(e) {
    const canvas=canvasRef.current;
    if (!canvas) return {x:0,y:0};
    const rect=canvas.getBoundingClientRect();
    const sc=imgW/rect.width;
    const cx=e.clientX, cy=e.clientY;
    const rawX=(cx-rect.left)*sc;
    const rawY=(cy-rect.top)*sc - BAND;
    return {
      x: Math.max(-imgW*0.1, Math.min(imgW*1.1, rawX)),
      y: Math.max(-BAND, Math.min(imgH+BAND, rawY)),
    };
  }

  const ZOOM_SCALE = 3;
  function applyZoom(e) {
    const mainCanvas = canvasRef.current;
    const zCanvas = zoomRef.current;
    if (!mainCanvas || !zCanvas) return;
    const rect = mainCanvas.getBoundingClientRect();
    const sc = mainCanvas.width / rect.width;
    // マーカーと同じ（端でクランプ済みの）位置を使う
    const gp = getpt(e);
    const ptX = gp.x;
    const ptY = gp.y + BAND - MR * 4;
    const VW = window.innerWidth;
    const VH = window.innerHeight;
    if (zCanvas.width !== VW || zCanvas.height !== VH) {
      zCanvas.width = VW;
      zCanvas.height = VH;
    }
    zCanvas.style.display = 'block';
    const zCtx = zCanvas.getContext('2d');
    zCtx.fillStyle = '#0d1b2a';
    zCtx.fillRect(0, 0, VW, VH);
    const destCX = VW / 2;
    const destCY = VH / 3;
    const SRC = VW / ZOOM_SCALE;
    // 画像端でクランプしない：十字線の位置＝実際のプロット位置を常に一致させ、
    // 画像の外側（端）まで拡大表示が動くようにする。範囲外は背景色のまま。
    const srcX = ptX - SRC / 2;
    const srcY = ptY - SRC / 2;
    const dstX = destCX - VW / 2;
    const dstY = destCY - VW / 2;
    const k = VW / SRC;
    const cx0 = Math.max(0, srcX), cy0 = Math.max(0, srcY);
    const cx1 = Math.min(mainCanvas.width,  srcX + SRC);
    const cy1 = Math.min(mainCanvas.height, srcY + SRC);
    if (cx1 > cx0 && cy1 > cy0) {
      zCtx.drawImage(mainCanvas, cx0, cy0, cx1 - cx0, cy1 - cy0,
        dstX + (cx0 - srcX) * k, dstY + (cy0 - srcY) * k, (cx1 - cx0) * k, (cy1 - cy0) * k);
    }
    zCtx.strokeStyle = 'rgba(255,255,255,0.9)';
    zCtx.lineWidth = 2;
    zCtx.setLineDash([6, 4]);
    zCtx.beginPath(); zCtx.moveTo(destCX - 20, destCY); zCtx.lineTo(destCX + 20, destCY); zCtx.stroke();
    zCtx.beginPath(); zCtx.moveTo(destCX, destCY - 20); zCtx.lineTo(destCX, destCY + 20); zCtx.stroke();
    zCtx.setLineDash([]);
  }

  function removeZoom() {
    const zCanvas = zoomRef.current;
    if (!zCanvas) return;
    zCanvas.style.display = 'none';
  }

  function onPointerDown(e) {
    e.preventDefault();
    const canvas=canvasRef.current;
    if (!canvas) return;
    if (step===1 && nosePt && tailPt) return;
    if (step===2 && maxPts.length>=2) return;
    if (step===3 && w05Pts.length>=2) return;
    if (step===4 && w13Pts.length>=2) return;
    if (step===5 && w23Pts.length>=2) return;
    if (step===6 && w45Pts.length>=2) return;
    if (step===8 && tailWPts.length>=2) return;
    canvas.setPointerCapture(e.pointerId);
    dragging.current=true;
    const pt=getpt(e);
    if (step===1) {
      if (!nosePt){dragSlot.current='nose';dragIdx.current=0;}
      else if (!tailPt){dragSlot.current='tail';dragIdx.current=0;}
      else return;
    } else if (step===2) {
      dragSlot.current='max';
      dragIdx.current=maxPts.length<2?maxPts.length:1;
    } else if (step===3) {
      dragSlot.current='w05';
      dragIdx.current=w05Pts.length<2?w05Pts.length:1;
    } else if (step===4) {
      dragSlot.current='w13';
      dragIdx.current=w13Pts.length<2?w13Pts.length:1;
    } else if (step===5) {
      dragSlot.current='w23';
      dragIdx.current=w23Pts.length<2?w23Pts.length:1;
    } else if (step===6) {
      dragSlot.current='w45';
      dragIdx.current=w45Pts.length<2?w45Pts.length:1;
    } else if (step===8) {
      dragSlot.current='tailW';
      dragIdx.current=tailWPts.length<2?tailWPts.length:1;
    } else return;
    applyPt(pt);
    if (step===1||step===8) { lastPtr.current={clientX:e.clientX,clientY:e.clientY}; applyZoom(e); startAutoScroll(); }
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    e.preventDefault();
    applyPt(getpt(e));
    if (step===1||step===8) { lastPtr.current={clientX:e.clientX,clientY:e.clientY}; applyZoom(e); }
  }

  function onPointerUp(e) {
    dragging.current=false;
    dragSlot.current=null;
    stopAutoScroll();
    removeZoom();
  }

  // ドラッグ中に指が画面の上下端に近づいたらページを自動スクロールし、
  // キャンバス上端/下端（画像端）まで拡大表示が届くようにする
  const AUTO_EDGE = 90;
  function startAutoScroll() {
    stopAutoScroll();
    const tick = () => {
      if (!dragging.current) { autoRaf.current=null; return; }
      const p = lastPtr.current;
      if (p) {
        const vh = window.innerHeight;
        let dy = 0;
        if (p.clientY < AUTO_EDGE) dy = -Math.ceil((AUTO_EDGE - Math.max(p.clientY,0)) / 15);
        else if (p.clientY > vh - AUTO_EDGE) dy = Math.ceil((p.clientY - (vh - AUTO_EDGE)) / 15);
        if (dy !== 0) {
          const before = window.scrollY;
          window.scrollBy(0, dy);
          if (window.scrollY !== before) {
            applyPt(getpt(p));
            applyZoom(p);
          }
        }
      }
      autoRaf.current = requestAnimationFrame(tick);
    };
    autoRaf.current = requestAnimationFrame(tick);
  }
  function stopAutoScroll() {
    if (autoRaf.current) cancelAnimationFrame(autoRaf.current);
    autoRaf.current = null;
  }

  function applyPt(pt) {
    const slot=dragSlot.current, idx=dragIdx.current;
    function upd(setter, val) {
      setter(prev=>{ const a=[...prev]; a[idx]=val; return a; });
    }
    if (slot==='nose') setNosePt(pt);
    else if (slot==='tail') setTailPt(pt);
    else if (slot==='max') upd(setMaxPts, pt);
    else if (slot==='w05') upd(setW05Pts, constrain(pt,nosePt,tailPt,50/parseFloat(boardLen)));
    else if (slot==='w13') upd(setW13Pts, constrain(pt,nosePt,tailPt,100/parseFloat(boardLen)));
    else if (slot==='w23') upd(setW23Pts, constrain(pt,nosePt,tailPt,1-100/parseFloat(boardLen)));
    else if (slot==='w45') upd(setW45Pts, constrain(pt,nosePt,tailPt,1-50/parseFloat(boardLen)));
    else if (slot==='tailW') upd(setTailWPts, pt);
  }

  function undo() {
    if (step===1){ if(tailPt)setTailPt(null); else if(nosePt)setNosePt(null); }
    else if (step===2) setMaxPts(p=>p.slice(0,-1));
    else if (step===3) setW05Pts(p=>p.slice(0,-1));
    else if (step===4) setW13Pts(p=>p.slice(0,-1));
    else if (step===5) setW23Pts(p=>p.slice(0,-1));
    else if (step===6) setW45Pts(p=>p.slice(0,-1));
    else if (step===8) setTailWPts(p=>p.slice(0,-1));
  }

  function calc(isPinTailOverride=isPinTail) {
    const bLen=parseFloat(boardLen);
    const totalPx=dist(nosePt,tailPt);
    const mMax0=mdp(maxPts[0]),mMax1=mdp(maxPts[1]);
    const mW050=mdp(w05Pts[0]),mW051=mdp(w05Pts[1]);
    const mW130=mdp(w13Pts[0]),mW131=mdp(w13Pts[1]);
    const mW230=mdp(w23Pts[0]),mW231=mdp(w23Pts[1]);
    const mW450=mdp(w45Pts[0]),mW451=mdp(w45Pts[1]);
    const maxWpx=dist(mMax0,mMax1);
    const inputMax=parseFloat(maxWInput)||0;
    const pxPerCm=inputMax>0?maxWpx/inputMax:totalPx/bLen;
    const tailWcm = (isPinTailOverride===false && tailWPts.length===2)
      ? (dist(mdp(tailWPts[0]),mdp(tailWPts[1]))/pxPerCm).toFixed(1)
      : null;
    return {
      bLen,
      maxWcm:(maxWpx/pxPerCm).toFixed(1),
      w05cm:(dist(mW050,mW051)/pxPerCm).toFixed(1),
      w13cm:(dist(mW130,mW131)/pxPerCm).toFixed(1),
      w23cm:(dist(mW230,mW231)/pxPerCm).toFixed(1),
      w45cm:(dist(mW450,mW451)/pxPerCm).toFixed(1),
      tailWcm,
      mMax0,mMax1,mW050,mW051,mW130,mW131,mW230,mW231,mW450,mW451,
    };
  }

  function goResult(isPinTailOverride=isPinTail) {
    const res=calc(isPinTailOverride);
    setResultData(res);
    const canvas=canvasRef.current;
    if (canvas) {
      const snap=document.createElement('canvas');
      snap.width=canvas.width; snap.height=canvas.height;
      const sctx=snap.getContext('2d');
      sctx.drawImage(canvas,0,0);
      function emphLine(a,b,color){
        const ax=a.x, ay=a.y+BAND, bx=b.x, by=b.y+BAND;
        sctx.beginPath(); sctx.moveTo(ax,ay); sctx.lineTo(bx,by);
        sctx.strokeStyle=color; sctx.lineWidth=5; sctx.setLineDash([]); sctx.stroke();
        [[ax,ay],[bx,by]].forEach(([px,py])=>{ sctx.beginPath(); sctx.arc(px,py,8,0,Math.PI*2); sctx.fillStyle=color; sctx.fill(); });
      }
      emphLine(res.mMax0,res.mMax1,C.max);
      emphLine(res.mW050,res.mW051,C.w05);
      emphLine(res.mW130,res.mW131,C.w13);
      emphLine(res.mW230,res.mW231,C.w23);
      emphLine(res.mW450,res.mW451,C.w45);
      const maxRight = res.mMax0.x >= res.mMax1.x ? res.mMax0 : res.mMax1;
      const lfs = Math.max(18, Math.round(canvas.width * 0.03)) - 2;
      sctx.font = `bold ${lfs}px sans-serif`;
      sctx.textAlign = 'left'; sctx.textBaseline = 'middle';
      const ltw = sctx.measureText('最大幅').width;
      const lx = maxRight.x + BAND + 16 - lfs*2;
      const ly = maxRight.y + BAND;
      sctx.fillStyle = 'rgba(0,0,0,.72)';
      sctx.beginPath(); sctx.roundRect(lx-4, ly-lfs/2-3, ltw+10, lfs+6, 4); sctx.fill();
      sctx.fillStyle = C.max; sctx.fillText('最大幅', lx, ly);
      setResultImg(snap.toDataURL('image/jpeg',0.92));
    }
    setStep(9);
  }

  function resetAll() {
    setStep(0); setImgSrc(null); setImgW(0); setImgH(0);
    setBoardLen(''); setMaxWInput('');
    setLenFt(''); setLenIn('');
    setMaxWInt(''); setMaxWNum(''); setMaxWDen('');
    setNosePt(null); setTailPt(null);
    setMaxPts([]); setW05Pts([]); setW13Pts([]); setW23Pts([]); setW45Pts([]);
    setIsPinTail(null); setTailWPts([]);
    setResultImg(null); setResultData(null);
    imgRef.current=null;
  }

  const STEP_LABELS=['写真・長さ','端点','最大幅','N0.5m','N1m','T1m','T0.5m','テール','T幅','結果'];
  const instrMap={
    0:'写真を選んで全長を入力してください',
    1:!nosePt?'① ノーズ（先端）をタップ':!tailPt?'② テール（後端）をタップ':'✓ 両端を指定しました',
    2:maxPts.length===0?'最大幅の端をタップ（左右どちらからでもOK）':maxPts.length===1?'もう一方の端をタップ':'✓ 最大幅を指定しました',
    3:w05Pts.length===0?'Nから0.5m位置（緑線）の端をタップ':w05Pts.length===1?'もう一方の端をタップ':'✓ Nから0.5m位置を指定しました',
    4:w13Pts.length===0?'Nから1m位置（紫線）の端をタップ':w13Pts.length===1?'もう一方の端をタップ':'✓ Nから1m位置を指定しました',
    5:w23Pts.length===0?'Tから1m位置（オレンジ線）の端をタップ':w23Pts.length===1?'もう一方の端をタップ':'✓ Tから1m位置を指定しました',
    6:w45Pts.length===0?'Tから0.5m位置（ピンク線）の端をタップ':w45Pts.length===1?'もう一方の端をタップ':'✓ Tから0.5m位置を指定しました',
    7:'テールの形状を選択してください',
    8:tailWPts.length===0?'テール幅の端をタップ（左右どちらからでもOK）':tailWPts.length===1?'もう一方の端をタップ':'✓ テール幅を指定しました',
    9:'採寸完了',
  };
  const canNext={
    0:!!imgSrc&&parseFloat(boardLen)>0,
    1:!!nosePt&&!!tailPt,
    2:maxPts.length===2,
    3:w05Pts.length===2,
    4:w13Pts.length===2,
    5:w23Pts.length===2,
    6:w45Pts.length===2,
    8:tailWPts.length===2,
  };
  const canUndo={1:!!nosePt,2:maxPts.length>0,3:w05Pts.length>0,4:w13Pts.length>0,5:w23Pts.length>0,6:w45Pts.length>0,8:tailWPts.length>0};

  const inputSt={flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(0,201,177,.25)',borderRadius:8,padding:'11px 12px',color:'#f0f7f6',fontFamily:'monospace',fontSize:20,outline:'none',WebkitAppearance:'none'};
  const btnP=(dis)=>({display:'block',width:'calc(100% - 32px)',margin:'12px 16px 0',padding:14,background:dis?'#4a6274':'#00c9b1',color:'#0d1b2a',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:dis?'not-allowed':'pointer',opacity:dis?.38:1});
  const btnS={display:'block',width:'calc(100% - 32px)',margin:'8px 16px 0',padding:11,background:'transparent',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,color:'#4a6274',fontSize:13,cursor:'pointer'};
  const btnUndo=(dis)=>({display:'inline-flex',alignItems:'center',gap:6,margin:'10px 16px 0',padding:'9px 14px',background:'rgba(224,92,92,.08)',border:'1px solid rgba(224,92,92,.25)',borderRadius:8,color:'#e05c5c',fontSize:13,cursor:dis?'not-allowed':'pointer',opacity:dis?.3:1});
  const ibox={margin:'12px 16px 0',padding:14,background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,201,177,.15)',borderRadius:12};
  const instr={margin:'14px 16px 0',padding:'12px 16px',borderRadius:10,background:'rgba(0,201,177,.07)',border:'1px solid rgba(0,201,177,.2)',fontSize:13,color:'#c8b89a',lineHeight:1.5};

  return (
    <div style={{width:'100%',maxWidth:480,margin:'0 auto',padding:'0 0 60px',fontFamily:'Inter,sans-serif',background:'#0d1b2a',minHeight:'100vh',color:'#e8dcc8'}}>

      <div style={{padding:'24px 16px 16px',borderBottom:'1px solid rgba(0,201,177,.15)'}}>
        <div style={{fontSize:24,color:'#f0f7f6',fontWeight:700}}>Board<span style={{color:'#00c9b1',fontStyle:'italic'}}>Measure</span></div>
        <div style={{marginTop:4,fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'#4a6274'}}>オーダーメイドケースのための採寸システム</div>
      </div>

      <div style={{display:'flex',margin:'16px 16px 0'}}>
        {STEP_LABELS.map((label,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',fontSize:9,paddingBottom:7,textTransform:'uppercase',letterSpacing:'0.04em',borderBottom:`2px solid ${i===step?'#00c9b1':i<step?'#009e8d':'rgba(255,255,255,.06)'}`,color:i===step?'#00c9b1':i<step?'#009e8d':'#4a6274'}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{i+1}</div>
            {label}
          </div>
        ))}
      </div>

      <div style={instr}><strong style={{color:'#00c9b1',display:'block',marginBottom:2}}>{instrMap[step]}</strong></div>

      {step===0 && (
        <div>
          <div onClick={()=>fileRef.current.click()} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'14px 16px 0',aspectRatio:'4/3',border:'2px dashed rgba(0,201,177,.3)',borderRadius:14,cursor:'pointer',background:'rgba(0,201,177,.03)',overflow:'hidden',position:'relative'}}>
            {imgSrc
              ? <img src={imgSrc} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}} />
              : <><div style={{fontSize:40,marginBottom:10}}>📷</div><div style={{fontSize:14,color:'#c8b89a'}}>タップして写真を選択</div></>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f)handleFile(f);}} />
          <div style={ibox}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
              <label style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',color:'#4a6274'}}>ボードの全長 <span style={{color:'#00c9b1'}}>*必須</span></label>
              <span style={{fontSize:10,color:'#4a6274'}}>※センチかインチどちらか記入</span>
            </div>
            <div>
              <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                <input type="text" inputMode="numeric" placeholder="9" value={lenFt} onChange={e=>onLenFtChange(e.target.value)} autoComplete="off" style={{...inputSt,width:52,flex:'none',fontSize:20}} />
                <span style={{color:'#4a6274',fontSize:13,flexShrink:0}}>ft</span>
                <input type="text" inputMode="decimal" placeholder="6" value={lenIn} onChange={e=>onLenInChange(e.target.value)} autoComplete="off" style={{...inputSt,fontSize:20,flex:1,minWidth:0}} />
                <span style={{color:'#4a6274',fontSize:13,flexShrink:0,width:20}}>in</span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input type="text" inputMode="decimal" placeholder="289.6" value={boardLen} onChange={e=>onLenCmChange(e.target.value)} autoComplete="off" style={inputSt} />
                <span style={{color:'#4a6274',fontSize:13,flexShrink:0}}>cm</span>
              </div>
            </div>
          </div>
          <div style={ibox}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
              <label style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.1em',color:'#4a6274'}}>最大幅 <span style={{color:'#00c9b1'}}>*必須</span></label>
              <span style={{fontSize:10,color:'#4a6274'}}>※センチかインチどちらか記入</span>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
              <input type="text" inputMode="numeric" placeholder="23" value={maxWInt} onChange={e=>onMaxWInchChange(e.target.value,undefined,undefined)} autoComplete="off" style={{...inputSt,width:52,flex:'none',fontSize:20}} />
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,gap:2}}>
                <input type="text" inputMode="numeric" placeholder="0" value={maxWNum} onChange={e=>onMaxWInchChange(undefined,e.target.value,undefined)} autoComplete="off" style={{...inputSt,fontSize:16,textAlign:'center',padding:'5px 4px'}} />
                <div style={{height:2,width:'80%',background:'rgba(255,255,255,.35)',borderRadius:1}}></div>
                <input type="text" inputMode="numeric" placeholder="0" value={maxWDen} onChange={e=>onMaxWInchChange(undefined,undefined,e.target.value)} autoComplete="off" style={{...inputSt,fontSize:16,textAlign:'center',padding:'5px 4px'}} />
              </div>
              <span style={{color:'#4a6274',fontSize:13,flexShrink:0}}>in</span>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input type="text" inputMode="decimal" placeholder="58.4" value={maxWInput} onChange={e=>onMaxWCmChange(e.target.value)} autoComplete="off" style={inputSt} />
              <span style={{color:'#4a6274',fontSize:13,flexShrink:0}}>cm</span>
            </div>
          </div>
          <button disabled={!canNext[0]} onClick={()=>{setNosePt(null);setTailPt(null);setStep(1);}} style={btnP(!canNext[0])}>次へ：端点を指定する →</button>
        </div>
      )}

      {step>=1&&step<=6 && (
        <div>
          <div style={{margin:'14px 32px 0',borderRadius:12,overflow:'hidden',background:'#000',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',position:'relative'}}>
            <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{display:'block',width:'100%',touchAction:'none',cursor:'crosshair'}} />
          </div>
          <canvas ref={zoomRef} style={{display:'none',position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:999,pointerEvents:'none',background:'#000'}} />
          <div style={{margin:'8px 16px 0',display:'flex',flexWrap:'wrap',gap:8}}>
            {[{c:'#ff6b6b',l:'ノーズ'},{c:'#ffd93d',l:'テール'},{c:'#00c9b1',l:'最大幅'},{c:'#34d399',l:'N0.5m'},{c:'#a78bfa',l:'N1m'},{c:'#fb923c',l:'T1m'},{c:'#f472b6',l:'T0.5m'}].map(({c,l})=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#4a6274'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:c}}></div>{l}
              </div>
            ))}
          </div>
          <button disabled={!canUndo[step]} onClick={undo} style={btnUndo(!canUndo[step])}>↩ 直前に戻す</button>
          {step===1 && <button disabled={!canNext[1]} onClick={()=>{setMaxPts([]);setStep(2);}} style={btnP(!canNext[1])}>次へ：最大幅を指定する →</button>}
          {step===2 && <button disabled={!canNext[2]} onClick={()=>{setW05Pts([]);setStep(3);}} style={btnP(!canNext[2])}>次へ：Nから0.5m位置の幅を指定する →</button>}
          {step===3 && <button disabled={!canNext[3]} onClick={()=>{setW13Pts([]);setStep(4);}} style={btnP(!canNext[3])}>次へ：Nから1m位置の幅を指定する →</button>}
          {step===4 && <button disabled={!canNext[4]} onClick={()=>{setW23Pts([]);setStep(5);}} style={btnP(!canNext[4])}>次へ：Tから1m位置の幅を指定する →</button>}
          {step===5 && <button disabled={!canNext[5]} onClick={()=>{setStep(6);}} style={btnP(!canNext[5])}>次へ：Tから0.5m位置の幅を指定する →</button>}
          {step===6 && <button disabled={!canNext[6]} onClick={()=>setStep(7)} style={btnP(!canNext[6])}>次へ：テール形状を選択する →</button>}
          <button onClick={()=>{
            if(step===2){setMaxPts([]);}
            else if(step===3){setW05Pts([]);}
            else if(step===4){setW13Pts([]);}
            else if(step===5){setW23Pts([]);}
            else if(step===6){setW45Pts([]);}
            setStep(s=>s-1);
          }} style={btnS}>← 前のステップに戻る</button>
        </div>
      )}

      {step===7 && (
        <div>
          <div style={{margin:'24px 16px 0',display:'flex',flexDirection:'column',gap:16}}>
            <button onClick={()=>{setIsPinTail(true);goResult(true);}} style={{padding:'20px 16px',borderRadius:14,border:'2px solid rgba(0,201,177,0.4)',background:'rgba(0,201,177,0.08)',color:'#00c9b1',fontSize:18,fontWeight:700,cursor:'pointer',letterSpacing:1}}>
              ピンテール
            </button>
            <button onClick={()=>{setIsPinTail(false);setTailWPts([]);setStep(8);}} style={{padding:'20px 16px',borderRadius:14,border:'2px solid rgba(168,139,250,0.4)',background:'rgba(168,139,250,0.08)',color:'#a78bfa',fontSize:18,fontWeight:700,cursor:'pointer',letterSpacing:1}}>
              それ以外
            </button>
          </div>
          <button onClick={()=>setStep(6)} style={{...btnS,marginTop:16}}>← 前のステップに戻る</button>
        </div>
      )}

      {step===8 && (
        <div>
          <div style={{margin:'14px 32px 0',borderRadius:12,overflow:'hidden',background:'#000',touchAction:'none',userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',position:'relative'}}>
            <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{display:'block',width:'100%',touchAction:'none',cursor:'crosshair'}} />
          </div>
          <canvas ref={zoomRef} style={{display:'none',position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:999,pointerEvents:'none',background:'#000'}} />
          <div style={{margin:'8px 16px 0',display:'flex',flexWrap:'wrap',gap:8}}>
            {[{c:'#ff6b6b',l:'ノーズ'},{c:'#ffd93d',l:'テール'},{c:'#e879f9',l:'T幅'}].map(({c,l})=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#4a6274'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:c}}></div>{l}
              </div>
            ))}
          </div>
          <button disabled={!canUndo[8]} onClick={undo} style={btnUndo(!canUndo[8])}>↩ 直前に戻す</button>
          <button disabled={!canNext[8]} onClick={()=>goResult(false)} style={btnP(!canNext[8])}>採寸結果を見る →</button>
          <button onClick={()=>{setTailWPts([]);setStep(7);}} style={btnS}>← 前のステップに戻る</button>
        </div>
      )}

      {step===9&&resultData && (
        <div>
          {resultImg && <div style={{margin:'14px 16px 0',borderRadius:12,overflow:'hidden'}}><img src={resultImg} alt="採寸結果" style={{display:'block',width:'100%'}} /></div>}
          <div style={{margin:'14px 16px 0',display:'flex',flexDirection:'column',gap:8}}>
            {[
              {color:'#00c9b1',label:'全長',val:resultData.bLen,sub:null},
              {color:'#00c9b1',label:'最大幅',val:resultData.maxWcm,sub:null},
              {color:'#34d399',label:'Nから0.5mの幅',val:resultData.w05cm,sub:'ノーズから 50cm の位置'},
              {color:'#a78bfa',label:'Nから1mの幅',val:resultData.w13cm,sub:'ノーズから 100cm の位置'},
              {color:'#fb923c',label:'Tから1mの幅',val:resultData.w23cm,sub:'テールから 100cm の位置'},
              {color:'#f472b6',label:'Tから0.5mの幅',val:resultData.w45cm,sub:'テールから 50cm の位置'},
              ...(resultData.tailWcm!==null?[{color:'#e879f9',label:'T幅',val:resultData.tailWcm,sub:'テール下端の幅'}]:[]),
            ].map(({color,label,val,sub})=>(
              <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(0,201,177,.1)',borderRadius:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}></div>
                  <div>
                    <div style={{fontSize:13,color:'#c8b89a'}}>{label}</div>
                    {sub&&<div style={{fontSize:10,color:'#4a6274',marginTop:2}}>{sub}</div>}
                  </div>
                </div>
                <div style={{fontFamily:'monospace',fontSize:20,fontWeight:500,color:'#f0f7f6'}}>
                  {val}<span style={{fontSize:11,color:'#4a6274',marginLeft:2}}>cm</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={resetAll} style={{...btnS,marginTop:20}}>別のボードを採寸する</button>
        </div>
      )}

    </div>
  );
}
