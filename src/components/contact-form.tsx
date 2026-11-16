"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Arrow } from "./icons";
import { services } from "@/lib/services";
import { business } from "@/lib/business";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
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
      <div className="form-success" role="status">
        <span>
          <Check size={32} />
        </span>
        <p className="eyebrow">Enquiry received</p>
        <h2>Thanks for the introduction.</h2>
        <p>
          Your requirement is with MeritX. We’ll review the details and use the
          contact information you provided to follow up.
        </p>
        {reference && <p className="reference">Your reference: {reference}</p>}
        <button
          className="button button-outline"
          onClick={() => setStatus("idle")}
          type="button"
        >
          Send another enquiry <Arrow />
        </button>
      </div>
    );
  return (
    <form
      className="enquiry-form"
      action="/api/enquiry.php"
      method="post"
      onSubmit={submit}
    >
      <div className="form-heading">
        <p className="eyebrow">Start a conversation</p>
        <h2>Tell us what you have in mind.</h2>
        <p>A little context helps us point you in the right direction.</p>
      </div>
      <div className="form-grid">
        <label>
          Your name <span>*</span>
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="Full name"
          />
        </label>
        <label>
          Email address <span>*</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@company.com"
          />
        </label>
        <label>
          Company
          <input
            name="company"
            autoComplete="organization"
            maxLength={160}
            placeholder="Organisation name"
          />
        </label>
        <label>
          Phone number
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="Your contact number"
          />
        </label>
        <label className="field-full">
          What can we help with? <span>*</span>
          <select name="service" required defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            {services.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value="Tender or BOQ quotation">
              Tender or BOQ quotation
            </option>
            <option value="Multiple services / General enquiry">
              Multiple services / General enquiry
            </option>
          </select>
        </label>
        <label className="field-full">
          A little about your requirement <span>*</span>
          <textarea
            name="message"
            required
            minLength={20}
            maxLength={5000}
            rows={5}
            placeholder="Tell us about your project, equipment requirements, location and any timelines."
          />
        </label>
      </div>
      <div className="form-trap" aria-hidden="true">
        <label>
          Leave this field empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="consent">
        <input name="privacy" type="checkbox" required value="accepted" />
        <span>
          I agree that MeritX may use these details to respond to my enquiry, as
          described in the <Link href="/privacy/">privacy notice</Link>.
        </span>
      </label>
      {status === "error" && (
        <div className="form-error" role="alert">
          <p>{error}</p>
          <a href={`mailto:${business.email}`}>Email {business.email}</a>
        </div>
      )}
      <div className="form-submit">
        <button
          className="button"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? (
            <>
              Sending <LoaderCircle className="loading-spin" size={18} />
            </>
          ) : (
            <>
              Send your enquiry <Arrow />
            </>
          )}
        </button>
        <span>
          Prefer to talk?
          <br />
          <a href={`tel:${business.phoneHref}`}>{business.phone}</a>
        </span>
      </div>
    </form>
  );
}
