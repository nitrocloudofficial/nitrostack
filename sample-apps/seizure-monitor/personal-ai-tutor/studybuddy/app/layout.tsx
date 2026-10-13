import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy AI – Personal AI Tutor & Research Companion",
  description:
    "Upload notes, ask doubts, generate quizzes, and build a personalized revision plan with AI. Supports English, Hindi, and Hinglish.",
  keywords: "AI tutor, study buddy, quiz generator, flashcards, JEE, NEET, CBSE, revision planner",
  openGraph: {
    title: "StudyBuddy AI",
    description: "Your Personal AI Tutor for Every Subject",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
