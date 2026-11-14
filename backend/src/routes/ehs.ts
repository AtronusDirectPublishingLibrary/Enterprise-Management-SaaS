import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("ehs"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const items = await prisma.safetyIncident.findMany({ select:{status:true,severity:true} });
  const open = items.filter(i=>!["RESOLVED","CLOSED"].includes(i.status));
  res.json({ total: items.length, open: open.length, critical: open.filter(i=>i.severity==="CRITICAL"||i.severity==="HIGH").length, resolved: items.filter(i=>i.status==="RESOLVED"||i.status==="CLOSED").length });
});
router.get("/incidents", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const status=String(req.query.status||""); let items=await prisma.safetyIncident.findMany({ where: status?{status}:undefined, orderBy:{createdAt:"desc"}, take:500 }); if(q) items=items.filter(i=>[i.incidentNo,i.title,i.type,i.location,i.reportedBy].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.safetyIncident.findMany({orderBy:{createdAt:"desc"}}); sendCsv(res,"ehs-incidents.csv",toCsv(items.map(i=>({incidentNo:i.incidentNo,title:i.title,type:i.type,severity:i.severity,status:i.status,location:i.location,occurredAt:i.occurredAt,reportedBy:i.reportedBy,corrective:i.corrective,description:i.description})))); });
router.post("/incidents", async (req,res)=>{ const b=req.body||{}; if(!b.title) return res.status(400).json({message:"title required"}); res.status(201).json(await prisma.safetyIncident.create({data:{incidentNo:b.incidentNo||no("EHS"),title:String(b.title).trim(),type:b.type||null,severity:b.severity||"LOW",status:b.status||"REPORTED",location:b.location||null,occurredAt:b.occurredAt?new Date(b.occurredAt):null,reportedBy:b.reportedBy||(req as any).user?.username||null,description:b.description||null,corrective:b.corrective||null} as any})); });
router.put("/incidents/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.safetyIncident.update({where:{id:req.params.id},data:{...(b.title!==undefined?{title:String(b.title)}:{}),...(b.status!==undefined?{status:b.status}:{}),...(b.severity!==undefined?{severity:b.severity}:{}),...(b.type!==undefined?{type:b.type||null}:{}),...(b.location!==undefined?{location:b.location||null}:{}),...(b.occurredAt!==undefined?{occurredAt:b.occurredAt?new Date(b.occurredAt):null}:{}),...(b.corrective!==undefined?{corrective:b.corrective||null}:{}),...(b.description!==undefined?{description:b.description||null}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/incidents/:id", async (req,res)=>{ try{ await prisma.safetyIncident.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
