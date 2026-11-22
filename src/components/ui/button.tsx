import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("button", {
  variants: { variant: { default: "", outline: "button-outline" } },
  defaultVariants: { variant: "default" },
});
export function Button({
  className,
  variant,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
