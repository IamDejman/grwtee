"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const schema = z.object({
  name: z.string().min(2, "Please enter at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  service: z.string().min(1, "Select a service"),
  message: z.string().optional(),
  agree: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms & Policies" })
  })
});

type FormData = z.infer<typeof schema>;

const options = [
  { value: "virtual-personal-styling", label: "Virtual Personal Styling" },
  { value: "virtual-wardrobe-styling", label: "Virtual Wardrobe Styling" },
  { value: "wardrobe-revamp", label: "Wardrobe Revamp" },
  { value: "virtual-event-styling", label: "Event Styling" },
  { value: "photoshoot-styling", label: "Photoshoot Styling" },
  { value: "virtual-vacation-styling", label: "Vacation Styling" },
  { value: "personal-shopping", label: "Personal Shopping" },
  { value: "general-inquiry", label: "General Inquiry" }
];

export default function ContactPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          service: data.service,
          message: data.message?.trim() || "No additional message.",
          turnstileToken
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Request failed. Please try again.");
        return;
      }
      setSuccess("Thank you! We'll be in touch soon.");
      setTurnstileToken("");
      reset();
    } catch {
      setError("Please correct the errors above or try again later.");
    }
  };

  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Let&apos;s Connect
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          We typically respond within 24–48 hours.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60"
          >
            <div className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Your name"
                required
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                required
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                type="tel"
                label="Phone Number"
                placeholder="+234 XXX XXX XXXX"
                required
                error={errors.phone?.message}
                {...register("phone")}
              />
              <Select
                label="Service Interest"
                required
                error={errors.service?.message}
                placeholder="Select a service"
                options={options}
                {...register("service")}
              />
              <Textarea
                label="Message"
                rows={6}
                placeholder="Tell us about your styling needs..."
                {...register("message")}
              />

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-medium"
                  {...register("agree")}
                />
                <span className="text-sm text-gray-dark/80">
                  I have read and agree to the{" "}
                  <a
                    className="font-semibold text-green-dark hover:text-purple-dark"
                    href="/terms"
                  >
                    Terms & Conditions
                  </a>{" "}
                  and{" "}
                  <a
                    className="font-semibold text-green-dark hover:text-purple-dark"
                    href="/payment"
                  >
                    Payment Policies
                  </a>
                </span>
              </label>
              {errors.agree?.message ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.agree.message}
                </p>
              ) : null}

              <TurnstileWidget onToken={setTurnstileToken} />
            </div>

            {success ? (
              <p className="mt-4 text-sm font-semibold text-green-700" role="status">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6">
              <Button
                type="submit"
                size="md"
                variant="primary"
                loading={isSubmitting}
                className="w-full md:w-auto"
              >
                Send Message
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
              <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
                Contact Information
              </h2>
              <ul className="mt-3 text-sm text-gray-dark/85">
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
            <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
              <h2 className="font-accent text-sm font-semibold tracking-wider text-green-dark">
                How to Book Our Services
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-gray-dark/85">
                <li>Fill out the contact form or email us directly</li>
                <li>Schedule a consultation call</li>
                <li>Receive your personalized service agreement</li>
                <li>Make payment to confirm your booking</li>
                <li>Begin your styling journey with GRWTEE</li>
              </ol>
              <a
                href="/services"
                className="mt-4 inline-flex rounded-full border border-green-dark px-6 py-2 font-accent font-semibold text-green-dark transition hover:bg-green-dark hover:text-white"
              >
                View Our Services
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
