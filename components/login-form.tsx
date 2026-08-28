"use client";
import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const data=new FormData(event.currentTarget); const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:data.get("email"),password:data.get("password")})}); const body=await response.json(); if(!response.ok){setError(body.error);setLoading(false);return} router.push("/dashboard"); router.refresh(); }
  return <form onSubmit={submit} className="space-y-4"><div><label className="label" htmlFor="email">Email address</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" id="email" name="email" type="email" defaultValue="admin@medmatch.test" required/></div></div><div><label className="label" htmlFor="password">Password</label><div className="relative"><LockKeyhole className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" id="password" name="password" type="password" defaultValue="Admin@123" required/></div></div>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}<button className="btn-primary w-full" disabled={loading}>{loading?"Signing in…":"Sign in"}<ArrowRight size={17}/></button><div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><b>Demo accounts</b><br/>Admin: admin@medmatch.test / Admin@123<br/>Staff: staff@medmatch.test / Staff@123</div></form>;
}
