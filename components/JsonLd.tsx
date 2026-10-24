import { jsonLdString } from "@/lib/seo";

/** Structured data for search engines. Pass one node, or several to share one @graph. */
export default function JsonLd({ data }: { data: object | object[] }) {
  const body = Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(body) }} />;
}
