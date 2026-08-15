import { createClient } from "@supabase/supabase-js";
import { env, storageConfigured } from "./env";
import { AppError } from "./errors";

const client = storageConfigured
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

function requireClient() {
  if (!client) {
    throw new AppError(
      503,
      "STORAGE_NOT_CONFIGURED",
      "File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return client;
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  const supabase = requireClient();
  const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).upload(key, body, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new AppError(502, "STORAGE_UPLOAD_FAILED", error.message);
  }
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;
  const supabase = requireClient();
  const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).remove(keys);
  if (error) {
    throw new AppError(502, "STORAGE_DELETE_FAILED", error.message);
  }
}

export async function getSignedUrl(key: string, expiresInSeconds = 300) {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) {
    throw new AppError(502, "STORAGE_SIGN_FAILED", error?.message ?? "Could not sign URL");
  }
  return data.signedUrl;
}
