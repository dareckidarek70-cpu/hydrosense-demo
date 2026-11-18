import { cookies } from "next/headers";
import { LOCALE_COOKIE, localization, resolveLocale } from "./index";

export async function getLocalization() {
  return localization(resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value));
}
