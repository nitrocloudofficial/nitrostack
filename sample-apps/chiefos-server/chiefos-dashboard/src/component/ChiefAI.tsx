import { useState } from "react";
import { Bot } from "lucide-react";

function ChiefAI(){

const [result,setResult]=useState<any>(null);
const [loading,setLoading]=useState(false);

async function analyze(){

setLoading(true);

const response = await fetch(
"http://localhost:3000/tools/chief_route_work",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({

id:"demo-001",

type:"email",

title:"Urgent production issue",

description:
"Client reported production outage requiring immediate attention"

})
}
);


const data = await response.json();

setResult(data);

setLoading(false);

}


return (

<div className="
bg-slate-900
border
border-slate-800
rounded-2xl
p-6
">


<div className="flex gap-3 items-center">

<Bot className="text-purple-400"/>

<h2 className="text-xl font-bold">
Chief AI
</h2>

</div>


<button
onClick={analyze}
className="
mt-5
bg-purple-600
px-5
py-3
rounded-xl
"
>

{
loading?
"Analyzing...":
"Run AI Decision"
}

</button>


{
result && (

<div className="mt-5 space-y-2">

<p>
Agent:
<b>{result.selectedAgent}</b>
</p>

<p>
Priority:
<b>{result.priority}</b>
</p>

<p>
Confidence:
<b>{result.confidence*100}%</b>
</p>

<p>
Action:
<b>{result.action}</b>
</p>


</div>

)

}


</div>

)

}


export default ChiefAI;