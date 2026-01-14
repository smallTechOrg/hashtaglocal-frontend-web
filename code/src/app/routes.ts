
export const ROUTE_MAP: Record<string, { title: string; linkHref: string }> = {
  "/": { title: "Dynamic Page", linkHref: "/dynamic" },
  "/dynamic": { title: "Static Page", linkHref: "/" },
  // Add more routes here as needed
};

export const getRouteInfo = (pathname: string) => {
  return ROUTE_MAP[pathname] || { title: "Unknown Page", linkHref: "/" };
};