"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Bell, Settings, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useAppToast } from '@/lib/use-toast';
export function DashboardHeader() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    useEffect(() => {
        try {
            const email = localStorage.getItem("userEmail");
            setUserEmail(email);
        }
        catch (e) {
            setUserEmail(null);
        }
    }, []);
    const handleLogout = () => {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("userEmail");
        router.push("/login");
    };
    // Change password dialog state
    const [changeOpen, setChangeOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changeError, setChangeError] = useState<string | null>(null);
    const [changeLoading, setChangeLoading] = useState(false);

    // Delete account confirm dialog
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
  const { push } = useAppToast();

    async function handleChangePassword() {
      setChangeError(null);
      if (!currentPassword || !newPassword) {
        setChangeError('Please fill all fields');
        return;
      }
      if (newPassword !== confirmPassword) {
        setChangeError('New passwords do not match');
        return;
      }
      setChangeLoading(true);
      try {
        // Try calling backend change password endpoint; if not implemented, show error
        const res = await apiFetch('/users/change-password', {
          method: 'POST',
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setChangeError(err.detail || err.message || 'Failed to change password');
          push({ title: 'Password change failed', description: err.detail || err.message || 'Failed to change password', variant: 'error' });
          return;
        }
        // success
        setChangeOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        push({ title: 'Password changed', description: 'Your password was updated successfully', variant: 'success' });
      }
      catch (e) {
        setChangeError('Failed to change password. Please try again later.');
      }
      finally {
        setChangeLoading(false);
      }
    }

    async function handleDeleteAccount() {
      setDeleteError(null);
      try {
        const res = await apiFetch('/users/', { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setDeleteError(err.detail || err.message || 'Failed to delete account');
          push({ title: 'Delete failed', description: err.detail || err.message || 'Failed to delete account', variant: 'error' });
          return;
        }
        // on success, clear and navigate to signup
        localStorage.clear();
        router.push('/signup');
        push({ title: 'Account deleted', description: 'Your account was deleted.', variant: 'success' });
      }
      catch (e) {
        setDeleteError('Failed to delete account. Please try again later.');
      }
    }
    return (<>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">OS</span>
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              OptiStock
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Stock Manager</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail ?? "user@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChangeOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                <Search className="mr-2 h-4 w-4" />
                Delete account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4"/>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
  <DialogContent className="sm:max-w-[420px] p-0 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 rounded-md p-6">
            <DialogHeader>
              <DialogTitle className="text-orange-800 dark:text-orange-200">Change password</DialogTitle>
              <DialogDescription className="text-orange-700 dark:text-orange-300">Update your account password.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {changeError && (<div className="text-sm text-destructive">{changeError}</div>)}
              <div className="flex flex-col gap-3">
                <Label>Current password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-orange-50 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-orange-300 text-foreground !focus-visible:!ring-orange-200 !focus-visible:!ring-4 !focus-visible:!border-orange-400" style={{ ['--tw-ring-color' as any]: 'rgba(249, 115, 22, 0.6)' }} />
              </div>
              <div className="flex flex-col gap-3">
                <Label>New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-orange-50 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-orange-300 text-foreground !focus-visible:!ring-orange-200 !focus-visible:!ring-4 !focus-visible:!border-orange-400" style={{ ['--tw-ring-color' as any]: 'rgba(249, 115, 22, 0.6)' }} />
              </div>
              <div className="flex flex-col gap-3">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-orange-50 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-orange-300 text-foreground !focus-visible:!ring-orange-200 !focus-visible:!ring-4 !focus-visible:!border-orange-400" style={{ ['--tw-ring-color' as any]: 'rgba(249, 115, 22, 0.6)' }} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setChangeOpen(false)} disabled={changeLoading}>Cancel</Button>
                <Button onClick={handleChangePassword} disabled={changeLoading} className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600">{changeLoading ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      {/* Delete Account Confirm Dialog */}
      <div>
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete account"
          description="This will permanently delete your account and all data."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteAccount}
          error={deleteError}
          cardClassName="!bg-orange-50 !border-orange-200 dark:!bg-orange-950/30 dark:!border-orange-800 rounded-md"
          dialogContentClassName="sm:max-w-[420px] p-0 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 rounded-md p-6"
          confirmClassName="bg-orange-600 text-white hover:bg-orange-700"
          cancelClassName="text-orange-700"
        />
      </div>
    </>);
}
