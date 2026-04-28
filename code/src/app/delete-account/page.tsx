import type { Metadata } from "next";
import DeleteAccountClient from "./DeleteAccountClient";

export const metadata: Metadata = {
  title: "Delete Account | #local by smallTech",
  description:
    "Learn how to request deletion of your #local account and associated data. Submit a deletion request by emailing smallTech.",
};

export default function DeleteAccountPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        Delete Your Account
      </h1>
      <p style={{ color: "#555", marginBottom: "2rem" }}>
        <strong>App:</strong> #local &nbsp;|&nbsp; <strong>Developer:</strong> smallTech (madhyamakist pvt ltd)
      </p>

      <p style={{ marginBottom: "1.5rem" }}>
        We respect your right to control your personal data. If you would like to permanently delete your{" "}
        <strong>#local</strong> account and the data associated with it, please follow the steps below.
      </p>

      {/* Steps */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        How to Request Account Deletion
      </h2>
      <ol style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem", lineHeight: "2" }}>
        <li>
          Open any email app (Gmail, Outlook, Yahoo Mail, etc.) or go to{" "}
          <a
            href="https://mail.google.com/mail/?view=cm&to=contact@smalltech.in&su=Deletion%20of%20the%20account"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#16a34a", fontWeight: "600", textDecoration: "underline" }}
          >
            Gmail on the web
          </a>
          .
        </li>
        <li>
          Send the email to <strong>contact@smalltech.in</strong> with the subject{" "}
          <strong>Deletion of the account</strong>.
        </li>
        <li>
          In the body, include the <strong>Google account email address</strong> (Gmail) you used to sign
          in to the <strong>#local</strong> app.
        </li>
        <li>Wait for a confirmation reply from our team.</li>
      </ol>

      {/* Interactive copy + action panel — client component */}
      <DeleteAccountClient />

      {/* Data details */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        What Data Is Deleted
      </h2>
      <p style={{ marginBottom: "1rem" }}>
        Upon successful verification of your request, the following data associated with your account will
        be <strong>permanently deleted</strong>:
      </p>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "1.5rem", lineHeight: "1.9" }}>
        <li>Your account profile (name, email address, profile picture)</li>
        <li>All civic issues you reported through the app</li>
        <li>Any votes, comments, or interactions linked to your account</li>
        <li>App preferences and settings stored against your account</li>
      </ul>

      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        What Data May Be Retained
      </h2>
      <p style={{ marginBottom: "1rem" }}>
        Certain data may be retained after your deletion request in the following circumstances:
      </p>
      <ul style={{ paddingLeft: "1.5rem", marginBottom: "2rem", lineHeight: "1.9" }}>
        <li>
          <strong>Legal or regulatory obligations:</strong> We may retain records required by law for up to{" "}
          <strong>3 years</strong> from the date of deletion.
        </li>
        <li>
          <strong>Anonymised / aggregated data:</strong> Data stripped of all personally identifying
          information may be kept for analytics and product improvement purposes indefinitely.
        </li>
        <li>
          <strong>Backup systems:</strong> Deleted data may persist in encrypted backups for up to{" "}
          <strong>90 days</strong> before being purged from all backup copies.
        </li>
      </ul>

      {/* Timeline */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        Processing Time
      </h2>
      <p style={{ marginBottom: "2rem" }}>
        We will process your account deletion request within <strong>7 business days</strong> of receiving
        your email. You will receive a confirmation email once your account has been deleted.
      </p>

      {/* Contact */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>
        Questions?
      </h2>
      <p style={{ marginBottom: "0.5rem" }}>
        If you have any questions about account deletion or your data, please reach out to us:
      </p>
      <p>
        <strong>Email:</strong>{" "}
        <a
          href="mailto:contact@smalltech.in"
          style={{ color: "#16a34a", textDecoration: "underline" }}
        >
          contact@smalltech.in
        </a>
      </p>
    </div>
  );
}
