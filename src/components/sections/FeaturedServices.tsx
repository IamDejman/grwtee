import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

const services = [
  {
    name: "Virtual Personal Styling",
    price: "Starting at: $155 / ₦195,000",
    description:
      "Curated looks tailored to your body type, lifestyle, and personal style.",
    href: "/services"
  },
  {
    name: "Wardrobe Revamp",
    price: "Starting at: $540 / ₦450,000",
    description:
      "A complete refresh of your closet to build a functional, signature wardrobe.",
    href: "/services"
  },
  {
    name: "Event Styling",
    price: "Starting at: $250 / ₦250,000",
    description:
      "Custom looks for birthdays, launches, red carpet moments, and private events.",
    href: "/services"
  }
];

export function FeaturedServices() {
  return (
    <section className="pattern-light py-16">
      <div className="container-shell">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-heading text-[28px] font-semibold leading-[36px] text-purple-dark md:text-[40px] md:leading-[48px]">
              Featured Services
            </h2>
            <p className="mt-2 max-w-2xl font-body text-base text-gray-dark/80">
              Three signature offerings to elevate your style—crafted with clarity,
              taste, and intention.
            </p>
          </div>
          <ButtonLink href="/services" variant="ghost" className="px-0">
            View all services →
          </ButtonLink>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.name} className="lux-card-hover">
              <CardHeader>
                <h3 className="font-heading text-2xl font-medium text-purple-medium">
                  {s.name}
                </h3>
                <p className="mt-2 font-accent text-sm font-semibold text-gold">
                  {s.price}
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm leading-6 text-gray-dark/80">
                  {s.description}
                </p>
                <div className="mt-6">
                  <ButtonLink href={s.href} variant="outline" size="sm">
                    Learn More
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}


