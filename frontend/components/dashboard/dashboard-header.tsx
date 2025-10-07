"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Bell, Settings, LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
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
    return (<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4"/>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>);
}
