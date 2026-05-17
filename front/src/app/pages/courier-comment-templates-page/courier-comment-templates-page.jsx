import { useEffect, useState } from "react";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "../../core/ui/icons.jsx";
import { DataTable } from "../../core/ui/data-table.jsx";
import { apiRequest } from "../../core/http/api.js";
import { useI18n } from "../../core/i18n/i18n.context.jsx";
import "./courier-comment-templates-page.scss";

const initialForm = {
  name: "",
  content: "",
};

export function CourierCommentTemplatesPage({ auth }) {
  const { t } = useI18n();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const payload = await apiRequest("/api/courier-comment-templates", {
          token: auth?.token,
        });

        setTemplates(payload.templates ?? []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
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
    setEditingTemplateId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(template) {
    setStatus({ type: "", message: "" });
    setEditingTemplateId(template.id);
    setForm({
      name: template.name ?? "",
      content: template.content ?? "",
    });
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    setEditingTemplateId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const isEditing = Boolean(editingTemplateId);

    try {
      const payload = await apiRequest(
        isEditing
          ? `/api/courier-comment-templates/${editingTemplateId}`
          : "/api/courier-comment-templates",
        {
          method: isEditing ? "PUT" : "POST",
          token: auth?.token,
          body: JSON.stringify(form),
        },
      );

      if (isEditing) {
        setTemplates((current) =>
          current.map((template) =>
            template.id === payload.template.id ? payload.template : template,
          ),
        );
      } else {
        setTemplates((current) => [payload.template, ...current]);
      }

      setForm(initialForm);
      setEditingTemplateId(null);
      setIsDialogOpen(false);
      setStatus({
        type: "success",
        message: isEditing ? t("commentTemplates.updated") : t("commentTemplates.created"),
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

  async function handleDelete(templateId) {
    setDeletingTemplateId(templateId);
    setStatus({ type: "", message: "" });

    try {
      await apiRequest(`/api/courier-comment-templates/${templateId}`, {
        method: "DELETE",
        token: auth?.token,
      });

      setTemplates((current) =>
        current.filter((template) => template.id !== templateId),
      );
      setStatus({
        type: "success",
        message: t("commentTemplates.deleted"),
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.message,
      });
    } finally {
      setDeletingTemplateId(null);
    }
  }

  const isEditing = Boolean(editingTemplateId);

  return (
    <section className="courier-comment-templates-page">
      <header className="courier-comment-templates-page__header">
        <div>
          <h2 className="page-title">{t("commentTemplates.title")}</h2>
        </div>
        <button
          type="button"
          className="button-primary icon-button"
          onClick={openCreateDialog}
          aria-label={t("commentTemplates.add")}
          title={t("commentTemplates.add")}
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
          tableClassName="courier-comment-templates-table"
          headers={[t("common.name"), t("commentTemplates.template"), ""]}
          emptyMessage={t("commentTemplates.empty")}
          rows={templates.map((template) => (
            <tr key={template.id}>
              <td>{template.name}</td>
              <td className="courier-comment-templates-table__content">
                {template.content}
              </td>
              <td className="courier-comment-templates-table__actions">
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => openEditDialog(template)}
                  aria-label={`${t("common.edit")} ${template.name}`}
                  title={`${t("common.edit")} ${template.name}`}
                >
                  <EditIcon className="action-icon" />
                </button>
                <button
                  type="button"
                  className="button-secondary icon-button"
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingTemplateId === template.id}
                  aria-label={`${t("commentTemplates.delete")} ${template.name}`}
                  title={`${t("commentTemplates.delete")} ${template.name}`}
                >
                  {deletingTemplateId === template.id ? (
                    <span className="icon-button__status" />
                  ) : (
                    <TrashIcon className="action-icon" />
                  )}
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
            <div className="courier-comment-templates-page__dialog-head">
              <h3>{isEditing ? "Edit template" : "Add template"}</h3>
              <p>
                შაბლონის სახელები კურიერის ამომრჩევში ჩანს. შაბლონი ავსებს
                კურიერის კომენტარის შეყვანის ველს.
              </p>
            </div>

            <form
              className="courier-comment-templates-page__form"
              onSubmit={handleSubmit}
            >
              <label className="form-field">
                სახელი
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field">
                ტექსტი
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={6}
                  required
                />
              </label>

              {status.type === "error" && status.message ? (
                <p className="status-message is-error">{status.message}</p>
              ) : null}

              <div className="courier-comment-templates-page__actions">
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
                  aria-label="Save template"
                  title="Save template"
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
