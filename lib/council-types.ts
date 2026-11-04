export interface Transfer { id:string; classId:string; studentId:number; sourceClass:string; sourceName:string; year:number; term:number }
export type Block="overview"|"top"|"evolution"|"selection"|"actions";
export interface Meeting { id:string; classId:string; period:string; date:string; participants:string; blocks:Block[]; active:Block; selected:number[]; studentId?:number; done:string[]; later:string[]; before:string; after:string; started:boolean; minutes:string; included:string[]; closed:boolean }
export interface Followup { id:string; classId:string; studentId?:number; name?:string; period:string; action:string; owner:string; due:string; status:"Aberto"|"Em andamento"|"Concluído" }

