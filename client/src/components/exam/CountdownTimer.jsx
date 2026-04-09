const CountdownTimer = ({ secondsLeft = 0, formattedTime = '00:00' }) => {
  const isCritical = secondsLeft < 300;

  return (
    <div
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 py-2 font-heading text-base font-semibold tabular-nums shadow-editorialSm sm:px-5 sm:text-lg ${
        isCritical ? 'animate-pulse border-red-500 bg-red-500 text-white' : 'border-accent bg-accent text-accentFg'
      }`}
    >
      {formattedTime}
    </div>
  );
};

export default CountdownTimer;
