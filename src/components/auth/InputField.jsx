const InputField = ({ label, type = "text", placeholder, value, onChange, error }) => {
  return (
    <label className="flex flex-col gap-2 text-sm text-ink">
      <span className="font-semibold">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`h-11 w-full rounded-xl border bg-[#F9FAFB] px-3 text-sm text-ink focus:outline focus:outline-2 focus:outline-accent-primary ${
          error ? "border-red-400 focus:outline-red-400" : "border-border"
        }`}
      />
      {error ? <span className="text-[12px] text-red-500">{error}</span> : null}
    </label>
  );
};

export default InputField;
