import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  name: z.string().min(2).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
