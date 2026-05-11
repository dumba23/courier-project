import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../core/http/api.js";
import { DataTable } from "../../core/ui/data-table.jsx";
import "./courier-payroll-page.scss";

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ka-GE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MoneyField({ className, disabled, itemId, value, onSave }) {
  const [draftValue, setDraftValue] = useState(String(value ?? "0"));

  useEffect(() => {
    setDraftValue(String(value ?? "0"));
  }, [value]);

  const normalizedCurrentValue = String(value ?? "0");
  const isDirty = draftValue !== normalizedCurrentValue;

  function saveIfNeeded() {
    if (disabled || !isDirty) {
      return;
    }

    onSave(itemId, draftValue);
  }

  return (
    <input
      className={className}
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={saveIfNeeded}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveIfNeeded();
          event.currentTarget.blur();
        }
      }}
      disabled={disabled}
    />
  );
}

export function CourierPayrollPage({ auth }) {
  const [couriers, setCouriers] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayValue);
  const [items, setItems] = useState([]);
  const [courier, setCourier] = useState(null);
  const [summary, setSummary] = useState({
    count: 0,
    price_total: 0,
    base_total: 0,
    extra_total: 0,
    deduction_total: 0,
  });
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [savingExtraItemId, setSavingExtraItemId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    async function loadCouriers() {
      try {
        const payload = await apiRequest("/api/couriers", {
          token: auth?.token,
        });

        const nextCouriers = payload.couriers ?? [];

        setCouriers(nextCouriers);
        setSelectedCourierId(
          (current) => current || String(nextCouriers[0]?.id ?? ""),
        );
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.message,
        });
      } finally {
        setIsLoadingCouriers(false);
      }
    }

    loadCouriers();
  }, [auth?.token]);

  useEffect(() => {
    if (!selectedCourierId || !selectedDay) {
      setItems([]);
      setCourier(null);
      setSummary({
        count: 0,
        price_total: 0,
        base_total: 0,
        extra_total: 0,
        deduction_total: 0,
      });

      return;
    }

    let isCancelled = false;

    async function loadPayroll() {
      setIsLoadingItems(true);
      setStatus((current) => ({
        ...current,
        message: current.type === "error" ? "" : current.message,
      }));

      try {
        const params = new URLSearchParams({
          courier_id: selectedCourierId,
          day: selectedDay,
        });
        const payload = await apiRequest(
          `/api/courier-payroll?${params.toString()}`,
          {
            token: auth?.token,
          },
        );

        if (!isCancelled) {
          setItems(payload.items ?? []);
          setCourier(payload.courier ?? null);
          setSummary(
            payload.summary ?? {
              count: 0,
              price_total: 0,
              base_total: 0,
              extra_total: 0,
              deduction_total: 0,
            },
          );
        }
      } catch (requestError) {
        if (!isCancelled) {
          setStatus({
            type: "error",
            message: requestError.message,
          });
          setItems([]);
          setCourier(null);
          setSummary({
            count: 0,
            price_total: 0,
            base_total: 0,
            extra_total: 0,
            deduction_total: 0,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingItems(false);
        }
      }
    }

    loadPayroll();

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, selectedCourierId, selectedDay]);

  const totalPayable = useMemo(() => {
    return (
      Number(summary.base_total ?? 0) +
      Number(summary.extra_total ?? 0) -
      Number(summary.deduction_total ?? 0)
    );
  }, [summary.base_total, summary.extra_total, summary.deduction_total]);

  const transferToAdmin = useMemo(() => {
    return Number(summary.price_total ?? 0) - totalPayable;
  }, [summary.price_total, totalPayable]);

  async function handleExtraPriceSave(itemId, nextValue) {
    setSavingExtraItemId(itemId);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest(
        `/api/courier-payroll/${itemId}/extra-price`,
        {
          method: "PATCH",
          token: auth?.token,
          body: JSON.stringify({
            extra_price_per_item: Number(nextValue || 0),
          }),
        },
      );

      let nextItems = [];

      setItems((current) => {
        nextItems = current.map((item) =>
          item.id === itemId ? payload.item : item,
        );

        return nextItems;
      });
      setSummary((current) => {
        const nextExtraTotal = nextItems.reduce(
          (total, item) => total + Number(item.extra_price_per_item ?? 0),
          0,
        );

        return {
          ...current,
          extra_total: Number(nextExtraTotal.toFixed(2)),
        };
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.message,
      });
    } finally {
      setSavingExtraItemId(null);
    }
  }

  async function handleDeductionPriceSave(itemId, nextValue) {
    setSavingExtraItemId(itemId);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest(
        `/api/courier-payroll/${itemId}/deduction-price`,
        {
          method: "PATCH",
          token: auth?.token,
          body: JSON.stringify({
            deduction_price_per_item: Number(nextValue || 0),
          }),
        },
      );

      let nextItems = [];

      setItems((current) => {
        nextItems = current.map((item) =>
          item.id === itemId ? payload.item : item,
        );

        return nextItems;
      });
      setSummary((current) => {
        const nextDeductionTotal = nextItems.reduce(
          (total, item) => total + Number(item.deduction_price_per_item ?? 0),
          0,
        );

        return {
          ...current,
          deduction_total: Number(nextDeductionTotal.toFixed(2)),
        };
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.message,
      });
    } finally {
      setSavingExtraItemId(null);
    }
  }

  async function handleMarkPaid() {
    if (!selectedCourierId || !selectedDay) {
      return;
    }

    setIsMarkingPaid(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest("/api/courier-payroll/mark-paid", {
        method: "PATCH",
        token: auth?.token,
        body: JSON.stringify({
          courier_id: Number(selectedCourierId),
          day: selectedDay,
        }),
      });

      const paidAt = payload.paid_at ?? null;

      setItems((current) =>
        current.map((item) => ({
          ...item,
          paid_at: item.paid_at ?? paidAt,
        })),
      );
      setStatus({
        type: "success",
        message: `Marked ${payload.updated_count ?? 0} items as paid.`,
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.message,
      });
    } finally {
      setIsMarkingPaid(false);
    }
  }

  return (
    <section className="courier-payroll-page">
      <header className="courier-payroll-page__header">
        <div>
          <h2 className="page-title">კურიერის ანაზღაურება</h2>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleMarkPaid}
          disabled={!selectedCourierId || !items.length || isMarkingPaid}
        >
          {isMarkingPaid ? "ინიშნება..." : "გადახდილად მონიშნვა"}
        </button>
      </header>

      <div className="courier-payroll-page__filters">
        <label className="form-field">
          კურიერი
          <select
            value={selectedCourierId}
            onChange={(event) => setSelectedCourierId(event.target.value)}
            disabled={isLoadingCouriers}
          >
            <option value="">აირჩიე კურიერი</option>
            {couriers.map((courierOption) => (
              <option key={courierOption.id} value={courierOption.id}>
                {courierOption.first_name} {courierOption.last_name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          დღე
          <input
            type="date"
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
          />
        </label>
      </div>

      {status.message ? (
        <p
          className={`status-message${status.type === "error" ? " is-error" : ""}`}
        >
          {status.message}
        </p>
      ) : null}

      <div className="courier-payroll-page__summary">
        <div className="courier-payroll-page__summary-card">
          <span>კურიერის ტარიფი</span>
          <strong>{courier?.tariff ?? "-"} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>მიტანილი ამანათები</span>
          <strong>{summary.count ?? 0}</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>ამანათების ფასის ჯამი</span>
          <strong>{summary.price_total ?? 0} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>დამატებითი თანხის ჯამი</span>
          <strong>{summary.extra_total ?? 0} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card courier-payroll-page__summary-card--danger">
          <span>დაქვითვის ჯამი</span>
          <strong>{summary.deduction_total ?? 0} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card courier-payroll-page__summary-card--accent">
          <span>ჯამში გადასახდელი</span>
          <strong>{totalPayable.toFixed(2)} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card courier-payroll-page__summary-card--transfer">
          <span>კურიერმა უნდა დარიცხოს</span>
          <strong>{transferToAdmin.toFixed(2)} ₾</strong>
        </div>
      </div>

      {isLoadingItems ? (
        <p className="status-message">იტვირთება...</p>
      ) : (
        <div className="courier-payroll-page__table-shell">
          <DataTable
            tableClassName="courier-payroll-table"
            headers={[
              "პროდუქტი",
              "პარტნიორი",
              "უბანი",
              "ქალაქი",
              "მისამართი",
              "კურიერის კომენტარი",
              "ფასი",
              "მაღაზიასთან გადარიცხული",
              "მე ავიღე თანხა",
              "დამატებითი ფასი",
              "დაქვითვა",
              "გადახდა",
            ]}
            emptyMessage="დღეს მოცემულ კურიერს ამანათი არ მიუტანია."
            rows={items.map((item) => (
              <tr key={item.id}>
                <td>{item.product || "-"}</td>
                <td>{item.partner?.name || "-"}</td>
                <td>{item.district || "-"}</td>
                <td>{item.city || "-"}</td>
                <td>{item.address || "-"}</td>
                <td>{item.courier_comment || "-"}</td>
                <td>{item.price}</td>
                <td>{item.transferred_to_shop_amount ?? 0}</td>
                <td>{item.collected_amount ?? item.price}</td>
                <td>
                  <MoneyField
                    className="courier-payroll-page__money-input"
                    disabled={savingExtraItemId === item.id}
                    itemId={item.id}
                    value={item.extra_price_per_item}
                    onSave={handleExtraPriceSave}
                  />
                </td>
                <td>
                  <MoneyField
                    className="courier-payroll-page__money-input courier-payroll-page__money-input--danger"
                    disabled={savingExtraItemId === item.id}
                    itemId={item.id}
                    value={item.deduction_price_per_item}
                    onSave={handleDeductionPriceSave}
                  />
                </td>
                <td>{formatDateTime(item.paid_at)}</td>
              </tr>
            ))}
          />
        </div>
      )}
    </section>
  );
}
