export const metadata = {
  title: "Book Now",
  description:
    "Book your styling session with GRWTEE. Fill out our intake form to get started."
};

export default function BookPage() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-16">
        <h1 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
          Book Your Styling Session
        </h1>
        <p className="mt-2 font-body text-base text-gray-dark/80">
          Fill out the form below and we&apos;ll reach out within 24–48 hours to
          get you started.
        </p>

        <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-medium/40">
          <iframe
            src="https://docs.google.com/forms/d/10Ld_yiWkmphfzfFvtBYAMXv7jaGFUqN8epHG9ZGLaKA/viewform?embedded=true"
            width="100%"
            height="1200"
            className="w-full border-0"
            title="GRWTEE Booking Form"
            loading="lazy"
          >
            Loading…
          </iframe>
        </div>
      </div>
    </div>
  );
}
