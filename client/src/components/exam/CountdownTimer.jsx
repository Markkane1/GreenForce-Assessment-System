const CountdownTimer = ({ secondsLeft = 0, formattedTime = '00:00' }) => {
  const isCritical = secondsLeft < 300;

  return (
    <div
      className={`inline-flex items-center rounded-full border-2 border-foreground px-5 py-2 font-heading text-lg font-bold tabular-nums shadow-pop-press ${
        isCritical ? 'animate-pulse bg-red-500 text-white' : 'bg-accent text-accentFg'
      }`}
    >
      {formattedTime}
    </div>
  );
};

export default CountdownTimer;
