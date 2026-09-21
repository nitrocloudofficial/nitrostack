export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  auth: {
    github: `${API_URL}/api/auth/github`,
    verify: `${API_URL}/api/auth/verify`,
    logout: `${API_URL}/api/auth/logout`,
    repositories: `${API_URL}/api/auth/repositories`,
    branches: (owner: string, repo: string) => `${API_URL}/api/auth/repositories/${owner}/${repo}/branches`,
  },
  scan: {
    start: `${API_URL}/api/scan/start`,
    status: (scanId: string) => `${API_URL}/api/scan/${scanId}/status`,
    results: (scanId: string) => `${API_URL}/api/scan/${scanId}/results`,
    history: `${API_URL}/api/scan/history`,
    createPR: (scanId: string) => `${API_URL}/api/scan/${scanId}/create-pr`,
    download: (scanId: string) => `${API_URL}/api/scan/${scanId}/download`,
    getFile: (scanId: string, filePath: string) => `${API_URL}/api/scan/${scanId}/file/${filePath}`,
    updateFile: (scanId: string, filePath: string) => `${API_URL}/api/scan/${scanId}/file/${filePath}`,
    sandboxScan: `${API_URL}/api/sandbox/start`,
    sandboxStatus: `${API_URL}/api/sandbox`,
  },
  websiteScan: {
    history: `${API_URL}/api/website-scan/history`,
    addOwnedDomain: `${API_URL}/api/website-scan/verify/add-owned`,
  },
  history: {
    all: `${API_URL}/api/history/all`,
    detail: (type: string, id: string) => `${API_URL}/api/history/${type}/${id}`,
  },
};
