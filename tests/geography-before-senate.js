// Historical model-change fixtures predate the Senate-related permutations.
const H=require('../district-geography'),audit=require('../district_permutations.json');
const rows=H.districts.map(d=>({...d})),byId=new Map(rows.map(d=>[d.id,d]));
for(const move of audit.permutationHistory.filter(p=>p.version>=10).slice().sort((a,b)=>b.version-a.version)){
 for(const c of move.changes)Object.assign(byId.get(c.district),c.before);
}
module.exports=rows;
