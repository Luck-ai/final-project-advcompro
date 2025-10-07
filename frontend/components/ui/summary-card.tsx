import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";
function SummaryCard({ className, ...props }: React.ComponentProps<typeof Card>) {
    return <Card className={cn("glass-card glass-card--lg", className)} {...props}/>;
}
export { SummaryCard };
