import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in | Veterinary Success Network",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
