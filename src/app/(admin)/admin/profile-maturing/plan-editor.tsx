'use client';
import {useEffect,useRef} from 'react';
import {configureMatureEditor,loadMaturePlan,readMaturePlan,renderMaturePlan} from '@/lib/maturing/shared/mature-profile-editor.mjs';
import './desktop-editor.css';
export default function PlanEditor({initial,profileId,onChange}:{initial:unknown;profileId:string;onChange:(plan:unknown)=>void}){
 const change=useRef(onChange);useEffect(()=>{change.current=onChange;},[onChange]);
 useEffect(()=>{
  configureMatureEditor((url:string,options?:RequestInit)=>{const local=new URL(url,window.location.origin);local.searchParams.set('profileId',profileId);return fetch('/api/admin/profile-maturing/desktop'+local.pathname.replace(/^\/api/,'')+local.search,options);});
  loadMaturePlan(initial);
  renderMaturePlan({onChange:()=>change.current(readMaturePlan())});
 },[initial,profileId]);
 return <div className="maturing-desktop-editor"><div id="mature-plan-editor"/><div id="mature-plan-summary"/></div>;
}
