import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | #local by smallTech",
  description: "Privacy Policy for #local by madhyamakist pvt ltd (smallTech). Learn how we collect, use, and protect your personal data.",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "#555", marginBottom: "2rem" }}>
        <strong>Effective Date:</strong> 1 April, 2026
      </p>

      <p style={{ marginBottom: "1.5rem" }}>
        madhyamakist pvt ltd, operating under the brand name smallTech (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), is committed to
        protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
        information when you use our mobile applications, websites, and related services (collectively, the
        &quot;Services&quot;).
      </p>
      <p style={{ marginBottom: "2rem" }}>
        By using our Services, you agree to the collection and use of information in accordance with this policy.
      </p>

      {/* Section 1 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        1. Information We Collect
      </h2>
      <p style={{ marginBottom: "1rem" }}>
        We collect information to provide better services to all our users. The types of information we collect
        include:
      </p>

      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        A. Information You Provide to Us
      </h3>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", lineHeight: "1.8" }}>
        <li>
          <strong>Account Information:</strong> When you use Google Login or create an account, we collect your
          name, email address, and profile picture.
        </li>
        <li>
          <strong>User Content:</strong> Any data you upload via the Camera or input manually into the app.
        </li>
      </ul>

      <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        B. Information Collected Automatically
      </h3>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem", lineHeight: "1.8" }}>
        <li>
          <strong>Location Data:</strong> With your permission, we may collect precise or approximate location
          data to provide location-based features.
        </li>
        <li>
          <strong>Device &amp; Usage Information:</strong> We collect information about the device you use to
          access our Services, including device model, operating system, and unique device identifiers.
        </li>
        <li>
          <strong>Crash Data &amp; Performance:</strong> We use tools to collect logs and hardware information
          when the app crashes to help us fix bugs and improve stability.
        </li>
        <li>
          <strong>Analytics:</strong> We track &quot;Events&quot; (e.g., which buttons you click or how long you spend
          on a screen) to understand user behavior.
        </li>
      </ul>

      {/* Section 2 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        2. Technical Stack &amp; Third-Party Services
      </h2>
      <p style={{ marginBottom: "1rem" }}>
        Our Services are built using the Expo framework. We share data with the following third-party service
        providers to power our app:
      </p>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem", lineHeight: "1.8" }}>
        <li>
          <strong>Google Play Services:</strong> Used for core app functionality.
        </li>
        <li>
          <strong>Firebase (Google):</strong> Used for database management, cloud storage, and authentication.
        </li>
        <li>
          <strong>Google Analytics:</strong> Used to track app usage and user demographics anonymously.
        </li>
        <li>
          <strong>Google Login (OAuth):</strong> Used to provide a secure and easy way for you to access your
          account.
        </li>
      </ul>
      <p style={{ marginBottom: "2rem" }}>
        These third parties may collect information such as your IP address or advertising ID. We encourage you to
        review their respective privacy policies.
      </p>

      {/* Section 3 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        3. How We Use Your Information
      </h2>
      <p style={{ marginBottom: "0.75rem" }}>
        We use the collected data for the following purposes:
      </p>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem", lineHeight: "1.8" }}>
        <li>To provide, maintain, and improve our Services.</li>
        <li>To manage your user account and provide customer support.</li>
        <li>
          To analyze app performance (Crash Data) and user engagement (Analytics).
        </li>
        <li>
          To facilitate specific app features like location-based services or photo uploads (Camera).
        </li>
      </ul>

      {/* Section 4 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        4. Data Retention and Deletion
      </h2>
      <p style={{ marginBottom: "1rem" }}>
        We retain your personal information only for as long as necessary to fulfill the purposes outlined in this
        policy.
      </p>
      <p style={{ marginBottom: "2rem" }}>
        <strong>Account Deletion:</strong> Users may request the deletion of their account and associated data at
        any time by contacting us at the email address below or using the &quot;Delete Account&quot; feature within the app
        (where available).
      </p>

      {/* Section 5 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        5. Security
      </h2>
      <p style={{ marginBottom: "2rem" }}>
        We implement industry-standard security measures (including encryption in transit) to protect your data.
        However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot
        guarantee absolute security.
      </p>

      {/* Section 6 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        6. Children&apos;s Privacy
      </h2>
      <p style={{ marginBottom: "2rem" }}>
        Our Services are not intended for children under the age of 13. We do not knowingly collect personal
        information from children. If we discover that a child under 13 has provided us with personal information,
        we will delete it immediately.
      </p>

      {/* Section 7 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        7. Compliance (India DPDP Act &amp; Global)
      </h2>
      <p style={{ marginBottom: "2rem" }}>
        As an Indian entity, we aim to comply with the Digital Personal Data Protection (DPDP) Act. We process
        data based on your explicit consent, which you provide when signing up or granting system permissions (like
        Camera/Location). You have the right to withdraw consent, access your data, or request corrections.
      </p>

      {/* Section 8 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        8. Changes to This Policy
      </h2>
      <p style={{ marginBottom: "2rem" }}>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
        Privacy Policy on this page and updating the &quot;Effective Date.&quot;
      </p>

      {/* Section 9 */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        9. Contact Us
      </h2>
      <p style={{ marginBottom: "0.75rem" }}>
        If you have any questions or suggestions about our Privacy Policy, or wish to exercise your data rights,
        please contact our Grievance Officer:
      </p>
      <address style={{ fontStyle: "normal", lineHeight: "1.8" }}>
        <strong>madhyamakist pvt ltd (smallTech)</strong>
        <br />
        Email:{" "}
        <a href="mailto:contact@smalltech.in" style={{ color: "#256d1b" }}>
          contact@smalltech.in
        </a>
        <br />
        Address: 603 lily, flower valley, wanowrie, pune - 411040, maharashtra, india
      </address>

      <div style={{ marginTop: "3rem", borderTop: "1px solid #ddd", paddingTop: "1.5rem" }}>
        <Link href="/" style={{ color: "#256d1b", textDecoration: "underline" }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
