export const metadata = {
  title: "CalorieLog API",
  description: "CalorieLog backend API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
