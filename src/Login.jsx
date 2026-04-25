import { useState } from "react";

const CREDENTIALS = {
  admin: { password: "123456", section: "transport", label: "Fura" },
  ombor: { password: "123456", section: "ombor", label: "Ombor" },
};

export default function Login({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      const key = login.trim().toLowerCase();
      const credential = CREDENTIALS[key];

      if (credential && password === credential.password) {
        localStorage.setItem(
          "temir_auth",
          JSON.stringify({
            login: key,
            section: credential.section,
            loggedInAt: new Date().toISOString(),
          })
        );
        onLogin?.(credential.section);
      } else {
        setError("Login yoki parol noto'g'ri");
      }
      setLoading(false);
    }, 250);
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginBadge">Temir Zavod</div>
        <h1>Kirish</h1>
        <p>Transport kirim dasturiga kirish uchun login qiling.</p>

        <form onSubmit={handleSubmit} className="loginForm">
          <label>
            Login
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Login"
            />
          </label>
          <label>
            Parol
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parol"
            />
          </label>

          {error && <div className="loginError">{error}</div>}

          <button className="loginBtn" type="submit" disabled={loading}>
            {loading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>

        <div className="loginHint">
          Demo kirish: <strong>admin / 123456</strong> yoki <strong>ombor / 123456</strong>
        </div>
      </div>
    </div>
  );
}
