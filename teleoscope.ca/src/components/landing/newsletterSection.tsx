"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// TODO: Add server action to subscribe to newsletter
export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/email/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Subscription successful!');
      } else {
        setMessage(data.error || 'Something went wrong');
      }
    } catch (error) {
      setMessage('Failed to subscribe');
    }
  };

  return (
    <div className="flex items-center justify-between w-full p-10 border-y">
      <div className="flex flex-col gap-2 w-full py-2">
        <span className="text-lg font-bold">Stay in the loop</span>
        <span className="max-w-sm text-sm">
          Stay up to date with the latest developments in research and join our community with our newsletter.
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center justify-end py-4 gap-2">
        <Input
          type="email"
          id="email"
          placeholder="Jane@doe.com"
          className="w-60 bg-neutral-50 min-w-fit"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button
          type="submit"
          className="bg-black text-white hover:text-white hover:shadow-xl hover:bg-black"
        >
          Subscribe
        </Button>
      </form>
      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
}
