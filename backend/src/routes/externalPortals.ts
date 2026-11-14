import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("portals"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const items = await prisma.portalRequest.findMany({ select:{status:true,portalType:true} });
  res.json({ total: items.length, open: items.filter(i=>["OPEN","IN_REVIEW"].includes(i.status)).length, byType:["CUSTOMER","PARTNER","VENDOR"].map(t=>({type:t,count:items.filter(i=>i.portalType===t).length})) });
});
router.get("/requests", async (req,res)=> { const portalType = req.query.type ? String(req.query.type) : undefined; const status = req.query.status ? String(req.query.status) : undefined; const q=String(req.query.q||"").toLowerCase(); let items = await prisma.portalRequest.findMany({ where: { ...(portalType?{portalType}:{}), ...(status?{status}:{}) }, orderBy:{createdAt:"desc"}, take:500 }); if(q) items=items.filter(r=>[r.requestNo,r.subject,r.requester,r.company].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.portalRequest.findMany({orderBy:{createdAt:"desc"}}); sendCsv(res,"portal-requests.csv",toCsv(items.map(r=>({requestNo:r.requestNo,portalType:r.portalType,subject:r.subject,requester:r.requester,company:r.company,priority:r.priority,status:r.status,createdAt:r.createdAt,response:r.response})))); });
router.post("/requests", async (req,res)=>{ const b=req.body||{}; if(!b.subject) return res.status(400).json({message:"subject required"}); res.status(201).json(await prisma.portalRequest.create({data:{portalType:b.portalType||"CUSTOMER",requestNo:b.requestNo||no("PR"),subject:String(b.subject).trim(),requester:b.requester||(req as any).user?.username||null,company:b.company||null,status:b.status||"OPEN",priority:b.priority||"MEDIUM",description:b.description||null,response:b.response||null} as any})); });
router.put("/requests/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.portalRequest.update({where:{id:req.params.id},data:{...(b.status!==undefined?{status:b.status}:{}),...(b.priority!==undefined?{priority:b.priority}:{}),...(b.response!==undefined?{response:b.response||null}:{}),...(b.description!==undefined?{description:b.description||null}:{}),...(b.subject!==undefined?{subject:String(b.subject)}:{}),...(b.requester!==undefined?{requester:b.requester||null}:{}),...(b.company!==undefined?{company:b.company||null}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/requests/:id", async (req,res)=>{ try{ await prisma.portalRequest.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
