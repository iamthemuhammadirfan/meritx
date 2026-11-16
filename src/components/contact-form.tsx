"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Arrow } from "./icons";
import { business } from "@/lib/business";
import styles from "./contact.module.css";

const options = [
  {
    value: "Software & business systems",
    label: "Software project",
    message: "What should the software do?",
    hint: "Describe the workflow, who will use it and the features or reports you need.",
    placeholder:
      "For example: a portal for job requests, manager approvals and monthly reporting.",
    guidance:
      "Include the process you want to improve, the people using it and any systems it needs to connect to.",
  },
  {
    value: "IT equipment & procurement",
    label: "Equipment supply",
    message: "Equipment, quantities & specifications",
    hint: "List the items, quantities and required models or specifications. Include configuration or installation needs.",
    placeholder:
      "For example: 12 business laptops, 16GB RAM, 512GB SSD, with Windows and initial setup.",
    guidance:
      "If the model is undecided, describe the applications and workload so we can review suitable specifications.",
  },
  {
    value: "Tender or BOQ quotation",
    label: "Tender / BOQ quotation",
    message: "Tender / BOQ requirements",
    hint: "Summarise the supply or installation scope, quantities and any compliance or quotation requirements.",
    placeholder:
      "Describe the BOQ items, required specifications, installation scope and quotation requirements.",
    guidance:
      "Add a reference and submission deadline if available. You can email the BOQ or tender documents separately.",
  },
  {
    value: "Networking & infrastructure",
    label: "Networking & Wi-Fi installation",
    message: "Site and network requirements",
    hint: "Include the site layout, number of users or network points, coverage needs and any existing equipment.",
    placeholder: "Describe the network installation or connectivity problem.",
    guidance:
      "Tell us whether this is a new installation, a relocation or work on an existing network.",
  },
  {
    value: "CCTV & surveillance",
    label: "CCTV installation",
    message: "Camera and recording requirements",
    hint: "Include the areas to cover, approximate camera count, recording needs and any existing equipment.",
    placeholder:
      "Describe the premises, viewing areas and recording requirements.",
    guidance:
      "A site layout or description helps us review camera positions, cabling and recording equipment.",
  },
  {
    value: "Installation & technical support",
    label: "Installation / technical support",
    message: "Systems and work required",
    hint: "Describe the equipment or software involved, the issue and any impact on your operations.",
    placeholder:
      "Tell us what needs to be installed, configured or investigated.",
    guidance:
      "Include the systems involved and any site access or operating constraints.",
  },
  {
    value: "Multiple services / General enquiry",
    label: "Multiple services / other enquiry",
    message: "Your requirement",
    hint: "Describe the project, the problem to solve and any relevant site or timing details.",
    placeholder: "Tell us what you need help with.",
    guidance:
      "An initial description is enough if the detailed scope is still being decided.",
  },
] as const;

export function ContactForm() {
  const [service, setService] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const result = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const option = options.find((item) => item.value === service);
  const software = service === options[0].value;
  const equipment = service === options[1].value;
  const tender = service === options[2].value;
  const siteWork =
    !!service && !software && !tender && service !== options[6].value;
  useEffect(() => {
    if (status === "sent") result.current?.focus();
    if (status === "error") errorBox.current?.focus();
  }, [status]);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/enquiry.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(
          payload.message ||
            "We couldn’t receive your enquiry. Please try again or contact us directly.",
        );
      setReference(payload.reference || "");
      setStatus("sent");
      form.reset();
    } catch (e) {
      setError(
        e instanceof Error && !e.message.includes("JSON")
          ? e.message
          : "We couldn’t receive your enquiry. Please call, email or WhatsApp us instead.",
      );
      setStatus("error");
    }
  }
  if (status === "sent")
    return (
      <div className={styles.success} id="enquiry" role="status">
        <Check size={36} aria-hidden="true" />
        <h2 ref={result} tabIndex={-1}>
          Your enquiry has been received.
        </h2>
        <p>
          Our team will review your requirements and follow up using the contact
          details you provided.
        </p>
        {reference && (
          <p className={styles.reference}>
            Enquiry reference<strong>{reference}</strong>
          </p>
        )}
        <p>
          To send a BOQ, specification or supporting document, email{" "}
          <a href={`mailto:${business.email}`}>{business.email}</a> and include
          this reference.
        </p>
        <button
          className="button button-outline"
          type="button"
          onClick={() => {
            setService("");
            setStatus("idle");
          }}
        >
          Send another enquiry <Arrow />
        </button>
      </div>
    );
  return (
    <form
      id="enquiry"
      className={styles.form}
      action="/api/enquiry.php"
      method="post"
      onSubmit={submit}
      aria-labelledby="enquiry-title"
      aria-busy={status === "sending"}
    >
      <h2 id="enquiry-title">Send a project enquiry</h2>
      <p className={styles.intro}>
        Select the type of work and share the details you have. We can clarify
        the scope with you.
      </p>
      <p className={styles.requiredNote}>
        Fields marked <span className={styles.required}>*</span> are required.
        All other details are optional.
      </p>
      <fieldset className={styles.fields} disabled={status === "sending"}>
        <fieldset className={styles.section}>
          <legend>Requirement</legend>
          <label className={styles.label}>
            What do you need? <span className={styles.required}>*</span>
            <select
              name="service"
              required
              value={service}
              aria-describedby="type-hint"
              onChange={(e) => setService(e.target.value)}
            >
              <option value="" disabled>
                Select an enquiry type
              </option>
              {options.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.typeHint} id="type-hint">
            {option?.guidance ||
              "Choose software, equipment supply, tender quotation or another technical service."}
          </p>
        </fieldset>
        <fieldset className={styles.section}>
          <legend>
            {option ? `${option.label} details` : "Project details"}
          </legend>
          <div className={styles.grid}>
            {software && (
              <>
                <label className={styles.label}>
                  Project stage{" "}
                  <span className={styles.optional}>(optional)</span>
                  <select name="project_stage" defaultValue="">
                    <option value="">Select if known</option>
                    <option>New software</option>
                    <option>Changes to an existing system</option>
                    <option>Not sure yet</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Budget range{" "}
                  <span className={styles.optional}>(optional)</span>
                  <input
                    name="budget"
                    maxLength={120}
                    placeholder="Include currency, if known"
                  />
                </label>
                <label className={`${styles.label} ${styles.full}`}>
                  Existing software or tools{" "}
                  <span className={styles.optional}>(optional)</span>
                  <input
                    name="existing_systems"
                    maxLength={500}
                    placeholder="Systems to connect to or replace"
                  />
                </label>
              </>
            )}
            {tender && (
              <>
                <label className={styles.label}>
                  Tender / BOQ reference{" "}
                  <span className={styles.optional}>(optional)</span>
                  <input
                    name="tender_reference"
                    maxLength={160}
                    placeholder="Reference or project name"
                  />
                </label>
                <label className={styles.label}>
                  Submission deadline{" "}
                  <span className={styles.optional}>(optional)</span>
                  <input
                    name="submission_deadline"
                    type="datetime-local"
                    aria-label="Submission deadline (optional)"
                    aria-describedby="deadline-hint"
                  />
                  <span className={styles.hint} id="deadline-hint">
                    Pakistan time (PKT, UTC+5).
                  </span>
                </label>
              </>
            )}
            {(siteWork || tender) && (
              <label className={styles.label}>
                {tender
                  ? "Delivery / project location"
                  : "Delivery / site location"}{" "}
                <span className={styles.optional}>(optional)</span>
                <input
                  name="location"
                  maxLength={240}
                  placeholder="City and site or office"
                />
              </label>
            )}
            {!!service && !tender && (
              <label className={styles.label}>
                Required by <span className={styles.optional}>(optional)</span>
                <input name="required_by" type="date" />
              </label>
            )}
            {equipment && (
              <label className={styles.label}>
                Supply and setup{" "}
                <span className={styles.optional}>(optional)</span>
                <select name="installation" defaultValue="">
                  <option value="">Select if known</option>
                  <option>Supply only</option>
                  <option>Supply and installation</option>
                  <option>Please advise</option>
                </select>
              </label>
            )}
            <label className={`${styles.label} ${styles.full}`}>
              <span id="requirement-label">
                {option?.message || "Your requirement"}{" "}
                <span className={styles.required}>*</span>
              </span>
              <textarea
                name="message"
                required
                minLength={20}
                maxLength={5000}
                rows={5}
                aria-labelledby="requirement-label"
                aria-describedby="message-hint"
                placeholder={
                  option?.placeholder ||
                  "Describe the project, equipment or technical work you need."
                }
              />
              <span className={styles.hint} id="message-hint">
                {option?.hint ||
                  "Include the scope, location and timing where relevant."}{" "}
                Please use at least 20 characters.
              </span>
            </label>
          </div>
        </fieldset>
        <fieldset className={styles.section}>
          <legend>Your contact details</legend>
          <div className={styles.grid}>
            <label className={styles.label}>
              Your name <span className={styles.required}>*</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Full name"
              />
            </label>
            <label className={styles.label}>
              Email address <span className={styles.required}>*</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@company.com"
              />
            </label>
            <label className={styles.label}>
              {tender ? "Buying organisation" : "Company"}{" "}
              <span className={styles.optional}>(optional)</span>
              <input
                name="company"
                autoComplete="organization"
                maxLength={160}
                placeholder="Organisation name"
              />
            </label>
            <label className={styles.label}>
              Phone / WhatsApp{" "}
              <span className={styles.optional}>(optional)</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                placeholder="Your contact number"
              />
            </label>
          </div>
        </fieldset>
        <div className="form-trap" aria-hidden="true">
          <label>
            Leave this field empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className={styles.consent}>
          <input name="privacy" type="checkbox" required value="accepted" />
          <span>
            I agree that MeritX may use these details to respond to my enquiry,
            as described in the <Link href="/privacy/">privacy notice</Link>.
          </span>
        </label>
        <div className={styles.submit}>
          <button className="button" type="submit">
            {status === "sending" ? (
              <>
                Sending <LoaderCircle className="loading-spin" size={18} />
              </>
            ) : (
              <>
                Send enquiry <Arrow />
              </>
            )}
          </button>
        </div>
      </fieldset>
      {status === "error" && (
        <div className={styles.error} role="alert" ref={errorBox} tabIndex={-1}>
          <p>{error}</p>
          <a href={`mailto:${business.email}`}>Email {business.email}</a>
        </div>
      )}
    </form>
  );
}
