const CountdownTimer = ({ secondsLeft = 0, formattedTime = '00:00' }) => {
  const isCritical = secondsLeft < 300;

  return (
    <div
      className={`inline-flex items-center rounded-full border px-5 py-2 font-heading text-lg font-semibold tabular-nums shadow-editorialSm ${
        isCritical ? 'animate-pulse border-red-500 bg-red-500 text-white' : 'border-accent bg-accent text-accentFg'
      }`}
    >
      {formattedTime}
    </div>
  );
};

export default CountdownTimer;
