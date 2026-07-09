/** Utilisateur connecté (démo — à brancher sur l’auth backend plus tard). */
export const SESSION_USER = {
  name: "Johann Faraut",
  firstName: "Johann",
  role: "Gérant",
  initials: "JF",
} as const;

export function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}
