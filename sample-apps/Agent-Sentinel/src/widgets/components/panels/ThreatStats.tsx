'use client';

export default function ThreatStats(){

const stats=[

["Critical",12,"#EF4444"],

["High",18,"#F59E0B"],

["Medium",34,"#3B82F6"],

["Low",62,"#10B981"],

];

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
marginBottom:25,
}}
>

🚨 Threat Distribution

</h2>

{stats.map(([name,value,color])=>(

<div
key={name as string}
style={{
marginBottom:20,
}}
>

<div
style={{
display:"flex",
justifyContent:"space-between",
color:"white",
marginBottom:8,
}}
>

<span>{name}</span>

<span>{value}</span>

</div>

<div
style={{
height:12,
background:"#374151",
borderRadius:20,
}}
>

<div
style={{
width:`${Number(value)}%`,
height:"100%",
background:color as string,
borderRadius:20,
}}
/>

</div>

</div>

))}

</div>

);

}