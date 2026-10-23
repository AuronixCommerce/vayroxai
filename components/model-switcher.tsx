"use client";
import { useEffect,useRef,useState } from "react";
import { Zap,Code2,Globe,Feather,BrainCircuit } from "lucide-react";
import { hariumModels,type HariumModelId } from "@/lib/harium-models";
const icons={swift:Zap,code:Code2,research:Globe,studio:Feather,think:BrainCircuit};
export function ModelSwitcher({selected,onChange,enabled,disabled=false}:{selected:HariumModelId;onChange:(id:HariumModelId)=>void;enabled:readonly HariumModelId[];disabled?:boolean}){
 const ref=useRef<HTMLDivElement>(null);const [position,setPosition]=useState({x:0,width:0});
 useEffect(()=>{const update=()=>{const button=ref.current?.querySelector<HTMLButtonElement>(`[data-model="${selected}"]`);if(button)setPosition({x:button.offsetLeft,width:button.offsetWidth});};update();const observer=new ResizeObserver(update);if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[selected,enabled]);
 return <div ref={ref} className="model-rail" role="group" aria-label="Choose your Vayrox model"><span className="model-selection" style={{transform:`translateX(${position.x}px)`,width:position.width}}/>{hariumModels.filter(m=>enabled.includes(m.id)).map(m=>{const Icon=icons[m.id];return <button key={m.id} data-model={m.id} className={selected===m.id?"active":""} aria-pressed={selected===m.id} disabled={disabled} onClick={()=>onChange(m.id)} onKeyDown={e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;e.preventDefault();const list=hariumModels.filter(v=>enabled.includes(v.id));const index=list.findIndex(v=>v.id===m.id);const next=list[(index+(e.key==="ArrowRight"?1:-1)+list.length)%list.length];onChange(next.id);ref.current?.querySelector<HTMLButtonElement>(`[data-model="${next.id}"]`)?.focus();}}><Icon size={14}/><span>{m.short}</span></button>;})}</div>;
}
