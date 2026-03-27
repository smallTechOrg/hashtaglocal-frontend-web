/**
 *  JSON-LD Structured Data Utilities
 * These utilities generate JSON-LD schema markup that helps search engines understand:
 * - What your organization is and where to find more info about it
 * - How your website is structured and what users can do on it
 * - Your business location and contact information
 * 
 * JSON-LD is a format that search engines prefer and can lead to:
 * - Rich snippets in search results (star ratings, pricing, etc.)
 * - Knowledge panels for your organization
 * - Better understanding of your content
 */

// SEO: TypeScript interface for Organization Schema
// Defines the structure of organization data that search engines need
export interface OrganizationSchema {
  "@context": string; // Always "https://schema.org" - tells search engines this is schema.org markup
  "@type": string; // Type of entity being described - in this case "Organization"
  name: string; // Official name of the organization
  url: string; // Main website URL
  logo: string; // URL to organization logo (minimum 112x112px)
  description: string; // What the organization does
  sameAs?: string[]; // URLs to social media profiles (LinkedIn, Twitter, Facebook, etc.)
  contactPoint?: {
    "@type": string;
    telephone?: string;
    email?: string;
    contactType: string; // Type of contact (e.g., "Customer Support", "Community Support")
  };
}

// SEO: TypeScript interface for WebSite Schema 
// Helps search engines understand the website's purpose and capabilities
export interface WebSiteSchema {
  "@context": string;
  "@type": string; // Type is "WebSite"
  name: string; // Website name
  url: string; // Website URL
  description: string; // What the website does
}

// SEO: Organization schema generator function 
// Returns JSON data that tells Google about your organization
export function getOrganizationSchema(baseUrl: string): OrganizationSchema {
  return {
    // SEO: Schema.org context - identifies this as schema.org markup for search engines
    "@context": "https://schema.org",
    // SEO: Entity type "Organization" tells Google this is company/organization information
    "@type": "Organization",
    // SEO: Official name helps Google link search queries to your organization
    name: "#local",
    // SEO: URL allows Google to link this schema to your actual website
    url: baseUrl,
    // SEO: Logo URL - Google uses this in knowledge panels and rich snippets (1200x630px+ recommended)
    logo: `${baseUrl}/logo-black.png`,
    // SEO: Description helps Google understand what your organization does
    description: "A location-based community platform connecting neighbors to discuss and resolve community challenges",
    // SEO: Social profiles (sameAs) - helps Google verify your organization and consolidate social presence
    sameAs: [
      "https://twitter.com/hashtaglocal_",
    ],
    // SEO: Contact point - tells Google how to contact your organization (improves customer trust signals)
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Community Support",
      email: "contact@smalltech.in",
    },
  };
}

// SEO: Website schema generator function 
// Returns JSON data that tells Google about your website structure and functionality
export function getWebSiteSchema(baseUrl: string): WebSiteSchema {
  return {
    // SEO: Schema.org context - identifies this as schema.org markup
    "@context": "https://schema.org",
    // SEO: Type "WebSite" tells Google this is a website (enables additional search features)
    "@type": "WebSite",
    // SEO: Website name helps search engines identify your site
    name: "#local",
    // SEO: URL must match your domain for Google to verify the markup
    url: baseUrl,
    // SEO: Description of what the website does
    description: "Discover and engage with local community issues",
  };
}

// Local business schema generator (available for future use)
// Can be used if you add location-specific pages for different neighborhoods
export function getLocalBusinessSchema(baseUrl: string) {
  return {
    //  Schema.org context
    "@context": "https://schema.org",
    // SEO: LocalBusiness type helps Google show your business in local search results
    "@type": "LocalBusiness",
    // SEO: Business name for local search
    name: "#local",
    url: baseUrl,
    description: "Location-based community engagement platform",
    telephone: "",
    // SEO: Area served - tells Google where your business operates (affects local search visibility)
    areaServed: "India",
    // SEO: Image for local business card/knowledge panel
    image: `${baseUrl}/logo-black.png`,
  };
}
