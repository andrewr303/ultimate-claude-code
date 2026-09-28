import { useRouter } from "next/router";

const BASE_URL = "https://webperf-snippets.nucliweb.net";

const CATEGORY_LABELS = {
  CoreWebVitals: "Core Web Vitals",
  Loading: "Loading",
  Interaction: "Interaction",
  Media: "Media",
  Resources: "Resources",
};

function buildBreadcrumbs(segments) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BASE_URL,
    },
  ];

  if (segments[0] && CATEGORY_LABELS[segments[0]]) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: CATEGORY_LABELS[segments[0]],
      item: `${BASE_URL}/${segments[0]}`,
    });
  }

  if (segments[1]) {
    const pageName = segments[1].replace(/-/g, " ");
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: pageName,
      item: `${BASE_URL}/${segments[0]}/${segments[1]}`,
    });
  }

  return items;
}

export function PageSchema() {
  const router = useRouter();
  const path = router.asPath.split("?")[0];
  const segments = path.replace(/^\//, "").split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const schemas = [];
  const pageUrl = `${BASE_URL}${path}`;

  const breadcrumbItems = buildBreadcrumbs(segments);
  if (breadcrumbItems.length > 1) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems,
    });
  }

  const isSnippetPage = segments.length === 2 && CATEGORY_LABELS[segments[0]];
  if (isSnippetPage) {
    const pageName = segments[1].replace(/-/g, " ");
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: pageName,
      url: pageUrl,
      author: {
        "@type": "Person",
        name: "Joan León",
        url: "https://twitter.com/nucliweb",
      },
      publisher: {
        "@type": "Person",
        name: "Joan León",
        url: "https://twitter.com/nucliweb",
      },
      isPartOf: {
        "@type": "WebSite",
        name: "WebPerf Snippets",
        url: BASE_URL,
      },
    });
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
