import { Link } from 'react-router-dom';

const UnauthorizedPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-3xl rounded-[2rem] border-2 border-foreground bg-muted p-10 shadow-pop">
      <span className="inline-flex rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-medium shadow-pop-soft">
        Access denied
      </span>
      <h1 className="mt-6 font-heading text-4xl font-extrabold text-foreground">Unauthorized</h1>
      <p className="mt-4 max-w-2xl text-lg text-mutedFg">
        You do not have permission to view this route with the current account.
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

export default UnauthorizedPage;
