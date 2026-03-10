import { redirect } from "next/navigation";

const signInUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ||
  "https://accounts.dailydigest.meshsuture.com/sign-in";

export default function SignInPage() {
  redirect(signInUrl);
}
