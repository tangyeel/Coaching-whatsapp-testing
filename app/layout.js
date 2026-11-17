import "./globals.css";

export const metadata = {
  title: "School & Coaching Portal",
  description: "Multi-tenant portal for attendance, marks, fees, and WhatsApp alerts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
