import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("resources"));

router.get("/summary", async (_req,res)=>{
  const items = await prisma.resourceAllocation.findMany({ select:{status:true,allocation:true,resource:true,project:true} });
  const active = items.filter(i=>i.status==="ACTIVE"||i.status==="PLANNED");
  const avg = active.length ? Math.round(active.reduce((s,i)=>s+Number(i.allocation||0),0)/active.length) : 0;
  res.json({ total: items.length, active: items.filter(i=>i.status==="ACTIVE").length, planned: items.filter(i=>i.status==="PLANNED").length, avgAllocation: avg, resources: new Set(items.map(i=>i.resource)).size, projects: new Set(items.map(i=>i.project).filter(Boolean)).size });
});
router.get("/allocations", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const status=String(req.query.status||""); let items=await prisma.resourceAllocation.findMany({ where: status?{status}:undefined, orderBy:{updatedAt:"desc"}, take:500 }); if(q) items=items.filter(r=>[r.resource,r.role,r.project,r.notes].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.resourceAllocation.findMany({orderBy:{updatedAt:"desc"}}); sendCsv(res,"resource-allocations.csv",toCsv(items.map(r=>({resource:r.resource,role:r.role,project:r.project,allocation:r.allocation,status:r.status,startDate:r.startDate,endDate:r.endDate,notes:r.notes})))); });
router.post("/allocations", async (req,res)=>{ const b=req.body||{}; if(!b.resource) return res.status(400).json({message:"resource required"}); res.status(201).json(await prisma.resourceAllocation.create({data:{resource:String(b.resource).trim(),role:b.role||null,project:b.project||null,allocation:Math.max(0,Math.min(200,Number(b.allocation ?? 100))),startDate:b.startDate?new Date(b.startDate):null,endDate:b.endDate?new Date(b.endDate):null,status:b.status||"PLANNED",notes:b.notes||null} as any})); });
router.put("/allocations/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.resourceAllocation.update({where:{id:req.params.id},data:{...(b.resource!==undefined?{resource:String(b.resource)}:{}),...(b.role!==undefined?{role:b.role||null}:{}),...(b.project!==undefined?{project:b.project||null}:{}),...(b.allocation!==undefined?{allocation:Math.max(0,Math.min(200,Number(b.allocation)))}:{}),...(b.startDate!==undefined?{startDate:b.startDate?new Date(b.startDate):null}:{}),...(b.endDate!==undefined?{endDate:b.endDate?new Date(b.endDate):null}:{}),...(b.status!==undefined?{status:b.status}:{}),...(b.notes!==undefined?{notes:b.notes||null}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/allocations/:id", async (req,res)=>{ try{ await prisma.resourceAllocation.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
