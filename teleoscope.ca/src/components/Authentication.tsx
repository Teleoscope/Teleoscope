"use client";

import * as React from "react";

import { errors, validateEmail, validatePassword } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  buttonText: string,
  onLogin? (formData: FormData): Promise<any>
}

export function UserAuthForm({ className, onLogin, buttonText, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [errorMessages, setErrorMessages] = React.useState<{ email?: string; password?: string }>({});
  

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!validateEmail(email)) {
      isValid = false;
      newErrors.email = 'Invalid email format.';
    }

    if (!validatePassword(password)) {
      isValid = false;
      newErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, numeric, and special characters.';
    }

    if (!isValid) {
      setErrorMessages(newErrors);
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    if (onLogin) {
      const res = await onLogin(formData);
      if (res) {
        console.log(res)
        if (res.error == errors.exists.error) {
          newErrors.email = 'Email already exists. Did you mean to sign in instead?';
          setErrorMessages(newErrors);
          setIsLoading(false);
          return;
        }

        if (res.error == errors.incorrect.error) {
          newErrors.email = 'Incorrect email or password.';
          setErrorMessages(newErrors);
          setIsLoading(false);
          return;
        }

        
      }
    }
    setIsLoading(false);
  }

  return (
    <div className={cn("grid gap-6 p-4", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              aria-label="email input"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errorMessages.email && <p className="text-red-500 text-xs">{errorMessages.email}</p>}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="password"
              type="password"
              hidden={true}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="password input"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errorMessages.password && <p className="text-red-500 text-xs">{errorMessages.password}</p>}
          </div>
          <Button disabled={isLoading}>
            {isLoading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : <>{buttonText}</>}
          </Button>
        </div>
      </form>
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div> */}
      {/* <Button variant="outline" type="button" disabled={isLoading}>
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.gitHub className="mr-2 h-4 w-4" />
        )}
        GitHub
      </Button> */}
    </div>
  );
}