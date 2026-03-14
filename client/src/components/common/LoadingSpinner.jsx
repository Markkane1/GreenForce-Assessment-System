const LoadingSpinner = () => (
  <div className="flex min-h-[200px] items-center justify-center">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border border-border bg-card shadow-editorialSm" />
      <div className="absolute inset-2 rounded-full border border-accent bg-accent/10 animate-pulse" />
    </div>
  </div>
);

export default LoadingSpinner;
