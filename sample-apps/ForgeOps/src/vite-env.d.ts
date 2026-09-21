/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORGEOPS_API_URL?: string;
  readonly VITE_ROLE3_API_URL?: string;
  readonly VITE_ROLE1_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
