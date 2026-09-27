import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

export { API_BASE, WS_URL };
export default api;
