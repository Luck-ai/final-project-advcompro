"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Card, CardContent, CardHeader } from "./card";
import { Button } from "./button";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => Promise<void> | void;
    error?: string | null;
    // optional styling overrides (applied to the Card wrapper and buttons)
    cardClassName?: string;
    confirmClassName?: string;
    cancelClassName?: string;
    dialogContentClassName?: string;
}

export function ConfirmDialog({ open, onOpenChange, title = "Are you sure?", description = "This action cannot be undone.", confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, error = null, cardClassName, confirmClassName, cancelClassName, dialogContentClassName }: ConfirmDialogProps) {
    const [loading, setLoading] = React.useState(false);
    async function handleConfirm() {
        try {
            setLoading(true);
            await onConfirm();
            onOpenChange(false);
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className={dialogContentClassName || "sm:max-w-[420px] p-0"}>
                <Card className={`m-0 ${cardClassName || ""}`}>
                    <CardHeader>
                        <DialogTitle className="leading-none font-semibold">{title}</DialogTitle>
                        {description && (<DialogDescription className="text-muted-foreground text-sm">{description}</DialogDescription>)}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {error && (<div role="alert"><div className="text-sm text-destructive font-medium">{error}</div></div>)}
                            <div className="flex items-center justify-end gap-3">
                                <Button className={cancelClassName} variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>{cancelLabel}</Button>
                                <Button className={confirmClassName} variant="destructive" onClick={handleConfirm} disabled={loading}>{confirmLabel}</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
