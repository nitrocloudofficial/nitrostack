import { createRoot } from "react-dom/client";
import { MedLensCard, MedLensReportPayload } from "./MedLensCard";

/**
 * Entry point bundled by esbuild into dist-widget/medlens.js (see
 * package.json's build:widget script) and inlined into the
 * ui://widget/medlens.html resource registered in ../src/app.module.ts.
 *
 * This file is the only place that touches window.openai — MedLensCard
 * itself stays a plain, host-agnostic component per its own doc comment.
 */
declare global {
  interface Window {
    openai?: {
      toolOutput?: MedLensReportPayload;
      callTool?: (name: string, args: Record<string, unknown>) => void;
    };
  }
}

function Root() {
  const payload = window.openai?.toolOutput;
  if (!payload) return null;

  return (
    <MedLensCard
      payload={payload}
      onRequestLookup={(drugName) =>
        window.openai?.callTool?.("get_drug_regulatory_status", { drugName })
      }
    />
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<Root />);
}
