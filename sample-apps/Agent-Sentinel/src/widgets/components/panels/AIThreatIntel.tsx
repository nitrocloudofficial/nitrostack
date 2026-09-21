'use client';

const threats = [

  {
    title:"Prompt Injection",
    severity:"Critical",
    count:12,
    color:"#EF4444",
  },

  {
    title:"Data Leakage",
    severity:"High",
    count:8,
    color:"#F59E0B",
  },

  {
    title:"Privilege Escalation",
    severity:"Medium",
    count:6,
    color:"#3B82F6",
  },

  {
    title:"Policy Violations",
    severity:"Low",
    count:15,
    color:"#10B981",
  },

];

export default function AIThreatIntel(){

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

🧠 AI Threat Intelligence

</h2>

{threats.map((item)=>(

<div

key={item.title}

style={{

display:"flex",

justifyContent:"space-between",

padding:"16px 0",

borderBottom:"1px solid #1F2937",

}}

>

<div>

<div
style={{
color:"white",
fontWeight:600,
}}
>

{item.title}

</div>

<div
style={{
color:item.color,
marginTop:4,
}}
>

{item.severity}

</div>

</div>

<div
style={{
fontSize:28,
fontWeight:700,
color:item.color,
}}
>

{item.count}

</div>

</div>

))}

</div>

);

}