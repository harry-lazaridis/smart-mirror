import axios from "axios";
import { buildApiUrl } from "./baseUrl";

const baseURL = buildApiUrl("/api");

export const api = axios.create({
  baseURL
});
