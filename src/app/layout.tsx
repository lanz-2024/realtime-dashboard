import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Realtime Dashboard",
	description:
		"Live metrics dashboard with WebSocket and Server-Sent Events. Monitor CPU, memory, request rates, error rates, and latency in real time.",
	robots: { index: false, follow: false },
};

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
		</html>
	);
}
