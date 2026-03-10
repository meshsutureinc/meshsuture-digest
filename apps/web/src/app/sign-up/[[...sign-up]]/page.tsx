import { redirect } from "next/navigation";

const signUpUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ||
  "https://accounts.dailydigest.meshsuture.com/sign-up";

export default function SignUpPage() {
  redirect(signUpUrl);
}
