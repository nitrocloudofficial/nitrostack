'use client';

const recommendations=[

"Rotate GitHub Access Tokens",

"Review High-Risk Prompt Policies",

"Enable MFA for Enterprise Admins",

"Quarantine Finance Agent",

"Audit External Connectors",

];

export default function RecommendationsPanel(){

return(

<div
style={{
background:"#111827",
padding:24,
borderRadius:16,
border:"1px solid #1F2937",
}}
>

<h2
style={{
color:"white",
marginBottom:20,
}}
>

💡 AI Recommendations

</h2>

{recommendations.map((item,index)=>(

<div
key={index}
style={{
display:"flex",
alignItems:"center",
gap:12,
padding:"12px 0",
borderBottom:"1px solid #1F2937",
}}
>

<div
style={{
width:10,
height:10,
borderRadius:"50%",
background:"#10B981",
}}
/>

<div
style={{
color:"white",
}}
>

{item}

</div>

</div>

))}

</div>

);

}