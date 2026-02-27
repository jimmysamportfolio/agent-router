import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface TextareaProps extends React.ComponentProps<"textarea"> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-graphite/10 bg-white px-3 py-2 text-sm text-graphite",
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
Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
