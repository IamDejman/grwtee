/**
 * A newsletter link's page: the action happens when the person presses the
 * button, not when the link is opened, because email security scanners
 * open links by themselves (WEB-18).
 */
export function NewsletterActionPage({
  heading,
  body,
  action,
  token,
  button
}: {
  heading: string;
  body: string;
  action: string;
  token: string | undefined;
  button: string;
}) {
  return (
    <div className="pattern-light">
      <div className="container-shell py-20 text-center">
        <p className="font-accent text-xs font-semibold tracking-[0.25em] text-green-dark">NEWSLETTER</p>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-purple-dark">
          {token ? heading : "This link is incomplete."}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-dark/80">
          {token ? body : "Open the link from the email again, or copy the whole address into your browser."}
        </p>
        {token ? (
          <form method="post" action={action} className="mt-8 flex justify-center">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="rounded-full bg-green-dark px-8 py-3 font-accent font-semibold text-white transition hover:bg-purple-medium"
            >
              {button}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
