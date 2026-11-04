import "fake-indexeddb/auto";
import test from "node:test";import assert from "node:assert/strict";import {db} from "../lib/db";import {readBackup,writeBackup,restoreBackup} from "../lib/backup";
test("restauração seletiva remapeia aluno, foto e encaminhamento sem alterar outra turma",async()=>{
 await db.open();for(const id of ["6A","7B"])await db.classes.add({id,name:id,subjects:["MAT"],importedAt:1});
 const id=await db.students.add({classId:"6A",name:"ALUNA",order:1,situation:"ATIVO",total:{},grades:{MAT:0},absences:{},photo:new Blob(["foto"],{type:"image/jpeg"})});
 await db.followups.add({id:"f",classId:"6A",studentId:id,action:"Revisar",owner:"Tutor",period:"2026-1",due:"",status:"Aberto"});
 const bytes=await writeBackup();const archive=await readBackup(bytes);await assert.rejects(()=>readBackup(bytes.slice(0,40)));await db.classes.update("7B",{name:"Preservada"});await restoreBackup(archive,["6A"]);
 const row=await db.students.where("classId").equals("6A").first();assert.notEqual(row?.id,id);assert.equal(row?.grades.MAT,0);assert.equal(await row?.photo?.text(),"foto");assert.equal((await db.followups.get("f"))?.studentId,row?.id);assert.equal((await db.classes.get("7B"))?.name,"Preservada");
});
