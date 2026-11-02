/**
 * Chrome-free layout for full-viewport work — generative canvases, scene
 * experiments, anything that needs the whole screen and its own navigation.
 */
export default function BareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex-1">{children}</main>;
}
