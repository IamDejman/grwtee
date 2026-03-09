"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const serviceOptions = [
  { value: "virtual-personal-styling", label: "Virtual Personal Styling" },
  { value: "virtual-wardrobe-styling", label: "Virtual Wardrobe Styling" },
  { value: "wardrobe-revamp", label: "Wardrobe Revamp (In-person)" },
  { value: "virtual-event-styling", label: "Virtual Event Styling" },
  { value: "photoshoot-styling", label: "Photoshoot Styling" },
  { value: "virtual-vacation-styling", label: "Virtual Vacation Styling" },
  { value: "personal-shopping", label: "Personal Shopping" },
  { value: "retainer-styling", label: "Retainer Styling" }
];

type FormState = "idle" | "submitting" | "success" | "error";

export default function BookPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);

    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      phone: fd.get("phone") as string,
      service: fd.get("service") as string,
      message: JSON.stringify({
        city: fd.get("city"),
        additionalNotes: fd.get("additionalNotes")
      })
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        setState("success");
      } else {
        setState("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="pattern-light">
        <div className="container-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-green-dark/10 p-4">
            <svg className="h-12 w-12 text-green-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 font-heading text-3xl font-semibold text-purple-dark">
            Thank You!
          </h1>
          <p className="mt-3 max-w-md font-body text-base text-gray-dark/80">
            Your booking request has been submitted. We&apos;ll reach out within
            24–48 hours to get you started.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-purple-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Hey Muse!
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Fill out the form below and we&apos;ll reach out within 24–48 hours to
          get you started.
        </p>

        <div className="mt-10 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/40 md:p-8">
          <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
            Contact Information
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-gray-dark/85">
            <li>
              Email:{" "}
              <a className="font-semibold text-green-dark" href="mailto:book@grwtee.com">
                book@grwtee.com
              </a>
            </li>
            <li>
              Instagram:{" "}
              <a
                className="font-semibold text-green-dark"
                href="https://instagram.com/grwtee"
                target="_blank"
                rel="noreferrer"
              >
                @grwtee
              </a>
            </li>
            <li>Location: Lagos, Nigeria, Styling Clients Worldwide</li>
            <li>Response Time: We typically respond within 24–48 hours</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-10">
          {/* Personal Information */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-medium/40 md:p-8">
            <legend className="font-heading text-xl font-semibold text-purple-dark">
              Personal Information
            </legend>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Input label="Full Name" name="name" required placeholder="Jane Doe" />
              <Input label="Email" name="email" type="email" required placeholder="jane@example.com" />
              <Input label="Phone Number" name="phone" type="tel" required placeholder="+234 800 000 0000" />
              <Input label="City" name="city" placeholder="Lagos" />
            </div>
          </fieldset>

          {/* Service Selection */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-medium/40 md:p-8">
            <legend className="font-heading text-xl font-semibold text-purple-dark">
              Service Selection
            </legend>
            <div className="mt-4">
              <Select
                label="Which service are you booking?"
                name="service"
                required
                options={serviceOptions}
                placeholder="Select a service"
              />
            </div>
          </fieldset>

          {/* Additional Notes */}
          <fieldset className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-medium/40 md:p-8">
            <legend className="font-heading text-xl font-semibold text-purple-dark">
              Additional Notes
            </legend>
            <div className="mt-4">
              <Textarea
                label="Anything else we should know?"
                name="additionalNotes"
                rows={3}
                placeholder="Special occasions, budget range, inspiration links, etc."
              />
            </div>
          </fieldset>

          {errorMsg && (
            <p className="text-center text-sm font-semibold text-red-600">{errorMsg}</p>
          )}

          <div className="flex justify-center">
            <Button type="submit" variant="primary" size="lg" loading={state === "submitting"}>
              Submit Booking Request
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
