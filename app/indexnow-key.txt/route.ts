// IndexNow ownership proof: the key served here must match the key sent with
// each submission (see lib/blog-publish.ts).
export function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
