"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getRedis } from "@/lib/redis";
import { isValidIcon, sanitizeSubdomain } from "@/lib/subdomains";
import { protocol, rootDomain } from "@/lib/utils";

export type CreateSubdomainState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  icon?: string;
};

export async function createSubdomainAction(
  _prevState: CreateSubdomainState,
  formData: FormData,
): Promise<CreateSubdomainState> {
  const redis = getRedis();
  const subdomain = (formData.get("subdomain") as string) || "";
  const icon = (formData.get("icon") as string) || "";

  if (!subdomain || !icon) {
    return { success: false, error: "Subdomain and icon are required" };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: "Please enter a valid emoji (maximum 10 characters)",
    };
  }

  const sanitizedSubdomain = sanitizeSubdomain(subdomain);

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        "Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.",
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`,
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      icon,
      success: false,
      error: "This subdomain is already taken",
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    emoji: icon,
    createdAt: Date.now(),
  });

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export type DeleteSubdomainState = {
  error?: string;
  success?: string;
};

export async function deleteSubdomainAction(
  _prevState: DeleteSubdomainState,
  formData: FormData,
): Promise<DeleteSubdomainState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "You must be signed in to delete a subdomain" };
  }

  const redis = getRedis();
  const subdomain = formData.get("subdomain");
  if (!subdomain || typeof subdomain !== "string") {
    return { error: "Subdomain is required" };
  }

  await redis.del(`subdomain:${subdomain}`);
  revalidatePath("/admin");
  return { success: "Domain deleted successfully" };
}
