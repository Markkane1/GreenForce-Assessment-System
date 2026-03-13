import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-3xl rounded-[2rem] border-2 border-foreground bg-card p-10 shadow-pop">
      <span className="inline-flex rounded-full border-2 border-foreground bg-secondary px-4 py-2 text-sm font-medium text-foreground shadow-pop-soft">
        404
      </span>
      <h1 className="mt-6 font-heading text-4xl font-extrabold text-foreground">Page Not Found</h1>
      <p className="mt-4 max-w-2xl text-lg text-mutedFg">
        The page you requested does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
      >
        Return Home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
