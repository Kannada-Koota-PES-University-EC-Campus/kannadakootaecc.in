
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { processSendEmail } from "../src/features/contact/services/sendEmail";

function contactApiDevPlugin(env: Record<string, string>) {
  return {
    name: "contact-api-dev-plugin",
    configureServer(server: any) {
      server.middlewares.use("/api/send-email", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let bodyStr = "";

        req.on("data", (chunk: any) => {
          bodyStr += chunk;
        });

        req.on("end", async () => {
          try {
            const body = JSON.parse(bodyStr || "{}");

            const result = await processSendEmail(body, {
              apiKey: env.RESEND_API_KEY,
              recipient: env.CONTACT_EMAIL_RECIPIENT,
              fromAddress: env.RESEND_FROM,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err.message || "Failed to send email",
              })
            );
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  Object.assign(process.env, env);

  return {
    // Explicitly point Vite to the repository's public directory
    publicDir: path.resolve(__dirname, "../public"),

    server: {
      host: "::",
      port: 8080,
    },

    plugins: [
      react(),
      mode === "development" && componentTagger(),
      contactApiDevPlugin(env),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../src"),
      },
    },
  };
});
