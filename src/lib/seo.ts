export const seo = (title: string, description: string) => ({
  meta: [
    { title: `${title} · CUET PG Counselling Assistant` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · CUET PG Counselling Assistant` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
