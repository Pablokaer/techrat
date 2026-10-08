import { BearerSession } from "@techrat/auth";
import { API_URL } from "./config";
import { localizedFetch } from "./i18n";
import { secureTokenStorage } from "./secure-storage";

/** The app-wide bearer session (login, single-flight refresh, logout). Requests carry Accept-Language. */
export const session = new BearerSession(API_URL, secureTokenStorage, localizedFetch);
