export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === "admin@grwtee.com";
}


