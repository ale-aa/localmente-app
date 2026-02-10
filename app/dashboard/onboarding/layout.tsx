/**
 * Layout speciale per la pagina di onboarding
 * NON controlla onboarding_completed per evitare redirect loop
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
