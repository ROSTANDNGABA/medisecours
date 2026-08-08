import "./globals.css"
import Providers from "./providers"

export const metadata = {
  title: "MediSecours+ | Les premiers gestes qui sauvent",
  description: "Plateforme médicale d'urgence pour le Cameroun : premiers soins, centres de santé, messagerie médecins.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className="h-dvh antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('medisecours_theme');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
