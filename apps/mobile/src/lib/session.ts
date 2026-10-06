import { BearerSession } from "@techrat/auth";
import { API_URL } from "./config";
import { secureTokenStorage } from "./secure-storage";

/** The app-wide bearer session (login, single-flight refresh, logout). */
export const session = new BearerSession(API_URL, secureTokenStorage);
