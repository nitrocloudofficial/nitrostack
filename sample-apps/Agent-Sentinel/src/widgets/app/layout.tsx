// @ts-ignore: allow importing CSS in TSX without type declarations
import "./globals.css";

export const metadata = {
  title: "AgentSentinel",
  description: "Enterprise AI Security Operations Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0B1220",
          color: "#F9FAFB",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}