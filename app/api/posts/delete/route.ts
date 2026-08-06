import { createClient } from "@supabase/supabase-js";

type DeleteRequest = {
  table?: "listings" | "housing_posts";
  postId?: string;
  deleteCode?: string;
};

function storagePathFromPublicUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DeleteRequest;
    const table = body.table;
    const postId = String(body.postId || "");
    const deleteCode = String(body.deleteCode || "");

    if (!table || !/^[0-9a-f-]{36}$/i.test(postId)) {
      return Response.json({ error: "无效的帖子信息。" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return Response.json(
        { error: "服务器尚未配置安全删除功能。" },
        { status: 503 }
      );
    }

    const authorization = request.headers.get("authorization") || `Bearer ${anonKey}`;
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: imageUrls, error: deleteError } = await callerClient.rpc(
      "delete_market_post",
      { post_table: table, post_id: postId, supplied_code: deleteCode }
    );

    if (deleteError) {
      const isCodeError = deleteError.message.includes("删除码");
      return Response.json(
        { error: isCodeError ? "删除码不正确。" : deleteError.message },
        { status: isCodeError ? 403 : 400 }
      );
    }

    const bucket = table === "listings" ? "listing-images" : "housing-images";
    const paths = (Array.isArray(imageUrls) ? imageUrls : [])
      .map((imageUrl) => storagePathFromPublicUrl(String(imageUrl), bucket))
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      const serviceClient = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      const { error: storageError } = await serviceClient.storage
        .from(bucket)
        .remove(paths);
      if (storageError) console.error("Post images cleanup failed", storageError);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "删除失败，请稍后再试。" }, { status: 500 });
  }
}
