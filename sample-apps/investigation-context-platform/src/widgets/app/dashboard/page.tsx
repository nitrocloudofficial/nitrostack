'use client';

import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

interface DashboardData {

  investigation: {
    title: string;
    status: string;
    priority: string;
  };

  statistics: {
    evidence: number;
    entities: number;
    relationships: number;
    notes: number;
    tasks: number;
  };

  latestNote: {
    title: string;
    content: string;
  };

  openTasks: {
    title: string;
  }[];

}

export default function Dashboard() {

  const theme = useTheme();

  const { getToolOutput } = useWidgetSDK();

  const output = getToolOutput<any>();

  if (output?.isError) {

    return (
      <div
        style={{
          padding:20,
          color:"white",
          background:"#7f1d1d",
          borderRadius:12,
        }}
      >
        <h3>Tool Error</h3>

        <pre>{JSON.stringify(output,null,2)}</pre>

      </div>
    );

  }

  const data: DashboardData =

    output?.dashboard ??

    output?.data ??

    output;

  if(!data){

    return(
      <div style={{padding:20}}>

        No Dashboard Data

      </div>
    );

  }

  const dark = theme==="dark";
  return (

    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        borderRadius: 18,
        background: dark ? "#111827" : "#ffffff",
        color: dark ? "#ffffff" : "#111827",
        border: dark
          ? "1px solid #374151"
          : "1px solid #e5e7eb",
        boxShadow: "0 10px 30px rgba(0,0,0,.15)",
      }}
    >

      {/* Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >

        <div>

          <div
            style={{
              color:"#60A5FA",
              fontSize:13,
            }}
          >
            🛡 Investigation Dashboard
          </div>

          <h1
            style={{
              margin:"8px 0",
            }}
          >
            {data.investigation.title}
          </h1>

        </div>

        <div
          style={{
            textAlign:"right",
          }}
        >

          <div>
            <strong>Status:</strong> {data.investigation.status}
          </div>

          <div>
            <strong>Priority:</strong> {data.investigation.priority}
          </div>

        </div>

      </div>

      {/* Statistics */}

      <div
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(3,1fr)",
          gap:16,
          marginBottom:28,
        }}
      >

        <StatCard
          title="Evidence"
          value={data.statistics.evidence}
          icon="📂"
        />

        <StatCard
          title="Entities"
          value={data.statistics.entities}
          icon="👤"
        />

        <StatCard
          title="Relationships"
          value={data.statistics.relationships}
          icon="🔗"
        />

        <StatCard
          title="Notes"
          value={data.statistics.notes}
          icon="📝"
        />

        <StatCard
          title="Tasks"
          value={data.statistics.tasks}
          icon="✅"
        />

        <StatCard
          title="Progress"
          value="80%"
          icon="📈"
        />

      </div>
          {/* Open Tasks & Latest Note */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 30,
        }}
      >

        {/* Open Tasks */}

        <div
          style={{
            padding: 18,
            borderRadius: 12,
            background: "rgba(37,99,235,.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            ✅ Open Tasks
          </h3>

          {data.openTasks?.length ? (

            data.openTasks.map((task, index) => (

              <div
                key={index}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    index !== data.openTasks.length - 1
                      ? "1px solid rgba(255,255,255,.08)"
                      : "none",
                }}
              >
                • {task.title}
              </div>

            ))

          ) : (

            <p>No open tasks.</p>

          )}

        </div>

        {/* Latest Note */}

        <div
          style={{
            padding: 18,
            borderRadius: 12,
            background: "rgba(16,185,129,.08)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            📝 Latest Note
          </h3>

          <strong>
            {data.latestNote?.title ?? "No Notes"}
          </strong>

          <p
            style={{
              marginTop: 12,
              lineHeight: 1.7,
            }}
          >
            {data.latestNote?.content ??
              "No note available."}
          </p>

        </div>

      </div>

      {/* Progress */}

      <div>

        <h3>Investigation Progress</h3>

        <div
          style={{
            width: "100%",
            height: 16,
            borderRadius: 10,
            background: "#d1d5db",
            overflow: "hidden",
          }}
        >

          <div
            style={{
              width: "80%",
              height: "100%",
              background: "#2563EB",
            }}
          />

        </div>

        <div
          style={{
            marginTop: 8,
            fontWeight: 600,
          }}
        >
          80% Complete
        </div>

      </div>

    </div>

  );

}

function StatCard({

  title,

  value,

  icon,

}:{

  title:string;

  value:string|number;

  icon:string;

}){

  return(

    <div
      style={{
        padding:20,
        borderRadius:14,
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
          marginTop:10,
          fontSize:28,
          fontWeight:700,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:6,
          opacity:.7,
        }}
      >
        {title}
      </div>

    </div>

  );

} 