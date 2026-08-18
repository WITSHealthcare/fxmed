// Renders structured data as a JSON-LD script tag. Kept as a server component
// so schema ships in the initial HTML rather than after hydration.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
