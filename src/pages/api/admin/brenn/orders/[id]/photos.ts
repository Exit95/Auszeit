import type { APIRoute } from 'astro';
import { getS3Client, uploadToS3, listS3Objects, deleteFromS3 } from '../../../../../../lib/s3-storage';

export const GET: APIRoute = async ({ params }) => {
  const orderId = params.id;
  try {
    const prefix = `Auszeit/brenn/orders/${orderId}/`;
    const objects = await listS3Objects(prefix);
    const photos = objects.map((obj: any) => ({
      key: obj.Key,
      url: `/api/admin/brenn/orders/${orderId}/photos/${encodeURIComponent(obj.Key?.split('/').pop() || '')}`,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
    return new Response(JSON.stringify({ success: true, data: photos }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const orderId = params.id;
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'Kein Foto hochgeladen' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const key = `brenn/orders/${orderId}/${filename}`;

    await uploadToS3(buffer, key, file.type || 'image/jpeg');

    return new Response(JSON.stringify({
      success: true,
      data: {
        key,
        url: `/api/admin/brenn/orders/${orderId}/photos/${filename}`,
        filename,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
