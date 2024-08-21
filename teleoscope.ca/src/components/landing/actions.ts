"use server";
import { z } from "zod";

const NEXT_MAILCHIMP_URL = process.env.NEXT_MAILCHIMP_URL;
const schema = z.string().email();

export async function subscribeToNewsletter(
  previousState: any,
  formData: FormData
) {
  const email = formData.get("email");
  try {
    schema.parse(email);
  } catch (error) {
    return {
      ...previousState,
      subscribeStatus: "error",
      message: "make sure you enter a valid email address",
    };
  }

  try {
    if (!NEXT_MAILCHIMP_URL) {
      throw new Error("Mailchimp URL not set");
    }
    const response = await fetch(NEXT_MAILCHIMP_URL, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        ...previousState,
        subscribeStatus: "error",
        message: "Could not subscribe",
      };
    }
  } catch (error) {
    return {
      ...previousState,
      subscribeStatus: "error",
      message: "Could not subscribe; please try again later.",
    };
  }

  return {
    ...previousState,
    subscribeStatus: "subscribed",
    message: "Welcome to the newsletter!",
  };
}
