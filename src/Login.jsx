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
      <div className="loginAmbient loginAmbientOne" />
      <div className="loginAmbient loginAmbientTwo" />

      <div className="loginShell">
        <section className="loginCard loginCardCenter">
          <div className="loginOrbit loginOrbitOne" />
          <div className="loginOrbit loginOrbitTwo" />

          <div className="loginCardBody">
            <div className="loginBadge">Temir Zavod</div>

            <div className="loginHero loginHeroCenter">
              <div className="loginCardTop">
                <div>
                  <div className="loginEyebrow">Kirish</div>
                  <h1>Transport va ombor boshqaruvi.</h1>
                </div>
                <div className="loginStatus">Online</div>
              </div>

              <p className="loginLead">
                Tizimga kirib kirim yozuvlari, moshinalar va ombor mahsulotlarini bitta joydan boshqaring.
              </p>
            </div>

            <div className="loginFeatureList loginFeatureListCenter">
              <div className="loginFeature">
                <strong>Moshinalar</strong>
                <span>Raqam, egasi va telefon bo'yicha tez ro'yxat.</span>
              </div>
              <div className="loginFeature">
                <strong>Kirim</strong>
                <span>Moshina va mahsulot tanlab yozuv kiritish.</span>
              </div>
              <div className="loginFeature">
                <strong>Ombor</strong>
                <span>Qoldiq va jami narx bo'yicha nazorat.</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="loginForm">
              <label>
                Login
                <input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="admin yoki ombor"
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
        </section>
      </div>
    </div>
  );
}
