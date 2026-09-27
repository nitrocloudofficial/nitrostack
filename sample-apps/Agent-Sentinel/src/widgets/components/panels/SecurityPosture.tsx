'use client';

const items = [

  {
    name: "Zero Trust",
    value: 95,
    color: "#10B981",
  },

  {
    name: "Identity Security",
    value: 89,
    color: "#3B82F6",
  },

  {
    name: "Prompt Protection",
    value: 92,
    color: "#8B5CF6",
  },

  {
    name: "Data Governance",
    value: 83,
    color: "#F59E0B",
  },

];

export default function SecurityPosture() {

  return (

    <div
      style={{
        background:"#111827",
        borderRadius:16,
        padding:24,
        border:"1px solid #1F2937",
      }}
    >

      <h2
        style={{
          color:"white",
          marginBottom:25,
        }}
      >
        🛡 Security Posture
      </h2>

      {items.map(item=>(

        <div
          key={item.name}
          style={{
            marginBottom:22,
          }}
        >

          <div
            style={{
              display:"flex",
              justifyContent:"space-between",
              color:"white",
            }}
          >
            <span>{item.name}</span>

            <span>{item.value}%</span>
          </div>

          <div
            style={{
              marginTop:8,
              height:10,
              background:"#374151",
              borderRadius:20,
            }}
          >

            <div
              style={{
                width:`${item.value}%`,
                height:"100%",
                background:item.color,
                borderRadius:20,
              }}
            />

          </div>

        </div>

      ))}

    </div>

  );

}