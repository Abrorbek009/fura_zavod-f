import { useEffect, useMemo, useState } from "react";
import { RxDoubleArrowLeft, RxDoubleArrowRight } from "react-icons/rx";
import Login from "./Login.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://fura-zavod-b-vhpt.vercel.app";

function getCurrentLocalDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

const emptyForm = {
  transport_date: getCurrentLocalDateValue(),
  truck_number: "",
  gross_weight_kg: "",
  tare_weight_kg: "",
  discount_kg: "",
  unit_price: "",
};

const omborEmptyForm = {
  stock_date: getCurrentLocalDateValue(),
  product_name: "",
  incoming_kg: "",
  outgoing_kg: "",
  unit_price: "",
};

const vehicleEmptyForm = {
  vehicle_date: getCurrentLocalDateValue(),
  owner_name: "",
  owner_phone: "",
  truck_number: "",
};

function toLocalInputValue(value) {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function toIsoFromDateInput(value) {
  if (!value) return new Date().toISOString();
  return new Date(`${value}T12:00:00`).toISOString();
}

function money(value) {
  return Number(value || 0).toLocaleString();
}

export default function App() {
  const storedAuth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("temir_auth") || "null");
    } catch {
      return null;
    }
  }, []);
  const [isAuthed, setIsAuthed] = useState(() => Boolean(storedAuth));
  const [activeSection, setActiveSection] = useState(
    storedAuth?.section || "transport"
  );
  const [items, setItems] = useState([]);
  const [omborItems, setOmborItems] = useState([]);
  const [vehicleItems, setVehicleItems] = useState([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalGrossWeight: 0,
    totalTareWeight: 0,
    totalCargoWeight: 0,
    totalDiscountWeight: 0,
    totalNetWeight: 0,
    totalPrice: 0,
    avgUnitPrice: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [omborForm, setOmborForm] = useState(omborEmptyForm);
  const [vehicleForm, setVehicleForm] = useState(vehicleEmptyForm);
  const [vehicleEditingId, setVehicleEditingId] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [omborEditingId, setOmborEditingId] = useState(null);
  const [omborSearch, setOmborSearch] = useState("");
  const [page, setPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [omborPage, setOmborPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const pageSize = 10;

  const gross = Number(form.gross_weight_kg || 0);
  const tare = Number(form.tare_weight_kg || 0);
  const cargoWeight = Math.max(gross - tare, 0);
  const discount = Number(form.discount_kg || 0);
  const unitPrice = Number(form.unit_price || 0);
  const netWeight = Math.max(cargoWeight - discount, 0);
  const totalPrice = netWeight * unitPrice;
  const incomingKg = Number(omborForm.incoming_kg || 0);
  const outgoingKg = Number(omborForm.outgoing_kg || 0);
  const stockBalance = Math.max(incomingKg - outgoingKg, 0);
  const stockUnitPrice = Number(omborForm.unit_price || 0);
  const stockTotalPrice = stockBalance * stockUnitPrice;

  async function loadData() {
    setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/transports`),
        fetch(`${API_URL}/api/transports/stats`),
      ]);
      setItems(await itemsRes.json());
      setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function loadOmborData() {
    setLoading(true);
    try {
      const omborRes = await fetch(`${API_URL}/api/ombor`);
      const serverItems = await omborRes.json();

      if (serverItems.length === 0) {
        try {
          const legacyItems = JSON.parse(
            localStorage.getItem("temir_ombor_items") || "[]"
          );

          if (legacyItems.length > 0) {
            for (const item of legacyItems) {
              const payload = {
                stock_date: item.stock_date,
                product_name: item.product_name,
                incoming_kg: Number(item.incoming_kg || 0),
                outgoing_kg: Number(item.outgoing_kg || 0),
                unit_price: Number(item.unit_price || 0),
              };

              await fetch(`${API_URL}/api/ombor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            }

            localStorage.removeItem("temir_ombor_items");
            const refillRes = await fetch(`${API_URL}/api/ombor`);
            setOmborItems(await refillRes.json());
            return;
          }
        } catch {
          // Ignore malformed legacy cache and use the server data.
        }
      }

      setOmborItems(serverItems);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicleData() {
    setLoading(true);
    try {
      const vehicleRes = await fetch(`${API_URL}/api/vehicles`);
      setVehicleItems(await vehicleRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthed && activeSection === "transport") {
      loadData();
      loadVehicleData();
    } else if (isAuthed && activeSection === "vehicles") {
      loadVehicleData();
    } else if (isAuthed && activeSection === "ombor") {
      loadOmborData();
    }
  }, [isAuthed, activeSection]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.truck_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [items, search]);

  const filteredVehicleItems = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicleItems;
    return vehicleItems.filter((item) =>
      [item.owner_name, item.owner_phone, item.truck_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [vehicleItems, vehicleSearch]);

  const transportVehicleOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    for (const vehicle of vehicleItems) {
      const truckNumber = String(vehicle.truck_number || "").trim();
      if (!truckNumber || seen.has(truckNumber)) continue;
      seen.add(truckNumber);
      options.push(vehicle);
    }

    const currentTruck = String(form.truck_number || "").trim();
    if (currentTruck && !seen.has(currentTruck)) {
      options.unshift({
        _id: `current-${currentTruck}`,
        truck_number: currentTruck,
        owner_name: "",
      });
    }

    return options.sort((a, b) =>
      String(a.truck_number).localeCompare(String(b.truck_number), "uz")
    );
  }, [vehicleItems, form.truck_number]);

  const filteredOmborItems = useMemo(() => {
    const q = omborSearch.trim().toLowerCase();
    if (!q) return omborItems;
    return omborItems.filter((item) =>
      [item.product_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [omborItems, omborSearch]);

  const totalVehiclePages = Math.max(Math.ceil(filteredVehicleItems.length / pageSize), 1);
  const currentVehiclePage = Math.min(vehiclePage, totalVehiclePages);
  const paginatedVehicles = filteredVehicleItems.slice(
    (currentVehiclePage - 1) * pageSize,
    currentVehiclePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, items.length]);

  useEffect(() => {
    setVehiclePage(1);
  }, [vehicleItems.length, vehicleSearch]);

  useEffect(() => {
    setOmborPage(1);
  }, [omborSearch, omborItems.length]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function resetForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      transport_date: getCurrentLocalDateValue(),
    });
  }

  function resetOmborForm() {
    setOmborEditingId(null);
    setOmborForm({
      ...omborEmptyForm,
      stock_date: getCurrentLocalDateValue(),
    });
  }

  function resetVehicleForm() {
    setVehicleEditingId(null);
    setVehicleForm({
      ...vehicleEmptyForm,
      vehicle_date: getCurrentLocalDateValue(),
    });
  }

  function handleEdit(item) {
    setEditingId(item._id);
    setForm({
      transport_date: toLocalInputValue(item.transport_date),
      truck_number: item.truck_number || "",
      gross_weight_kg: String(item.gross_weight_kg ?? ""),
      tare_weight_kg: String(item.tare_weight_kg ?? ""),
      discount_kg: String(item.discount_kg ?? ""),
      unit_price: String(item.unit_price ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        transport_date: toIsoFromDateInput(form.transport_date),
        gross_weight_kg: Number(form.gross_weight_kg),
        tare_weight_kg: Number(form.tare_weight_kg),
        cargo_weight_kg: cargoWeight,
        discount_kg: Number(form.discount_kg),
        unit_price: Number(form.unit_price),
      };

      const selectedVehicle = vehicleItems.find(
        (item) => String(item.truck_number || "").trim() === payload.truck_number
      );

      if (!selectedVehicle) {
        alert("Mashinani ro'yxatdan tanlang");
        return;
      }

      const url = editingId
        ? `${API_URL}/api/transports/${editingId}`
        : `${API_URL}/api/transports`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Save failed");
      }

      resetForm();
      await loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const response = await fetch(`${API_URL}/api/transports/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      alert(error.message || "Delete failed");
      return;
    }
    await loadData();
  }

  function requestDeleteTransport(item) {
    setDeleteTarget({
      kind: "transport",
      id: item._id,
      title: item.truck_number || "Tanlangan yozuv",
    });
  }

  const handleOmborEdit = (item) => {
    setOmborEditingId(item._id);
    setOmborForm({
      stock_date: item.stock_date,
      product_name: item.product_name || "",
      incoming_kg: String(item.incoming_kg ?? ""),
      outgoing_kg: String(item.outgoing_kg ?? ""),
      unit_price: String(item.unit_price ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handleOmborDelete(id) {
    const response = await fetch(`${API_URL}/api/ombor/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      alert(error.message || "Delete failed");
      return;
    }
    await loadOmborData();
    if (omborEditingId === id) resetOmborForm();
  }

  function requestDeleteOmbor(item) {
    setDeleteTarget({
      kind: "ombor",
      id: item._id,
      title: item.product_name || "Tanlangan ombor yozuvi",
    });
  }

  function handleVehicleEdit(item) {
    setVehicleEditingId(item._id);
    setVehicleForm({
      vehicle_date: toLocalInputValue(item.vehicle_date),
      owner_name: item.owner_name || "",
      owner_phone: item.owner_phone || "",
      truck_number: item.truck_number || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleVehicleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        vehicle_date: toIsoFromDateInput(vehicleForm.vehicle_date),
        owner_name: vehicleForm.owner_name.trim(),
        owner_phone: vehicleForm.owner_phone.trim(),
        truck_number: vehicleForm.truck_number.trim(),
      };

      if (!payload.owner_name || !payload.owner_phone || !payload.truck_number) {
        alert("Egasining ismi, telefon va moshina raqami kerak");
        return;
      }

      const url = vehicleEditingId
        ? `${API_URL}/api/vehicles/${vehicleEditingId}`
        : `${API_URL}/api/vehicles`;
      const method = vehicleEditingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Save failed");
      }

      resetVehicleForm();
      await loadVehicleData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleVehicleDelete(id) {
    const response = await fetch(`${API_URL}/api/vehicles/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      alert(error.message || "Delete failed");
      return;
    }
    await loadVehicleData();
  }

  function requestDeleteVehicle(item) {
    setDeleteTarget({
      kind: "vehicle",
      id: item._id,
      title: item.truck_number || "Tanlangan moshina",
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const currentTarget = deleteTarget;
    setDeleteTarget(null);

    if (currentTarget.kind === "transport") {
      await handleDelete(currentTarget.id);
      return;
    }

    if (currentTarget.kind === "vehicle") {
      await handleVehicleDelete(currentTarget.id);
      return;
    }

    await handleOmborDelete(currentTarget.id);
  }

  const handleOmborSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        stock_date: toIsoFromDateInput(omborForm.stock_date),
        product_name: omborForm.product_name.trim(),
        incoming_kg: Number(omborForm.incoming_kg),
        outgoing_kg: Number(omborForm.outgoing_kg),
        unit_price: Number(omborForm.unit_price),
      };

      if (!payload.product_name) {
        alert("Mahsulot nomi kerak");
        return;
      }

      const url = omborEditingId
        ? `${API_URL}/api/ombor/${omborEditingId}`
        : `${API_URL}/api/ombor`;
      const method = omborEditingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Save failed");
      }

      resetOmborForm();
      await loadOmborData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("temir_auth");
    setIsAuthed(false);
    setItems([]);
    setVehicleItems([]);
    setOmborItems([]);
    setSearch("");
    setEditingId(null);
    setForm(emptyForm);
    setVehicleSearch("");
    setVehicleEditingId(null);
    setVehicleForm(vehicleEmptyForm);
    setActiveSection("transport");
  };

  if (!isAuthed) {
    return (
      <Login
        onLogin={(section) => {
          setActiveSection(section || "transport");
          setIsAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="appShell appLayout">
      <aside className="sideBar">
        <div className="sideBrand">
          <p>Temir Zavod</p>
          <strong>Bo'limlar</strong>
        </div>
        <div className="sideNav">
          <button
            type="button"
            className={activeSection === "transport" ? "sideBtn sideBtnActive" : "sideBtn"}
            onClick={() => setActiveSection("transport")}
          >
            Kirim
          </button>
          <button
            type="button"
            className={activeSection === "vehicles" ? "sideBtn sideBtnActive" : "sideBtn"}
            onClick={() => setActiveSection("vehicles")}
          >
            Moshinalar
          </button>
          <button
            type="button"
            className={activeSection === "ombor" ? "sideBtn sideBtnActive" : "sideBtn"}
            onClick={() => setActiveSection("ombor")}
          >
            Ombor
          </button>
        </div>
      </aside>

      <main className="appMain">
      <header className="topbar">
        <div>
          <p className="topbarKicker">Temir Zavod</p>
          <h1>
            {activeSection === "transport"
              ? "Fura kirim inputlari"
              : activeSection === "vehicles"
                ? "Moshinalar bo'limi"
                : "Ombor bo'limi"}
          </h1>
          <p className="topbarText">
            {activeSection === "transport"
              ? "Sana, fura raqami, yuk vazni va bir kilo narx bo'yicha kirim yuritish."
              : activeSection === "vehicles"
                ? "Egasining ismi, telefon raqami va moshina raqamini saqlash."
                : "Ombor kirim/chiqim jurnalini yuritish."}
          </p>
        </div>
        <div className="topActions">
          {activeSection === "transport" && (
            <button className="refreshBtn" onClick={loadData} type="button">
              Yangilash
            </button>
          )}
          {activeSection === "vehicles" && (
            <button className="refreshBtn" onClick={loadVehicleData} type="button">
              Yangilash
            </button>
          )}
          {activeSection === "ombor" && (
            <button className="refreshBtn" onClick={loadOmborData} type="button">
              Yangilash
            </button>
          )}
          <button className="logoutBtn" onClick={handleLogout}>
            Chiqish
          </button>
        </div>
      </header>

      {activeSection === "transport" && (
        <>
      <section className="statsRow">
        <div className="statBox">
          <span>Reyslar</span>
          <strong>{stats.totalTrips}</strong>
        </div>
        <div className="statBox">
          <span>Jami yuk kg</span>
          <strong>{money(stats.totalCargoWeight)}</strong>
        </div>
        <div className="statBox">
          <span>Skitka kg</span>
          <strong>{money(stats.totalDiscountWeight)}</strong>
        </div>
        <div className="statBox">
          <span>Netto kg</span>
          <strong>{money(stats.totalNetWeight)}</strong>
        </div>
        <div className="statBox">
          <span>Jami narx</span>
          <strong>{money(stats.totalPrice)}</strong>
        </div>
        <div className="statBox">
          <span>O'rtacha 1 kg</span>
          <strong>{money(stats.avgUnitPrice)}</strong>
        </div>
      </section>

      <section className="sheet">
        <div className="sheetHead">
          <h2>{editingId ? "Yozuvni tahrirlash" : "Yangi yozuv"}</h2>
          <input
            className="search"
            placeholder="Qidirish: fura raqami..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gridHeader">
            <div>Sana</div>
            <div>Moshina</div>
            <div>Moshinani yuk bilan tola vazni</div>
            <div>Moshinani yuksiz vazni</div>
            <div>Moshinaga yuklangan yuk</div>
            <div>Skitka</div>
            <div>Jami yuk kg</div>
            <div>Yukni 1 kilo narxi</div>
          </div>

          <div className="gridBody">
            <input
              type="date"
              value={form.transport_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, transport_date: e.target.value }))
              }
            />
            <select
              value={form.truck_number}
              onChange={(e) =>
                setForm((p) => ({ ...p, truck_number: e.target.value }))
              }
              required
            >
              <option value="" disabled>
                Moshinani tanlang
              </option>
              {transportVehicleOptions.map((vehicle) => (
                <option key={vehicle._id} value={vehicle.truck_number}>
                  {vehicle.truck_number}
                  {vehicle.owner_name ? ` - ${vehicle.owner_name}` : ""}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.gross_weight_kg}
              onChange={(e) =>
                setForm((p) => ({ ...p, gross_weight_kg: e.target.value }))
              }
              placeholder="0"
              required
            />
            <input
              type="number"
              value={form.tare_weight_kg}
              onChange={(e) =>
                setForm((p) => ({ ...p, tare_weight_kg: e.target.value }))
              }
              placeholder="0"
              required
            />
            <input className="readonly activeTotal" value={cargoWeight.toLocaleString()} readOnly />
            <input
              type="number"
              value={form.discount_kg}
              onChange={(e) =>
                setForm((p) => ({ ...p, discount_kg: e.target.value }))
              }
              placeholder="0"
              required
            />
            <input className="readonly activeTotal" value={netWeight.toLocaleString()} readOnly />
            <input
              type="number"
              value={form.unit_price}
              onChange={(e) =>
                setForm((p) => ({ ...p, unit_price: e.target.value }))
              }
              placeholder="0"
              required
            />
          </div>

          <div className="calcRow">
            <div className="calcBox">
              <span>Jami narx</span>
              <strong>{money(totalPrice)}</strong>
            </div>

            <div className="actions">
              <button className="primary" type="submit" disabled={saving}>
                {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Saqlash"}
              </button>
              {editingId && (
                <button type="button" className="secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="sheet">
        <div className="listHead">
          <h2>Yozuvlar</h2>
          <div className="pager">
            <button
              type="button"
              className="pageBtn"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Oldingi sahifa"
            >
              <RxDoubleArrowLeft />
            </button>
            <span className="pageInfo">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="pageBtn"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Keyingi sahifa"
            >
              <RxDoubleArrowRight />
            </button>
          </div>
        </div>

        {loading ? (
          <p>Yuklanmoqda...</p>
        ) : (
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Fura</th>
                  <th>Gross</th>
                  <th>Tara</th>
                  <th>Yuklangan yuk</th>
                  <th>Skitka</th>
                  <th>Netto</th>
                  <th>1 kg narx</th>
                  <th>Jami</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.transport_date).toLocaleDateString()}</td>
                    <td>{item.truck_number}</td>
                    <td>{money(item.gross_weight_kg)}</td>
                    <td>{money(item.tare_weight_kg)}</td>
                    <td>{money(item.cargo_weight_kg)}</td>
                    <td>{money(item.discount_kg)}</td>
                    <td className="highlight">{money(item.net_weight_kg)}</td>
                    <td>{money(item.unit_price)}</td>
                    <td className="totalCell">{money(item.total_price)}</td>
                    <td className="rowActions">
                      <button type="button" onClick={() => handleEdit(item)}>
                        Edit
                      </button>
                      {deleteTarget?.kind === "transport" &&
                      deleteTarget.id === item._id ? (
                        <>
                          <button
                            type="button"
                            className="secondary rowConfirmBtn"
                            onClick={() => setDeleteTarget(null)}
                          >
                            Yo'q
                          </button>
                          <button
                            type="button"
                            className="danger rowConfirmBtn"
                            onClick={confirmDelete}
                          >
                            Ha
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => requestDeleteTransport(item)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: 20 }}>
                      Hech qanday yozuv topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}

      {activeSection === "vehicles" && (
        <>
          <section className="sheet">
            <div className="sheetHead">
              <h2>{vehicleEditingId ? "Moshinani tahrirlash" : "Yangi moshina"}</h2>
              <input
                className="search"
                placeholder="Qidirish: egasi, telefon yoki raqam..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>

            <form onSubmit={handleVehicleSubmit}>
              <div className="gridHeader vehicleGridHeader">
                <div>Sana</div>
                <div>Egasining ismi</div>
                <div>Telefon raqami</div>
                <div>Mashina raqami</div>
              </div>

              <div className="gridBody vehicleGridBody">
                <input
                  type="date"
                  value={vehicleForm.vehicle_date}
                  onChange={(e) =>
                    setVehicleForm((p) => ({ ...p, vehicle_date: e.target.value }))
                  }
                />
                <input
                  value={vehicleForm.owner_name}
                  onChange={(e) =>
                    setVehicleForm((p) => ({ ...p, owner_name: e.target.value }))
                  }
                  placeholder="Ism Familiya"
                  required
                />
                <input
                  value={vehicleForm.owner_phone}
                  onChange={(e) =>
                    setVehicleForm((p) => ({ ...p, owner_phone: e.target.value }))
                  }
                  placeholder="+998 90 123 45 67"
                  required
                />
                <input
                  value={vehicleForm.truck_number}
                  onChange={(e) =>
                    setVehicleForm((p) => ({ ...p, truck_number: e.target.value }))
                  }
                  placeholder="50U109DB"
                  required
                />
              </div>

              <div className="calcRow">
                <div className="calcBox">
                  <span>Jami moshina</span>
                  <strong>{filteredVehicleItems.length}</strong>
                </div>

                <div className="actions">
                  <button className="primary" type="submit" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : vehicleEditingId ? "Yangilash" : "Saqlash"}
                  </button>
                  {vehicleEditingId && (
                    <button type="button" className="secondary" onClick={resetVehicleForm}>
                      Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            </form>
          </section>

          <section className="sheet">
            <div className="listHead">
              <h2>Moshinalar ro'yxati</h2>
              <div className="pager">
                <button
                  type="button"
                  className="pageBtn"
                  onClick={() => setVehiclePage((p) => Math.max(p - 1, 1))}
                  disabled={currentVehiclePage === 1}
                  aria-label="Oldingi sahifa"
                >
                  <RxDoubleArrowLeft />
                </button>
                <span className="pageInfo">
                  {currentVehiclePage} / {totalVehiclePages}
                </span>
                <button
                  type="button"
                  className="pageBtn"
                  onClick={() => setVehiclePage((p) => Math.min(p + 1, totalVehiclePages))}
                  disabled={currentVehiclePage === totalVehiclePages}
                  aria-label="Keyingi sahifa"
                >
                  <RxDoubleArrowRight />
                </button>
              </div>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Egasining ismi</th>
                    <th>Telefon raqami</th>
                    <th>Mashina raqami</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVehicles.map((item) => (
                    <tr key={item._id}>
                      <td>{new Date(item.vehicle_date).toLocaleDateString()}</td>
                      <td>{item.owner_name}</td>
                      <td>{item.owner_phone}</td>
                      <td className="totalCell">{item.truck_number}</td>
                      <td className="rowActions">
                        <button type="button" onClick={() => handleVehicleEdit(item)}>
                          Edit
                        </button>
                        {deleteTarget?.kind === "vehicle" &&
                        deleteTarget.id === item._id ? (
                          <>
                            <button
                              type="button"
                              className="secondary rowConfirmBtn"
                              onClick={() => setDeleteTarget(null)}
                            >
                              Yo'q
                            </button>
                            <button
                              type="button"
                              className="danger rowConfirmBtn"
                              onClick={confirmDelete}
                            >
                              Ha
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => requestDeleteVehicle(item)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedVehicles.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 20 }}>
                        Hech qanday moshina topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeSection === "ombor" && (
        <>
          <section className="statsRow omborStats">
            <div className="statBox">
              <span>Yozuvlar</span>
              <strong>{omborItems.length}</strong>
            </div>
            <div className="statBox">
              <span>Jami kirim kg</span>
              <strong>{money(omborItems.reduce((sum, item) => sum + Number(item.incoming_kg || 0), 0))}</strong>
            </div>
            <div className="statBox">
              <span>Jami chiqim kg</span>
              <strong>{money(omborItems.reduce((sum, item) => sum + Number(item.outgoing_kg || 0), 0))}</strong>
            </div>
            <div className="statBox">
              <span>Qoldiq kg</span>
              <strong>{money(omborItems.reduce((sum, item) => sum + Math.max(Number(item.incoming_kg || 0) - Number(item.outgoing_kg || 0), 0), 0))}</strong>
            </div>
            <div className="statBox">
              <span>Jami qiymat</span>
              <strong>{money(omborItems.reduce((sum, item) => sum + Math.max(Number(item.incoming_kg || 0) - Number(item.outgoing_kg || 0), 0) * Number(item.unit_price || 0), 0))}</strong>
            </div>
            <div className="statBox">
              <span>So'nggi narx</span>
              <strong>{money(omborItems[0]?.unit_price || 0)}</strong>
            </div>
          </section>

          <section className="sheet">
            <div className="sheetHead">
              <h2>{omborEditingId ? "Ombor yozuvini tahrirlash" : "Yangi ombor yozuv"}</h2>
              <input
                className="search"
                placeholder="Qidirish: mahsulot nomi..."
                value={omborSearch}
                onChange={(e) => setOmborSearch(e.target.value)}
              />
            </div>

            <form onSubmit={handleOmborSubmit}>
              <div className="gridHeader omborGridHeader">
                <div>Sana</div>
                <div>Mahsulot nomi</div>
                <div>Kirim kg</div>
                <div>Chiqim kg</div>
                <div>Qoldiq kg</div>
                <div>1 kg narx</div>
                <div>Jami narx</div>
              </div>

              <div className="gridBody omborGridBody">
                <input
                  type="date"
                  value={omborForm.stock_date}
                  onChange={(e) =>
                    setOmborForm((p) => ({ ...p, stock_date: e.target.value }))
                  }
                />
                <input
                  value={omborForm.product_name}
                  onChange={(e) =>
                    setOmborForm((p) => ({ ...p, product_name: e.target.value }))
                  }
                  placeholder="Masalan: Temir"
                  required
                />
                <input
                  type="number"
                  value={omborForm.incoming_kg}
                  onChange={(e) =>
                    setOmborForm((p) => ({ ...p, incoming_kg: e.target.value }))
                  }
                  placeholder="0"
                  required
                />
                <input
                  type="number"
                  value={omborForm.outgoing_kg}
                  onChange={(e) =>
                    setOmborForm((p) => ({ ...p, outgoing_kg: e.target.value }))
                  }
                  placeholder="0"
                  required
                />
                <input className="readonly activeTotal" value={stockBalance.toLocaleString()} readOnly />
                <input
                  type="number"
                  value={omborForm.unit_price}
                  onChange={(e) =>
                    setOmborForm((p) => ({ ...p, unit_price: e.target.value }))
                  }
                  placeholder="0"
                  required
                />
                <input className="readonly activeTotal" value={stockTotalPrice.toLocaleString()} readOnly />
              </div>

              <div className="calcRow">
                <div className="calcBox">
                  <span>Jami qiymat</span>
                  <strong>{money(stockTotalPrice)}</strong>
                </div>

                <div className="actions">
                  <button className="primary" type="submit">
                    {omborEditingId ? "Yangilash" : "Saqlash"}
                  </button>
                  {omborEditingId && (
                    <button type="button" className="secondary" onClick={resetOmborForm}>
                      Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            </form>
          </section>

          <section className="sheet">
            <div className="listHead">
              <h2>Ombor yozuvlar</h2>
              <div className="pager">
                <button
                  type="button"
                  className="pageBtn"
                  onClick={() => setOmborPage((p) => Math.max(p - 1, 1))}
                  disabled={omborPage === 1}
                  aria-label="Oldingi sahifa"
                >
                  <RxDoubleArrowLeft />
                </button>
                <span className="pageInfo">
                  {omborPage} / {Math.max(Math.ceil(filteredOmborItems.length / pageSize), 1)}
                </span>
                <button
                  type="button"
                  className="pageBtn"
                  onClick={() =>
                    setOmborPage((p) =>
                      Math.min(p + 1, Math.max(Math.ceil(filteredOmborItems.length / pageSize), 1))
                    )
                  }
                  disabled={omborPage === Math.max(Math.ceil(filteredOmborItems.length / pageSize), 1)}
                  aria-label="Keyingi sahifa"
                >
                  <RxDoubleArrowRight />
                </button>
              </div>
            </div>

            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Mahsulot</th>
                    <th>Kirim</th>
                    <th>Chiqim</th>
                    <th>Qoldiq</th>
                    <th>1 kg narx</th>
                    <th>Jami</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOmborItems
                    .slice((omborPage - 1) * pageSize, omborPage * pageSize)
                    .map((item) => (
                    <tr key={item._id}>
                        <td>{new Date(item.stock_date).toLocaleDateString()}</td>
                        <td>{item.product_name}</td>
                        <td>{money(item.incoming_kg)}</td>
                        <td>{money(item.outgoing_kg)}</td>
                        <td className="highlight">{money(Math.max(Number(item.incoming_kg || 0) - Number(item.outgoing_kg || 0), 0))}</td>
                        <td>{money(item.unit_price)}</td>
                        <td className="totalCell">
                          {money(Math.max(Number(item.incoming_kg || 0) - Number(item.outgoing_kg || 0), 0) * Number(item.unit_price || 0))}
                        </td>
                        <td className="rowActions">
                          <button type="button" onClick={() => handleOmborEdit(item)}>
                            Edit
                          </button>
                          {deleteTarget?.kind === "ombor" &&
                          deleteTarget.id === item._id ? (
                            <>
                              <button
                                type="button"
                                className="secondary rowConfirmBtn"
                                onClick={() => setDeleteTarget(null)}
                              >
                                Yo'q
                              </button>
                              <button
                                type="button"
                                className="danger rowConfirmBtn"
                                onClick={confirmDelete}
                              >
                                Ha
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestDeleteOmbor(item)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      </main>
    </div>
  );
}
