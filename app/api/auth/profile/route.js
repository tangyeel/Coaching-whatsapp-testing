import { getAuthContext } from "@/lib/auth";

export async function GET(request) {
  const auth = await getAuthContext(request);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  return Response.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile: auth.profile,
    institute: auth.institute,
    role: auth.role,
  });
}
