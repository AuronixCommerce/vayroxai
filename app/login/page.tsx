"use client";
import { useState,useEffect,type FormEvent } from "react";
import { ArrowLeft,ArrowRight,ArrowUpRight,Eye,EyeOff,LoaderCircle,ShieldCheck,Mail,LockKeyhole,UserRound,Check,Sparkles } from "lucide-react";
import { Mark } from "@/components/harium";
import IntelligenceScene from "@/components/intelligence-scene";
import "./login.css";
type Mode="login"|"signup"|"reset";
export default function Login(){
 const [mode,setMode]=useState<Mode>("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{if(new URLSearchParams(location.search).get("mode")==="signup")setMode("signup");},[]);
 function changeMode(next:Mode){setMode(next);setError("");setNotice("");history.replaceState(null,"",next==="signup"?"/login?mode=signup":"/login");}
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:mode,email,...(mode!=="reset"?{password}:{}),...(mode==="signup"?{name}:{})})});const d=await r.json() as {error?:string;message?:string};if(!r.ok)throw Error(d.error);if(mode==="reset")setNotice(d.message||"Check your email for reset instructions.");else location.assign("/");}catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}}
 return <div className="auth-page">
  <section className="auth-story" aria-label="About Vayrox AI">
   <a href="/" className="auth-logo" aria-label="Vayrox AI home"><Mark/><span>Vayrox <small>AI</small></span></a>
   <div className="auth-story-copy"><div className="auth-eyebrow"><span/> POWERED BY CHOHAN GEN AI</div><h1>A little curiosity.<br/><em>A whole new world.</em></h1><p>Make room for your next idea.<br/>We’ll help you turn it into something remarkable.</p></div>
   <div className="auth-art"><IntelligenceScene model="swift"/></div>
   <div className="auth-story-bottom"><div className="auth-capabilities"><span>WRITE</span><i/><span>BUILD</span><i/><span>RESEARCH</span><i/><span>THINK</span></div><p>Your mind. With more room.</p><span className="auth-edition">VAYROX AI / BY CHOHAN GEN AI</span></div>
  </section>
  <main className="auth-form-side"><a className="auth-back" href="/"><ArrowLeft size={14}/>Back to workspace</a><div className="auth-form-wrap">
   {mode!=="reset"?<div className={`auth-tabs ${mode==="signup"?"signup-selected":""}`} role="group" aria-label="Account access"><i/><button type="button" aria-pressed={mode==="login"} onClick={()=>changeMode("login")} disabled={busy}>Sign in</button><button type="button" aria-pressed={mode==="signup"} onClick={()=>changeMode("signup")} disabled={busy}>Create account</button></div>:<button className="auth-return" onClick={()=>changeMode("login")}><ArrowLeft size={13}/>Back to sign in</button>}
   <div className="auth-form-heading"><span className="auth-form-kicker"><Sparkles size={12}/>{mode==="signup"?"A SPACE OF YOUR OWN":mode==="reset"?"LET’S GET YOU BACK IN":"GOOD TO SEE YOU AGAIN"}</span><h2>{mode==="signup"?"Begin something good.":mode==="reset"?"A fresh start.":"Welcome back."}</h2><p>{mode==="signup"?"Create your account. Keep your conversations, discoveries, and best ideas together.":mode==="reset"?"Enter your email and we’ll send a link to reset your password.":"Sign in to pick up your conversations and explore what’s next."}</p></div>
   <form onSubmit={submit} className="auth-form">
    {mode==="signup"&&<label htmlFor="auth-name">Your name<div className="auth-input"><UserRound size={16}/><input id="auth-name" required autoComplete="name" placeholder="What should we call you?" value={name} onChange={e=>setName(e.target.value)} maxLength={80} disabled={busy}/></div></label>}
    <label htmlFor="auth-email">Email address<div className="auth-input"><Mail size={16}/><input id="auth-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} maxLength={200} disabled={busy}/></div></label>
    {mode!=="reset"&&<label htmlFor="auth-password"><span className="auth-label-row">Password{mode==="login"&&<button type="button" onClick={()=>changeMode("reset")} disabled={busy}>Forgot password?</button>}</span><div className="auth-input"><LockKeyhole size={16}/><input id="auth-password" aria-label="Password" type={visible?"text":"password"} required minLength={6} maxLength={200} autoComplete={mode==="signup"?"new-password":"current-password"} placeholder={mode==="signup"?"Create a password":"Enter your password"} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button className="auth-eye" type="button" aria-label={visible?"Hide password":"Show password"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{mode==="signup"&&<small className={`auth-password-hint ${password.length>=6?"valid":""}`}><Check size={11}/>At least 6 characters</small>}</label>}
    {error&&<div className="auth-feedback error" role="alert">{error}</div>}{notice&&<div className="auth-feedback" role="status"><Check size={15}/>{notice}</div>}
    <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle size={16} className="auth-spinner"/>:null}<span>{busy?"One moment…":mode==="signup"?"Create my account":mode==="reset"?"Send reset link":"Sign in to Vayrox"}</span><ArrowUpRight size={18}/></button>
   </form>
   <div className="auth-benefits"><span><ShieldCheck size={14}/>Your own private workspace</span><span><Check size={13}/>Chats saved across devices</span></div>
   <div className="auth-divider"><span>OR KEEP EXPLORING</span></div><a className="auth-guest" href="/">Continue as guest <ArrowRight size={14}/></a><p className="auth-guest-note">14 free messages every 4 hours. Guest chats aren’t saved.</p>
  </div><footer className="auth-form-footer"><span>VAYROX AI</span><span>Powered by Chohan Gen AI <span>✧</span></span></footer></main>
 </div>;
}
