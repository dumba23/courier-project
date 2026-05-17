import { useEffect, useState } from "react";
import { CloseIcon, EditIcon, PlusIcon } from "../../core/ui/icons.jsx";
import { DataTable } from "../../core/ui/data-table.jsx";
import { apiRequest } from "../../core/http/api.js";
import { useI18n } from "../../core/i18n/i18n.context.jsx";
import "./cities-page.scss";

const initialForm = {
  name: "",
  is_active: true,
};

export function CitiesPage({ auth }) {
  const { t } = useI18n();
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCityId, setEditingCityId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    async function loadCities() {
      try {
        const payload = await apiRequest("/api/cities", { token: auth?.token });
        setCities(payload.cities ?? []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCities();
  }, [auth?.token]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openCreateDialog() {
    setEditingCityId(null);
    setForm(initialForm);
    setStatus({ type: "", message: "" });
    setIsDialogOpen(true);
  }

  function openEditDialog(city) {
    setEditingCityId(city.id);
    setForm({
      name: city.name ?? "",
      is_active: city.is_active ?? true,
    });
    setStatus({ type: "", message: "" });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    setEditingCityId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest(
        editingCityId ? `/api/cities/${editingCityId}` : "/api/cities",
        {
          method: editingCityId ? "PUT" : "POST",
          token: auth?.token,
          body: JSON.stringify(form),
        },
      );

      setCities((current) => {
        if (!editingCityId) {
          return [payload.city, ...current];
        }

        return current.map((city) =>
          city.id === editingCityId ? payload.city : city,
        );
      });

      setIsDialogOpen(false);
      setEditingCityId(null);
      setForm(initialForm);
      setStatus({
        type: "success",
        message: editingCityId ? t("cities.updated") : t("cities.created"),
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

  return (
    <section className="cities-page">
      <header className="cities-page__header">
        <h2 className="page-title">{t("cities.title")}</h2>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label={t("cities.add")}
          title={t("cities.add")}
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
          tableClassName="cities-table"
          headers={[t("common.name"), t("common.status"), ""]}
          emptyMessage={t("cities.empty")}
          rows={cities.map((city) => (
            <tr key={city.id}>
              <td>{city.name}</td>
              <td>{city.is_active ? t("common.active") : t("common.inactive")}</td>
              <td className="cities-table__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => openEditDialog(city)}
                  aria-label={t("cities.edit")}
                  title={t("cities.edit")}
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
            <div className="cities-page__dialog-head">
              <h3>{editingCityId ? t("cities.edit") : t("cities.add")}</h3>
            </div>

            <form className="cities-page__form" onSubmit={handleSubmit}>
              <div className="field-grid cities-page__form-grid">
                <label className="form-field">
                  {t("common.name")}
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="form-field cities-page__toggle">
                  <span>{t("common.active")}</span>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                </label>
              </div>

              {status.type === "error" && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="cities-page__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  aria-label={t("common.cancel")}
                  title={t("common.cancel")}
                >
                  <CloseIcon className="action-icon" />
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("common.save")
                    : editingCityId
                      ? t("cities.update")
                      : t("cities.create")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
