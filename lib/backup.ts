import JSZip from "jszip";
import {db,type ClassRecord,type StudentRecord,type GradePeriodRecord} from "./db";
import type {Transfer,Meeting,Followup} from "./council-types";
type Archive={version:1;classes:ClassRecord[];students:(Omit<StudentRecord,"photo">&{photo?:string})[];periods:GradePeriodRecord[];transfers:Transfer[];meetings:Meeting[];followups:Followup[]};
const tables=()=>[db.classes,db.students,db.gradePeriods,db.transfers,db.meetings,db.followups];
function valid(x:unknown,msg="Arquivo de backup inválido."):asserts x {if(!x)throw Error(msg)}
export async function writeBackup(){
 const zip=new JSZip();const [classes,rows,periods,transfers,meetings,followups]=await db.transaction("r",tables(),()=>Promise.all([db.classes.toArray(),db.students.toArray(),db.gradePeriods.toArray(),db.transfers.toArray(),db.meetings.toArray(),db.followups.toArray()]));
 const students=await Promise.all(rows.map(async({photo,...s})=>{if(!photo)return s;zip.file("photos/"+s.id,await photo.arrayBuffer());return {...s,photo:photo.type||"image/jpeg"}}));
 zip.file("conselho.json",JSON.stringify({version:1,classes,students,periods,transfers,meetings,followups} satisfies Archive));
 return zip.generateAsync({type:"uint8array"});
}
export async function readBackup(bytes:ArrayBuffer|Uint8Array){
 const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});const file=zip.file("conselho.json");valid(file);
 const data:Archive=JSON.parse(await file.async("string"));valid(data?.version===1);
 const lists=[data.classes,data.students,data.periods,data.transfers,data.meetings,data.followups];
 for(const list of lists){valid(Array.isArray(list));valid(list.every(x=>x&&typeof x==="object"));valid(new Set(list.map(x=>x.id)).size===list.length)}
 const strings=(x:unknown)=>Array.isArray(x)&&x.every(s=>typeof s==="string");const period=(x:{year:number;term:number})=>Number.isInteger(x.year)&&Number.isInteger(x.term)&&x.term>=1&&x.term<=4;
 const gradeRow=(s:GradePeriodRecord["students"][number])=>s&&typeof s.name==="string"&&s.name.trim()&&typeof s.situation==="string"&&Number.isFinite(s.order)&&[s.grades,s.total,s.absences].every(v=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.values(v).every(n=>n===null||typeof n==="string"||typeof n==="number"));
 const classes=new Set(data.classes.map(c=>c.id));for(const c of data.classes)valid(typeof c.id==="string"&&c.id&&typeof c.name==="string"&&strings(c.subjects)&&Number.isFinite(c.importedAt)&&(!c.currentPeriod||period(c.currentPeriod)));
 for(const list of lists.slice(1))for(const x of list)valid("classId" in x&&classes.has(x.classId as string));
 const photos=new Map<number,Blob>();for(const s of data.students){valid(Number.isSafeInteger(s.id)&&gradeRow(s));if(s.photo!==undefined){valid(typeof s.photo==="string"&&s.photo.startsWith("image/"));const f=zip.file("photos/"+s.id);valid(f);photos.set(s.id!,new Blob([await f.async("arraybuffer")],{type:s.photo}))}}
 for(const p of data.periods)valid(period(p)&&p.id===JSON.stringify([p.classId,p.year,p.term])&&strings(p.subjects)&&Array.isArray(p.students)&&p.students.every(gradeRow));
 const belongs=(id:number,c:string)=>data.students.some(s=>s.id===id&&s.classId===c);
 for(const t of data.transfers)valid(typeof t.id==="string"&&belongs(t.studentId,t.classId)&&typeof t.sourceClass==="string"&&typeof t.sourceName==="string"&&period(t));
 for(const f of data.followups)valid(typeof f.id==="string"&&typeof f.action==="string"&&typeof f.owner==="string"&&typeof f.due==="string"&&typeof f.period==="string"&&["Aberto","Em andamento","Concluído"].includes(f.status)&&(!f.studentId||belongs(f.studentId,f.classId)));
 for(const m of data.meetings)valid(m.id===JSON.stringify([m.classId,m.period])&&[m.participants,m.date,m.minutes,m.before,m.after].every(v=>typeof v==="string")&&strings(m.included)&&strings(m.blocks)&&m.blocks.every(b=>["overview","top","evolution","selection","actions"].includes(b))&&m.blocks.includes(m.active)&&Array.isArray(m.selected)&&m.selected.every(id=>belongs(id,m.classId))&&strings(m.done)&&strings(m.later));
 return {data,photos};
}
export async function restoreBackup({data,photos}:Awaited<ReturnType<typeof readBackup>>,ids:string[]){
 const pick=new Set(ids);valid(pick.size&&ids.every(id=>data.classes.some(c=>c.id===id)),"Selecione turmas válidas.");
 await db.transaction("rw", [...tables(),db.meta],async()=>{
 const remap=new Map<number,number>();
 for(const c of data.classes.filter(c=>pick.has(c.id))){
  for(const table of [db.students,db.gradePeriods,db.transfers,db.followups,db.meetings])await table.where("classId").equals(c.id).delete();
  for(const key of await db.meta.toCollection().primaryKeys())if(key.startsWith("presentation:students:"+c.id+":")||key.startsWith("presentation:analytics:"+c.id+":"))await db.meta.delete(key);
  await db.classes.put(c);
 }
 for(const {id,photo,...s} of data.students.filter(s=>pick.has(s.classId))){const n=await db.students.add({...s,...(photo?{photo:photos.get(id!)}:{})});remap.set(id!,n)}
 for(const p of data.periods.filter(p=>pick.has(p.classId)))await db.gradePeriods.add(p);
 for(const t of data.transfers.filter(t=>pick.has(t.classId)))await db.transfers.add({...t,studentId:remap.get(t.studentId)!});
 for(const f of data.followups.filter(f=>pick.has(f.classId)))await db.followups.add({...f,studentId:f.studentId?remap.get(f.studentId):undefined});
 const marker=(v:string)=>v.replace(/:(\d+)$/,(_,n)=>":"+remap.get(Number(n)));
 for(const m of data.meetings.filter(m=>pick.has(m.classId)))await db.meetings.add({...m,studentId:m.studentId?remap.get(m.studentId):undefined,selected:m.selected.map(id=>remap.get(id)!),done:m.done.map(marker),later:m.later.map(marker)});
 });
}
export function downloadFile(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}

