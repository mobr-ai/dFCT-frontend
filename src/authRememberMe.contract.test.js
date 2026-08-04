import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";


const root = process.cwd();

const authPage = fs.readFileSync(
  path.join(root, "src/pages/AuthPage.jsx"),
  "utf8",
);

const walletLogin = fs.readFileSync(
  path.join(
    root,
    "src/components/wallet/CardanoWalletLogin.jsx",
  ),
  "utf8",
);


describe("remember-me authentication contract", () => {
  it("sends remember_me during email authentication", () => {
    expect(authPage).toContain(
      "remember_me: rememberMe",
    );
  });

  it("sends remember_me during Google authentication", () => {
    expect(authPage).toMatch(
      /token:\s*tokenResponse\.access_token,[\s\S]*remember_me:\s*rememberMe/,
    );
  });

  it("passes remember-me state to wallet authentication", () => {
    expect(authPage).toContain(
      "rememberMe={rememberMe}",
    );
  });

  it("sends remember_me during Cardano verification", () => {
    expect(walletLogin).toContain(
      "remember_me: rememberMe",
    );
  });

  it("shows the control for the whole login form", () => {
    expect(authPage).toContain(
      'props.type === "login" && !confirmationError',
    );
    expect(authPage).toContain(
      'label={t("keepMeLoggedIn")}',
    );
  });
});
