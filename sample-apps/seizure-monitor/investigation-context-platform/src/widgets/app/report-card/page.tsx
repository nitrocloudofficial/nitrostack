'use client';

import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

export default function ReportCard() {

  const theme = useTheme();

  const { getToolOutput } = useWidgetSDK();

  const output = getToolOutput<any>();

  if (output?.isError) {

    return (

      <div
        style={{
          padding:20,
          background:"#7f1d1d",
          color:"white",
          borderRadius:12,
        }}
      >

        <h2>Report Error</h2>

        <pre>{JSON.stringify(output,null,2)}</pre>

      </div>

    );

  }

  console.log(output);

  const report =
      output?.report ??
      output?.data?.report ??
      {};

  const investigationId =
      output?.investigationId ??
      output?.data?.investigationId ??
      "Unknown";

  const format =
      output?.format ??
      output?.data?.format ??
      "PDF";

  const dark = theme==="dark";
  return (

    <div
      style={{
        maxWidth:900,
        margin:"0 auto",
        padding:24,
        borderRadius:18,
        background:dark ? "#111827" : "#ffffff",
        color:dark ? "#ffffff" : "#111827",
        border:dark
          ? "1px solid #374151"
          : "1px solid #e5e7eb",
        boxShadow:"0 10px 30px rgba(0,0,0,.15)",
      }}
    >

      {/* Header */}

      <div
        style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          marginBottom:30,
        }}
      >

        <div>

          <div
            style={{
              color:"#60A5FA",
              fontSize:13,
            }}
          >
            📄 Investigation Report
          </div>

          <h1
            style={{
              margin:"8px 0",
            }}
          >
            {report.title ?? "Investigation Report"}
          </h1>

          <div
            style={{
              opacity:.75,
            }}
          >
            Investigation ID : {investigationId}
          </div>

        </div>

        <div
          style={{
            textAlign:"right",
          }}
        >

          <div>

            <strong>Format</strong>

          </div>

          <div
            style={{
              marginTop:6,
              color:"#60A5FA",
            }}
          >
            {String(format).toUpperCase()}
          </div>

        </div>

      </div>

      {/* Executive Summary */}

      <div
        style={{
          padding:20,
          borderRadius:14,
          background:"rgba(37,99,235,.08)",
          marginBottom:28,
        }}
      >

        <h2
          style={{
            marginTop:0,
          }}
        >
          Executive Summary
        </h2>

        <p
          style={{
            lineHeight:1.8,
          }}
        >
          {report.summary ??
            "No investigation summary available."}
        </p>

      </div>

      {/* Statistics */}

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(5,1fr)",
          gap:16,
          marginBottom:30,
        }}
      >

        <StatCard
          icon="📂"
          title="Evidence"
          value={report.evidenceCount ?? 0}
        />

        <StatCard
          icon="👤"
          title="Entities"
          value={report.entityCount ?? 0}
        />

        <StatCard
          icon="🔗"
          title="Relations"
          value={report.relationshipCount ?? 0}
        />

        <StatCard
          icon="📝"
          title="Notes"
          value={report.noteCount ?? 0}
        />

        <StatCard
          icon="✅"
          title="Tasks"
          value={report.taskCount ?? 0}
        />

      </div>
          {/* Recommendations */}

      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(16,185,129,.08)",
          marginBottom: 28,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Recommendations
        </h2>

        {(report.recommendations ?? []).length > 0 ? (

          <ul
            style={{
              paddingLeft: 20,
              lineHeight: 1.8,
            }}
          >

            {(report.recommendations ?? []).map(
              (item: string, index: number) => (

                <li key={index}>
                  {item}
                </li>

              )
            )}

          </ul>

        ) : (

          <div
            style={{
              lineHeight: 1.7,
            }}
          >
            <ul>
              <li>Reset compromised user credentials.</li>
              <li>Block malicious IP addresses and domains.</li>
              <li>Enable MFA for all user accounts.</li>
              <li>Continue monitoring network activity.</li>
            </ul>
          </div>

        )}

      </div>

      {/* Footer */}

      <div
        style={{
          borderTop: dark
            ? "1px solid #374151"
            : "1px solid #e5e7eb",
          paddingTop: 20,
          textAlign: "center",
          opacity: .75,
        }}
      >

        <strong>
          Persistent Investigation Context Platform
        </strong>

        <div
          style={{
            marginTop: 8,
          }}
        >
          Generated Investigation Report
        </div>

      </div>

    </div>

  );

}

function StatCard({

  icon,

  title,

  value,

}:{

  icon:string;

  title:string;

  value:number|string;

}){

  return(

    <div
      style={{
        padding:18,
        borderRadius:12,
        background:"rgba(37,99,235,.08)",
        textAlign:"center",
      }}
    >

      <div
        style={{
          fontSize:32,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize:28,
          fontWeight:700,
          marginTop:10,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:8,
          opacity:.7,
        }}
      >
        {title}
      </div>

    </div>

  );

} 