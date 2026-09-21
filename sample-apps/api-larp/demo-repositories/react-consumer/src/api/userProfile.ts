export type UserResponse = { id: number; name: string; status: "active" | "inactive" };

export function displayUser(response: UserResponse): string {
  const displayName = response.name;
  return displayName.trim();
}
