import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.ComponentProps<"input"> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-graphite/10 bg-white px-3 py-2 text-sm text-graphite",
          "placeholder:text-graphite/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spicy-orange/50",
          "disabled:opacity-50 disabled:pointer-events-none",
          "transition-colors duration-150",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, type InputProps };
