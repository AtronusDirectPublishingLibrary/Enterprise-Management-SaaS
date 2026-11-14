import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("contracts"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const items = await prisma.contractRecord.findMany({ select:{status:true,value:true,endDate:true,renewalDate:true} });
  const now = Date.now(); const soon = now + 30*24*3600*1000;
  const expiring = items.filter(c=>c.endDate && c.status==="ACTIVE" && new Date(c.endDate).getTime() <= soon && new Date(c.endDate).getTime() >= now).length;
  const expiredActive = items.filter(c=>c.endDate && c.status==="ACTIVE" && new Date(c.endDate).getTime() < now).length;
  res.json({ total: items.length, active: items.filter(c=>c.status==="ACTIVE").length, draft: items.filter(c=>c.status==="DRAFT").length, expired: items.filter(c=>c.status==="EXPIRED").length, expiringSoon: expiring, expiredButActive: expiredActive, totalValue: items.filter(c=>c.status!=="TERMINATED").reduce((s,c)=>s+Number(c.value||0),0) });
});

router.get("/export", async (_req,res)=>{
  const items = await prisma.contractRecord.findMany({ orderBy:{updatedAt:"desc"} });
  sendCsv(res, "contracts.csv", toCsv(items.map(c=>({contractNo:c.contractNo,title:c.title,party:c.party,type:c.type,status:c.status,value:c.value,currency:c.currency,startDate:c.startDate,endDate:c.endDate,renewalDate:c.renewalDate,owner:c.owner,notes:c.notes,updatedAt:c.updatedAt}))));
});

router.get("/alerts", async (_req,res)=>{
  const now = new Date(); const soon = new Date(Date.now()+30*24*3600*1000);
  const items = await prisma.contractRecord.findMany({ where:{ status:"ACTIVE", OR:[{ endDate:{ lte: soon } }, { renewalDate:{ lte: soon } }] }, orderBy:{endDate:"asc"} });
  res.json(items.map(c=>({ ...c, alert: c.endDate && c.endDate < now ? "EXPIRED" : "EXPIRING_SOON" })));
});
router.get("/", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const status=String(req.query.status||""); let items=await prisma.contractRecord.findMany({ where: status?{status}:undefined, orderBy:{updatedAt:"desc"}, take:500 }); if(q) items=items.filter(c=>[c.contractNo,c.title,c.party,c.type,c.owner].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.post("/", async (req,res)=>{ const b=req.body||{}; if(!b.title) return res.status(400).json({message:"title required"}); res.status(201).json(await prisma.contractRecord.create({data:{contractNo:b.contractNo||no("CTR"),title:String(b.title).trim(),party:b.party||null,type:b.type||null,value:Number(b.value||0),currency:b.currency||"ETB",status:b.status||"DRAFT",startDate:b.startDate?new Date(b.startDate):null,endDate:b.endDate?new Date(b.endDate):null,renewalDate:b.renewalDate?new Date(b.renewalDate):null,owner:b.owner||(req as any).user?.username||null,notes:b.notes||null} as any})); });
router.put("/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.contractRecord.update({where:{id:req.params.id},data:{...(b.title!==undefined?{title:String(b.title)}:{}),...(b.status!==undefined?{status:b.status}:{}),...(b.party!==undefined?{party:b.party||null}:{}),...(b.type!==undefined?{type:b.type||null}:{}),...(b.value!==undefined?{value:Number(b.value)}:{}),...(b.startDate!==undefined?{startDate:b.startDate?new Date(b.startDate):null}:{}),...(b.endDate!==undefined?{endDate:b.endDate?new Date(b.endDate):null}:{}),...(b.renewalDate!==undefined?{renewalDate:b.renewalDate?new Date(b.renewalDate):null}:{}),...(b.owner!==undefined?{owner:b.owner||null}:{}),...(b.notes!==undefined?{notes:b.notes||null}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/:id", async (req,res)=>{ try{ await prisma.contractRecord.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
