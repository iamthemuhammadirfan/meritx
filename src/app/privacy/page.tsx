import { pageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { business } from "@/lib/business";
export const metadata: Metadata = pageMetadata(
  "Privacy Notice",
  "How MeritX handles information submitted through its website enquiry form.",
  "/privacy/",
);
export default function PrivacyPage() {
  return (
    <main id="main" className="container policy-page">
      <p className="eyebrow">Your information</p>
      <h1>Privacy notice.</h1>
      <p className="large-copy">
        This notice explains how MeritX Solutions & Consultants uses information
        you choose to share through this website.
      </p>
      <h2>Information you provide</h2>
      <p>
        Our enquiry form collects your name, email address, selected service and
        message. You may also provide a company name, phone number, project
        stage, existing systems, budget, delivery location, setup needs,
        required-by date or tender reference and submission deadline. Please do
        not submit passwords, payment details, identity documents or other
        sensitive information through this form.
      </p>
      <h2>How we use it</h2>
      <p>
        We use your details to review your requirement, contact you and discuss
        a possible quotation or project. Submitting an enquiry does not
        subscribe you to a marketing list.
      </p>
      <h2>Storage and access</h2>
      <p>
        Enquiries are saved in a private directory on our hosting, outside the
        publicly accessible website files. An email notification may also be
        sent to our business inbox. Access is intended for the people handling
        your enquiry. You can contact us to request access, correction or
        deletion of your submitted information, subject to any records we need
        to retain for an active project or legal obligation.
      </p>
      <h2>Technical information</h2>
      <p>
        The form uses a hashed network address to limit repeated submissions.
        Hosting providers may also record standard access logs for operating and
        securing the website. The website does not use advertising trackers or
        analytics cookies.
      </p>
      <h2>External services</h2>
      <p>
        Links to WhatsApp and Google Maps open those services, which have their
        own privacy practices. They are not embedded into this website. Email
        links open your chosen email application.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions, email{" "}
        <a href={`mailto:${business.email}`}>{business.email}</a> or write to{" "}
        {business.address}, Pakistan.
      </p>
    </main>
  );
}
