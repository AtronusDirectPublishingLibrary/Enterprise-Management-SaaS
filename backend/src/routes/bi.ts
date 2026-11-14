import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("bi"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const reports = await prisma.biReport.findMany({ select:{status:true,category:true} });
  res.json({ total: reports.length, active: reports.filter(r=>r.status==="ACTIVE").length, categories: Array.from(new Set(reports.map(r=>r.category).filter(Boolean))) });
});
router.get("/reports", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const category=String(req.query.category||""); let items=await prisma.biReport.findMany({ where: category?{category}:undefined, orderBy:{updatedAt:"desc"}, take:500 }); if(q) items=items.filter(r=>[r.code,r.name,r.category,r.description,r.dataset].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.biReport.findMany({orderBy:{updatedAt:"desc"}}); sendCsv(res,"bi-reports.csv",toCsv(items.map(r=>({code:r.code,name:r.name,category:r.category,status:r.status,dataset:r.dataset,owner:r.owner,description:r.description,updatedAt:r.updatedAt})))); });
router.get("/insights", async (_req,res)=>{ const [proc, inv, acc, maint, crm, tickets, contracts, risks] = await Promise.all([
  prisma.purchaseOrder.aggregate({_count:{_all:true},_sum:{total:true}}).catch(()=>null),
  prisma.inventoryItem.aggregate({_count:{_all:true}}).catch(()=>null),
  prisma.customerInvoice.aggregate({_sum:{balance:true,amount:true}}).catch(()=>null),
  prisma.maintenanceWorkOrder.count({where:{status:{in:["OPEN","IN_PROGRESS"]}}}).catch(()=>0),
  prisma.crmDeal.aggregate({_count:{_all:true},_sum:{value:true}}).catch(()=>null),
  prisma.supportTicket.count({where:{status:{in:["OPEN","IN_PROGRESS"]}}}).catch(()=>0),
  prisma.contractRecord.count({where:{status:"ACTIVE"}}).catch(()=>0),
  prisma.riskItem.count({where:{status:{not:"CLOSED"},score:{gte:12}}}).catch(()=>0),
]); res.json({ procurement:{orders:proc?._count?._all||0,total:proc?._sum?.total||0}, inventory:{items:inv?._count?._all||0}, ar:{balance:acc?._sum?.balance||0,invoiced:acc?._sum?.amount||0}, maintenance:{openWorkOrders:maint}, crm:{deals:crm?._count?._all||0,pipelineValue:crm?._sum?.value||0}, helpdesk:{openTickets:tickets}, contracts:{active:contracts}, grc:{highRisks:risks}, generatedAt:new Date()}); });
router.post("/reports", async (req,res)=>{ const b=req.body||{}; if(!b.name) return res.status(400).json({message:"name required"}); res.status(201).json(await prisma.biReport.create({data:{code:b.code||no("BI"),name:String(b.name).trim(),category:b.category||null,description:b.description||null,dataset:b.dataset||null,config:b.config??null,owner:b.owner||(req as any).user?.username||null,status:b.status||"ACTIVE"} as any})); });
router.put("/reports/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.biReport.update({where:{id:req.params.id},data:{...(b.name!==undefined?{name:String(b.name)}:{}),...(b.status!==undefined?{status:b.status}:{}),...(b.category!==undefined?{category:b.category||null}:{}),...(b.description!==undefined?{description:b.description||null}:{}),...(b.dataset!==undefined?{dataset:b.dataset||null}:{}),...(b.owner!==undefined?{owner:b.owner||null}:{}),...(b.config!==undefined?{config:b.config}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/reports/:id", async (req,res)=>{ try{ await prisma.biReport.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
