'use client';

import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: string; kind: Kind; message: string; duration: number };

const Ctx = createContext<{
  success: (m:string, o?:{duration?:number})=>void;
  error:   (m:string, o?:{duration?:number})=>void;
  info:    (m:string, o?:{duration?:number})=>void;
} | null>(null);

export function LocalToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message:string, kind:Kind, o?:{duration?:number}) => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      kind, message, duration: Math.max(1000, Math.min(15000, o?.duration ?? 4000))
    }]);
  }, []);
  const api = useMemo(() => ({
    success: (m:string, o?:any)=>push(m,'success',o),
    error:   (m:string, o?:any)=>push(m,'error',o),
    info:    (m:string, o?:any)=>push(m,'info',o),
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <LocalToastViewport items={items} onDone={(id)=>setItems(p=>p.filter(t=>t.id!==id))}/>
    </Ctx.Provider>
  );
}

export function useLocalToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocalToast() muss innerhalb von <LocalToastProvider> genutzt werden');
  return ctx;
}

function LocalToastViewport({ items, onDone }: { items: Toast[]; onDone:(id:string)=>void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(()=>setMounted(true),[]);
  if (!mounted) return null;

  return createPortal(
    <div style={{position:'fixed',right:16,bottom:16,zIndex:1000,display:'flex',flexDirection:'column',gap:10,pointerEvents:'none'}}>
      {items.map(t => <Item key={t.id} t={t} onDone={()=>onDone(t.id)} />)}
    </div>,
    document.body
  );
}

function Item({ t, onDone }: { t: Toast; onDone:()=>void }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(()=>{ setFade(true); setTimeout(onDone, 160); }, t.duration);
    return ()=>clearTimeout(id);
  }, [t.duration, onDone]);

  const bg = t.kind==='success' ? '#065f46' : t.kind==='error' ? '#7f1d1d' : '#1f2937';
  return (
    <div style={{
      pointerEvents:'auto',minWidth:260,maxWidth:420,color:'#fff',background:bg,borderRadius:12,
      boxShadow:'0 10px 30px rgba(0,0,0,.25)',padding:'12px 14px',
      transform:`translateY(${fade?8:0}px)`,opacity:fade?0:1,transition:'opacity 160ms, transform 160ms',
      display:'flex',alignItems:'center',gap:10
    }}>
      <span aria-hidden style={{width:10,height:10,borderRadius:'50%',background:'#fff',opacity:.8}} />
      <div style={{flex:1,lineHeight:1.35}}>{t.message}</div>
      <button onClick={()=>{setFade(true); setTimeout(onDone,160);}} aria-label="schließen"
        style={{background:'transparent',border:'none',color:'#fff',opacity:.85,cursor:'pointer',fontSize:16,padding:4}}>×</button>
    </div>
  );
}
