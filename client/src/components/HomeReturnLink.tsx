import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

/**
 * Keep the homepage free of a redundant return action while ensuring every
 * nested, protected, unmatched, and public route provides a clear escape path.
 */
export function shouldShowHomeReturn(path: string): boolean {
  return path !== "/" && !path.startsWith("/guardian/dashboard") && !path.startsWith("/tutor/dashboard");
}

export default function HomeReturnLink() {
  const [location] = useLocation();

  if (!shouldShowHomeReturn(location)) {
    return null;
  }

  return (
    <nav
      aria-label="Homepage navigation"
      className="relative z-50 border-b border-sky-100 bg-white/95 text-sky-900 shadow-sm backdrop-blur"
    >
      <div className="container flex min-h-12 items-center justify-end">
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-sky-800 transition-[transform,background-color,color] duration-150 ease-out hover:bg-sky-50 hover:text-sky-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <ArrowLeft
            aria-hidden="true"
            className="size-4 text-sky-700 transition-transform duration-150 ease-out group-hover:-translate-x-0.5"
          />
          <span>Back to home</span>
        </Link>
      </div>
    </nav>
  );
}
