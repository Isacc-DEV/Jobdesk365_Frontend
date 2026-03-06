import { forwardRef, type ImgHTMLAttributes, type CSSProperties } from "react";

type NextImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
};

const Image = forwardRef<HTMLImageElement, NextImageProps>(function Image(
  { fill = false, priority = false, style, loading, ...props },
  ref
) {
  const mergedStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;

  return (
    <img
      ref={ref}
      loading={priority ? "eager" : loading}
      style={mergedStyle}
      {...props}
    />
  );
});

export default Image;
