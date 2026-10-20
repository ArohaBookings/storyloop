import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VISITED_PATH_HEADER, loginPathFor } from "./visited-path";

/** Send a signed-out visitor to sign in, then back to the page they asked for. */
export async function redirectToLogin(): Promise<never> {
  const visited = (await headers()).get(VISITED_PATH_HEADER);
  redirect(loginPathFor(visited));
}
