import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
    variants: {
        variant: {
            // make primary less bright in dark mode and slightly more muted
            // primary: bright in light mode, much more muted/darker in dark mode
            default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 active:scale-[0.995] transition-all duration-150 focus-visible:ring-primary/50 focus-visible:ring-[3px] dark:bg-primary dark:text-primary-foreground dark:shadow-none dark:hover:bg-primary/90",
            // destructive should be toned down in dark mode
            // destructive: tone down red in dark mode
            destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-red-700/80 dark:text-white",
            // outline should use darker muted backgrounds in dark mode
            // outline: use subtler borders/background in dark mode
            outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:border-neutral-700 dark:hover:bg-white/3",
            // secondary muted in dark
            // secondary: muted background in dark
            secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 dark:bg-neutral-700 dark:text-neutral-200",
            // ghost: also soften hover in dark
            // ghost: very subtle hover in dark
            ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/5",
            link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
            default: "h-9 px-3 py-1.5 has-[>svg]:px-2 text-sm font-medium",
            sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
            lg: "h-10 rounded-md px-5 has-[>svg]:px-4",
            icon: "size-9",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}) {
    const Comp = asChild ? Slot : "button";
    return (<Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}/>);
}
export { Button, buttonVariants };
