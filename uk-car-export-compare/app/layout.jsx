import "./globals.css";

export const metadata = {
  title: "UK Car Export Compare | Ship Cars from UK to Africa",
  description:
    "Compare UK car export, shipping, inspection and clearing quotes for Botswana, Nigeria, Zimbabwe, Ghana, Kenya and Zambia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
