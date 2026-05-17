import { useEffect, useState } from "react";
import { apiRequest } from "../../core/http/api.js";
import { useI18n } from "../../core/i18n/i18n.context.jsx";
import { DataTable } from "../../core/ui/data-table.jsx";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
} from "../../core/ui/icons.jsx";
import "./courier-manage-page.scss";

const initialForm = {
  first_name: "",
  last_name: "",
  phone_number: "",
  car_plate_number: "",
  tariff: "",
  email: "",
  password: "",
  password_confirmation: "",
};

export function CourierManagePage({ auth }) {
  const { t } = useI18n();
  const [couriers, setCouriers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCourierId, setEditingCourierId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function loadCouriers() {
      try {
        const payload = await apiRequest("/api/couriers", {
          token: auth?.token,
        });

        setCouriers(payload.couriers ?? []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCouriers();
  }, [auth?.token]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function openCreateDialog() {
    setStatus({ type: "", message: "" });
    setEditingCourierId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(courier) {
    setStatus({ type: "", message: "" });
    setEditingCourierId(courier.id);
    setForm({
      first_name: courier.first_name ?? "",
      last_name: courier.last_name ?? "",
      phone_number: courier.phone_number ?? "",
      car_plate_number: courier.car_plate_number ?? "",
      tariff: courier.tariff ?? "",
      email: courier.user?.email ?? "",
      password: "",
      password_confirmation: "",
    });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    setEditingCourierId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const isEditing = Boolean(editingCourierId);

    try {
      const payload = await apiRequest(
        isEditing ? `/api/couriers/${editingCourierId}` : "/api/couriers",
        {
          method: isEditing ? "PUT" : "POST",
          token: auth?.token,
          body: JSON.stringify({
            ...form,
            password: form.password || null,
            password_confirmation: form.password_confirmation || null,
          }),
        },
      );

      if (isEditing) {
        setCouriers((current) =>
          current.map((courier) =>
            courier.id === payload.courier.id ? payload.courier : courier,
          ),
        );
      } else {
        setCouriers((current) => [payload.courier, ...current]);
      }

      setForm(initialForm);
      setEditingCourierId(null);
      setIsDialogOpen(false);
      setStatus({
        type: "success",
        message: isEditing ? t("couriers.updated") : t("couriers.created"),
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEditing = Boolean(editingCourierId);

  return (
    <section className="courier-manage-page">
      <header className="courier-manage-page__header">
        <h2 className="page-title">{t("couriers.title")}</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label={t("couriers.add")}
          title={t("couriers.add")}
        >
          <PlusIcon className="action-icon" />
        </button>
      </header>

      {status.message ? (
        <p
          className={`status-message${status.type === "error" ? " is-error" : ""}`}
        >
          {status.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="status-message">{t("common.loading")}</p>
      ) : (
        <DataTable
          tableClassName="courier-table"
          headers={[
            t("common.name"),
            t("common.email"),
            t("common.phone"),
            t("couriers.carPlate"),
            t("couriers.tariff"),
            "",
          ]}
          emptyMessage={t("couriers.empty")}
          rows={couriers.map((courier) => (
            <tr key={courier.id}>
              <td>
                {courier.first_name} {courier.last_name}
              </td>
              <td>{courier.user?.email}</td>
              <td>{courier.phone_number}</td>
              <td>{courier.car_plate_number || "-"}</td>
              <td>{courier.tariff}</td>
              <td className="courier-table__actions">
                <button
                  type="button"
                  className="button-secondary courier-table__edit icon-button"
                  onClick={() => openEditDialog(courier)}
                  aria-label={`${t("common.edit")} ${courier.first_name} ${courier.last_name}`}
                  title={`${t("common.edit")} ${courier.first_name} ${courier.last_name}`}
                >
                  <EditIcon className="action-icon" />
                </button>
              </td>
            </tr>
          ))}
        />
      )}

      {isDialogOpen ? (
        <div className="dialog-backdrop" onClick={closeDialog}>
          <section
            className="dialog-panel panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="courier-manage-page__dialog-head">
              <h3>{isEditing ? t("couriers.edit") : t("couriers.add")}</h3>
              <p>
                {isEditing
                  ? t("couriers.leavePassword")
                  : t("couriers.setPassword")}
              </p>
            </div>

            <form className="courier-manage-page__form" onSubmit={handleSubmit}>
              <div className="field-grid courier-manage-page__form-grid">
                <label className="form-field">
                  First name
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Last name
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Phone number
                  <input
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Car plate number
                  <input
                    name="car_plate_number"
                    value={form.car_plate_number}
                    onChange={handleChange}
                  />
                </label>

                <label className="form-field">
                  Tariff
                  <input
                    name="tariff"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tariff}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Email
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field">
                  Password
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!isEditing}
                  />
                </label>

                <label className="form-field">
                  Confirm password
                  <input
                    name="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required={!isEditing && Boolean(form.password)}
                  />
                </label>
              </div>

              {status.type === "error" && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="courier-manage-page__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <CloseIcon className="action-icon" />
                </button>
                <button
                  type="submit"
                  className="button-primary icon-button"
                  disabled={isSubmitting}
                  aria-label={isEditing ? "Update courier" : "Save courier"}
                  title={isEditing ? "Update courier" : "Save courier"}
                >
                  {!isSubmitting ? <CheckIcon className="action-icon" /> : null}
                  {isSubmitting ? (
                    <span className="icon-button__status" />
                  ) : null}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
