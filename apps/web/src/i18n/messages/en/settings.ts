// Account settings page.
export const settings = {
  eyebrow: "Settings",
  title: "Your account",
  signedInAs: (email: string) => `Signed in as ${email}`,
  profile: {
    heading: "Public profile",
    displayName: "Display name",
    bio: "Bio",
    avatarUrl: "Avatar URL (https)",
    avatarPlaceholder: "https://…",
    save: "Save changes",
    saving: "Saving…",
    saved: "Profile saved",
    saveFailed: "Could not save profile",
  },
  language: {
    heading: "Language",
    helper: "Choose the language used across TechRat.",
  },
  connected: {
    heading: "Connected accounts",
    text: "GitHub, Google, Microsoft and Apple sign-in are planned. Your progress will carry over.",
  },
  session: {
    heading: "Session",
    signOut: "Sign out",
  },
};
