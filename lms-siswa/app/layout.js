import "./globals.css";

export const metadata = {
  title: "E-Learning Lumora",
  description: "Portal siswa - E-Learning Lumora",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
