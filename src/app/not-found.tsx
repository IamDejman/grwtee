import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pattern-light">
      <div className="container-shell py-20 text-center">
        <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">
          404
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-purple-dark">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-dark/80">
          The page you’re looking for doesn’t exist. Use the navigation or head back home.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="rounded-full bg-green-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}


