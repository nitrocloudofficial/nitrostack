'use client';

import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

interface SearchItem {
  title: string;
  type: string;
  description?: string;
}

interface SearchResults {

  query: string;

  evidence: SearchItem[];

  entities: SearchItem[];

  notes: SearchItem[];

  relationships: SearchItem[];

  tasks: SearchItem[];

}

export default function SearchResultsPage() {

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

        <h3>Search Error</h3>

        <pre>{JSON.stringify(output,null,2)}</pre>

      </div>

    );

  }

  const data: SearchResults =

      output?.results ??

      output?.data ??

      output;

  if(!data){

    return(

      <div style={{padding:20}}>

        No Results Found

      </div>

    );

  }

  const dark = theme==="dark";
  return (

    <div
      style={{
        maxWidth: 950,
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
          marginBottom: 28,
        }}
      >

        <div
          style={{
            color:"#60A5FA",
            fontSize:13,
          }}
        >
          🔍 Investigation Search
        </div>

        <h1
          style={{
            margin:"8px 0",
          }}
        >
          Results for "{data.query}"
        </h1>

      </div>

      <ResultSection
        title="📂 Evidence"
        items={data.evidence}
      />

      <ResultSection
        title="👤 Entities"
        items={data.entities}
      />

      <ResultSection
        title="📝 Notes"
        items={data.notes}
      />

      <ResultSection
        title="🔗 Relationships"
        items={data.relationships}
      />

      <ResultSection
        title="✅ Tasks"
        items={data.tasks}
      />
        </div>
  );
}

function ResultSection({
  title,
  items,
}: {
  title: string;
  items: SearchItem[];
}) {
  return (
    <div
      style={{
        marginBottom: 28,
      }}
    >
      <h2
        style={{
          marginBottom: 16,
        }}
      >
        {title}
      </h2>

      {items && items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {items.map((item, index) => (
            <ResultCard
              key={index}
              item={item}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: "rgba(107,114,128,.08)",
            opacity: 0.8,
          }}
        >
          No results found.
        </div>
      )}
    </div>
  );
}

function ResultCard({
  item,
}: {
  item: SearchItem;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        background: "rgba(37,99,235,.08)",
        border: "1px solid rgba(37,99,235,.15)",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {item.title}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#60A5FA",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {item.type}
      </div>

      {item.description && (
        <p
          style={{
            marginTop: 10,
            lineHeight: 1.6,
            opacity: 0.85,
          }}
        >
          {item.description}
        </p>
      )}
    </div>
  );
}  