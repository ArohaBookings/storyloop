import Image from "next/image";

export default function AnimatedLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`storyloop-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="storyloop-mark-orbit" />
      <Image src="/logo.svg" alt="" width={size} height={size} priority={size >= 40} />
    </span>
  );
}
