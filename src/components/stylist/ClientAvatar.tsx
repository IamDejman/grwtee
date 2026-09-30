/** Round client photo, or their initials when there isn't one. */
export function ClientAvatar({ name, src, size = 'md' }: { name: string; src: string | null; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-11 w-11 text-sm'
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${box} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden className={`${box} flex shrink-0 items-center justify-center rounded-full bg-atelier-lavender font-semibold text-purple-dark`}>
      {initials || '?'}
    </span>
  )
}
