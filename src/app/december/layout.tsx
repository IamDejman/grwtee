import "@fontsource-variable/cormorant-garamond/wght.css";

export default function DecemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="touch-manipulation bg-night [color-scheme:dark] [&_:focus-visible]:outline-gold [&_[tabindex='-1']:focus-visible]:outline-none">
      {children}
    </div>
  );
}
