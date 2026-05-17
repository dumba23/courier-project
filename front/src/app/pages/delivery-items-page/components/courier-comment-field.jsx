import { useEffect, useState } from "react";

export function CourierCommentField({
  disabled,
  itemId,
  templates = [],
  value,
  onSave,
}) {
  const [draftValue, setDraftValue] = useState(value ?? "");

  useEffect(() => {
    setDraftValue(value ?? "");
  }, [value]);

  const isDirty = draftValue !== (value ?? "");

  return (
    <div className="courier-comment-field">
      {templates.length ? (
        <select
          className="courier-comment-field__template-select"
          defaultValue=""
          onChange={(event) => {
            const selectedTemplate = templates.find(
              (template) => String(template.id) === event.target.value,
            );

            if (!selectedTemplate) {
              return;
            }

            setDraftValue(selectedTemplate.content ?? "");
            event.target.value = "";
          }}
          disabled={disabled}
        >
          <option value="">აირჩიე შაბლონი</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        className="courier-comment-field__input"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        placeholder="დაამატე ტექსტი"
        rows={3}
        disabled={disabled}
      />
      <button
        type="button"
        className="button-secondary courier-comment-field__save"
        onClick={() => onSave(itemId, draftValue)}
        disabled={disabled || !isDirty}
      >
        შენახვა
      </button>
    </div>
  );
}
