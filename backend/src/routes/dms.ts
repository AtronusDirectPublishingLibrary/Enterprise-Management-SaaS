import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAccess, requireAuth } from "../middleware/auth";
import { sendCsv, toCsv } from "../lib/csv";

const router = Router();
router.use(requireAuth, requireAccess("dms"));
function no(p: string) { const d = new Date(); return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`; }

router.get("/summary", async (_req,res)=>{
  const items = await prisma.dmsRecord.findMany({ select:{status:true,category:true} });
  res.json({ total: items.length, active: items.filter(i=>i.status==="ACTIVE").length, archived: items.filter(i=>i.status==="ARCHIVED").length, categories: Array.from(new Set(items.map(i=>i.category).filter(Boolean))).length });
});
router.get("/records", async (req,res)=>{ const q=String(req.query.q||"").toLowerCase(); const status=String(req.query.status||""); const category=String(req.query.category||""); let items=await prisma.dmsRecord.findMany({ where:{ ...(status?{status}:{}), ...(category?{category}:{}) }, orderBy:{updatedAt:"desc"}, take:500 }); if(q) items=items.filter(r=>[r.recordNo,r.title,r.category,r.folder,r.owner,r.fileName].some(x=>String(x||"").toLowerCase().includes(q))) as any; res.json(items); });
router.get("/export", async (_req,res)=>{ const items=await prisma.dmsRecord.findMany({orderBy:{updatedAt:"desc"}}); sendCsv(res,"dms-records.csv",toCsv(items.map(r=>({recordNo:r.recordNo,title:r.title,category:r.category,folder:r.folder,version:r.version,status:r.status,owner:r.owner,tags:(r.tags||[]).join(";"),fileName:r.fileName,fileUrl:r.fileUrl,retentionUntil:r.retentionUntil,updatedAt:r.updatedAt})))); });
router.post("/records", async (req,res)=>{ const b=req.body||{}; if(!b.title) return res.status(400).json({message:"title required"}); res.status(201).json(await prisma.dmsRecord.create({data:{recordNo:b.recordNo||no("DOC"),title:String(b.title).trim(),category:b.category||null,folder:b.folder||null,version:b.version||"1.0",status:b.status||"ACTIVE",owner:b.owner||(req as any).user?.username||null,tags:Array.isArray(b.tags)?b.tags:(typeof b.tags==="string"?b.tags.split(",").map((s:string)=>s.trim()).filter(Boolean):[]),fileName:b.fileName||null,fileUrl:b.fileUrl||null,retentionUntil:b.retentionUntil?new Date(b.retentionUntil):null,notes:b.notes||null} as any})); });
router.put("/records/:id", async (req,res)=>{ const b=req.body||{}; try{ res.json(await prisma.dmsRecord.update({where:{id:req.params.id},data:{...(b.title!==undefined?{title:String(b.title)}:{}),...(b.status!==undefined?{status:b.status}:{}),...(b.category!==undefined?{category:b.category||null}:{}),...(b.folder!==undefined?{folder:b.folder||null}:{}),...(b.version!==undefined?{version:String(b.version)}:{}),...(b.owner!==undefined?{owner:b.owner||null}:{}),...(b.fileName!==undefined?{fileName:b.fileName||null}:{}),...(b.fileUrl!==undefined?{fileUrl:b.fileUrl||null}:{}),...(b.retentionUntil!==undefined?{retentionUntil:b.retentionUntil?new Date(b.retentionUntil):null}:{}),...(b.tags!==undefined?{tags:Array.isArray(b.tags)?b.tags:(typeof b.tags==="string"?b.tags.split(",").map((s:string)=>s.trim()).filter(Boolean):[])}:{}),...(b.notes!==undefined?{notes:b.notes||null}:{})}})); }catch{ res.status(404).json({message:"Not found"});} });
router.delete("/records/:id", async (req,res)=>{ try{ await prisma.dmsRecord.delete({where:{id:req.params.id}}); res.json({ok:true}); }catch{ res.status(404).json({message:"Not found"});} });

export default router;
