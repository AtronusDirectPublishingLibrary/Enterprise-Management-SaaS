import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("helpdesk"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const items = await prisma.supportTicket.findMany({ select:{status:true,priority:true,createdAt:true,resolvedAt:true} });
  const open = items.filter(t=>!["RESOLVED","CLOSED"].includes(t.status));
  const resolved = items.filter(t=>t.resolvedAt).length;
  res.json({ total: items.length, open: open.length, resolved, urgent: open.filter(t=>t.priority==="URGENT"||t.priority==="HIGH").length, byStatus:["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s=>({status:s,count:items.filter(t=>t.status===s).length})) });
});
router.get("/tickets", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const status=String(req.query.status||""); let items=await prisma.supportTicket.findMany({ where: status?{status}:undefined, orderBy:{createdAt:"desc"}, take:500 }); if(q) items=items.filter(t=>[t.ticketNo,t.subject,t.requester,t.assignee,t.category].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.supportTicket.findMany({orderBy:{createdAt:"desc"}}); sendCsv(res,"helpdesk-tickets.csv",toCsv(items.map(t=>({ticketNo:t.ticketNo,subject:t.subject,category:t.category,priority:t.priority,status:t.status,requester:t.requester,assignee:t.assignee,createdAt:t.createdAt,dueAt:t.dueAt,resolvedAt:t.resolvedAt,description:t.description})))); });
router.post("/tickets", async (req,res)=>{ const b=req.body||{}; if(!b.subject) return res.status(400).json({message:"subject required"}); res.status(201).json(await prisma.supportTicket.create({data:{ticketNo:b.ticketNo||no("TKT"),subject:String(b.subject).trim(),description:b.description||null,requester:b.requester||(req as any).user?.username||null,assignee:b.assignee||null,category:b.category||null,priority:b.priority||"MEDIUM",status:b.status||"OPEN",dueAt:b.dueAt?new Date(b.dueAt):null} as any})); });
router.put("/tickets/:id", async (req,res)=>{ const b=req.body||{}; try{ const existing=await prisma.supportTicket.findFirst({where:{id:req.params.id}}); if(!existing) return res.status(404).json({message:"Not found"}); const data:any={...(b.status!==undefined?{status:b.status}:{}),...(b.priority!==undefined?{priority:b.priority}:{}),...(b.assignee!==undefined?{assignee:b.assignee||null}:{}),...(b.category!==undefined?{category:b.category||null}:{}),...(b.description!==undefined?{description:b.description||null}:{}),...(b.subject!==undefined?{subject:String(b.subject)}:{}),...(b.dueAt!==undefined?{dueAt:b.dueAt?new Date(b.dueAt):null}:{})}; if(b.status==="RESOLVED"||b.status==="CLOSED") data.resolvedAt = existing.resolvedAt || new Date(); if(b.status==="OPEN"||b.status==="IN_PROGRESS") data.resolvedAt = null; res.json(await prisma.supportTicket.update({where:{id:req.params.id},data})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/tickets/:id", async (req,res)=>{ try{ await prisma.supportTicket.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
