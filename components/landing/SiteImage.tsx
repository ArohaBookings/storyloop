import Image from "next/image";

/**
 * Responsive, optimised photo slot for the real educator images in
 * public/images. Above-the-fold photos can opt into priority loading while
 * feature-band photos remain lazy-loaded by Next.js.
 */
export default function SiteImage({
  src,
  alt,
  className = "",
  rounded = "rounded-3xl",
  caption,
  priority = false,
  sizes = "(min-width: 1024px) 48vw, 100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  rounded?: string;
  caption?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-cream-100 ${rounded} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />

      {caption && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-900/70 to-transparent p-4">
          <p className="text-xs font-medium text-paper/95">{caption}</p>
        </div>
      )}
    </div>
  );
}
