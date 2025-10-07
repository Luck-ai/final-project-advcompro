import * as React from "react";
import { cn } from "@/lib/utils";
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (<input type={type} data-slot="input" className={cn("file:text-foreground text-foreground placeholder:text-muted-foreground selection:bg-violet-500 selection:text-white dark:bg-input/30 flex h-11 w-full min-w-0 rounded-lg border bg-primary/10 px-4 py-2 text-base shadow-sm transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-4 focus-visible:shadow-md", "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", className)} {...props}/>);
}
export { Input };
