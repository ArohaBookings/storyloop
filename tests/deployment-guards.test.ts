import assert from "node:assert/strict";
import test from "node:test";
import { listPublishedPosts, getPublishedPost } from "../lib/blog";
import { listPublishedReviews, reviewSummary } from "../lib/reviews";
import {
  createAdminSupabase,
  hasSupabaseAdminConfig,
} from "../lib/supabase/admin";

test("static Supabase readers return empty results when build credentials are absent", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    assert.equal(hasSupabaseAdminConfig(), false);
    assert.deepEqual(await listPublishedPosts(), []);
    assert.equal(await getPublishedPost("missing"), null);
    assert.deepEqual(await listPublishedReviews(), []);
    assert.deepEqual(await reviewSummary(), { count: 0, average: 0 });
    assert.throws(
      () => createAdminSupabase(),
      /Supabase admin environment is not configured/
    );
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});
