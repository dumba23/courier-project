import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../core/http/api.js";
import { DataTable } from "../../core/ui/data-table.jsx";
import { getSortIndicator } from "../delivery-items-page/delivery-items.utils.js";
import "../courier-payroll-page/courier-payroll-page.scss";

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

function formatPartnerTariff(partner) {
  if (!partner) {
    return "-";
  }

  if (!partner.tariff_per_kg) {
    return `${partner.tariff ?? 0} ₾`;
  }

  const ranges = Array.isArray(partner.tariff_per_kg_ranges)
    ? partner.tariff_per_kg_ranges
    : [];

  if (!ranges.length) {
    return "კგ ტარიფი";
  }

  return ranges.map((range) => `${range.up_to_kg} კგ - ${range.price} ₾`).join(", ");
}

function getComparableValue(item, key) {
  const value = item?.[key];

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return value;
  }

  return String(value).toLowerCase();
}

function renderSortHeader(label, key, sort, onSort) {
  return (
    <button
      type="button"
      className="table-sort"
      onClick={() => onSort(key)}
    >
      {label} {getSortIndicator(sort, key)}
    </button>
  );
}

export function PartnerPayrollPage({ auth }) {
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayValue);
  const [items, setItems] = useState([]);
  const [partner, setPartner] = useState(null);
  const [summary, setSummary] = useState({
    count: 0,
    price_total: 0,
    transferred_total: 0,
    collected_total: 0,
    base_total: 0,
    extra_total: 0,
  });
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [savingExtraItemId, setSavingExtraItemId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [filters, setFilters] = useState({
    district: "",
    city: "",
    address: "",
  });
  const [sort, setSort] = useState({
    key: "address",
    direction: "asc",
  });

  useEffect(() => {
    async function loadPartners() {
      try {
        const payload = await apiRequest("/api/partners", {
          token: auth?.token,
        });

        const nextPartners = payload.partners ?? [];

        setPartners(nextPartners);
        setSelectedPartnerId(
          (current) => current || String(nextPartners[0]?.id ?? ""),
        );
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.message,
        });
      } finally {
        setIsLoadingPartners(false);
      }
    }

    loadPartners();
  }, [auth?.token]);

  useEffect(() => {
    if (!selectedPartnerId || !selectedDay) {
      setItems([]);
      setPartner(null);
      setSummary({
        count: 0,
        price_total: 0,
        transferred_total: 0,
        collected_total: 0,
        base_total: 0,
        extra_total: 0,
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
          partner_id: selectedPartnerId,
          day: selectedDay,
        });
        const payload = await apiRequest(
          `/api/partner-payroll?${params.toString()}`,
          {
            token: auth?.token,
          },
        );

        if (!isCancelled) {
          setItems(payload.items ?? []);
          setPartner(payload.partner ?? null);
          setSummary(
            payload.summary ?? {
              count: 0,
              price_total: 0,
              transferred_total: 0,
              collected_total: 0,
              base_total: 0,
              extra_total: 0,
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
          setPartner(null);
          setSummary({
            count: 0,
            price_total: 0,
            transferred_total: 0,
            collected_total: 0,
            base_total: 0,
            extra_total: 0,
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
  }, [auth?.token, selectedPartnerId, selectedDay]);

  const partnerNetItemMoney = useMemo(() => {
    return Number(summary.price_total ?? 0) - Number(summary.transferred_total ?? 0);
  }, [summary.price_total, summary.transferred_total]);

  const ourTariffSide = useMemo(() => {
    return Number(summary.base_total ?? 0) + Number(summary.extra_total ?? 0);
  }, [summary.base_total, summary.extra_total]);

  const totalPayable = useMemo(() => {
    return partnerNetItemMoney - ourTariffSide;
  }, [partnerNetItemMoney, ourTariffSide]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const districtMatches = !filters.district
        || String(item.district ?? "").toLowerCase().includes(filters.district.toLowerCase());
      const cityMatches = !filters.city
        || String(item.city ?? "").toLowerCase().includes(filters.city.toLowerCase());
      const addressMatches = !filters.address
        || String(item.address ?? "").toLowerCase().includes(filters.address.toLowerCase());

      return districtMatches && cityMatches && addressMatches;
    });
  }, [filters.address, filters.city, filters.district, items]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      const leftValue = getComparableValue(left, sort.key);
      const rightValue = getComparableValue(right, sort.key);

      if (leftValue === rightValue) {
        return 0;
      }

      const result = leftValue > rightValue ? 1 : -1;

      return sort.direction === "asc" ? result : -result;
    });
  }, [filteredItems, sort.direction, sort.key]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  async function handlePartnerExtraSave(itemId, nextValue) {
    setSavingExtraItemId(itemId);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest(`/api/partner-payroll/${itemId}/extra-price`, {
        method: "PATCH",
        token: auth?.token,
        body: JSON.stringify({
          partner_extra_price_per_item: Number(nextValue || 0),
        }),
      });

      let nextItems = [];

      setItems((current) => {
        nextItems = current.map((item) =>
          item.id === itemId ? payload.item : item,
        );

        return nextItems;
      });

      setSummary((current) => {
        const nextExtraTotal = nextItems.reduce(
          (total, item) => total + Number(item.partner_extra_price_per_item ?? 0),
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

  async function handleMarkPaid() {
    if (!selectedPartnerId || !selectedDay) {
      return;
    }

    setIsMarkingPaid(true);
    setStatus({ type: "", message: "" });

    try {
      const payload = await apiRequest("/api/partner-payroll/mark-paid", {
        method: "PATCH",
        token: auth?.token,
        body: JSON.stringify({
          partner_id: Number(selectedPartnerId),
          day: selectedDay,
        }),
      });

      const paidAt = payload.partner_paid_at ?? null;

      setItems((current) =>
        current.map((item) => ({
          ...item,
          partner_paid_at: item.partner_paid_at ?? paidAt,
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
          <h2 className="page-title">პარტნიორის ანაზღაურება</h2>
        </div>
        <button
          type="button"
          className="button-primary"
          onClick={handleMarkPaid}
          disabled={!selectedPartnerId || !items.length || isMarkingPaid}
        >
          {isMarkingPaid ? "ინიშნება..." : "გადახდილად მონიშნვა"}
        </button>
      </header>

      <div className="courier-payroll-page__filters">
        <label className="form-field">
          პარტნიორი
          <select
            value={selectedPartnerId}
            onChange={(event) => setSelectedPartnerId(event.target.value)}
            disabled={isLoadingPartners}
          >
            <option value="">აირჩიე პარტნიორი</option>
            {partners.map((partnerOption) => (
              <option key={partnerOption.id} value={partnerOption.id}>
                {partnerOption.name}
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
        <p className={`status-message${status.type === "error" ? " is-error" : ""}`}>
          {status.message}
        </p>
      ) : null}

      <div className="courier-payroll-page__summary">
        <div className="courier-payroll-page__summary-card">
          <span>პარტნიორის ტარიფი</span>
          <strong>{formatPartnerTariff(partner)}</strong>
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
          <span>პარტნიორის მხარეს აღებული</span>
          <strong>{summary.transferred_total ?? 0} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>ფასი - პარტნიორის მხარეს აღებული</span>
          <strong>{partnerNetItemMoney.toFixed(2)} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>ადმინის მხარეს აღებული</span>
          <strong>{summary.collected_total ?? 0} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card">
          <span>ჩვენი ტარიფი + დამატებითი</span>
          <strong>{ourTariffSide.toFixed(2)} ₾</strong>
        </div>
        <div className="courier-payroll-page__summary-card courier-payroll-page__summary-card--accent">
          <span>პარტნიორს მისაცემი ადმინისგან</span>
          <strong>{totalPayable.toFixed(2)} ₾</strong>
        </div>
      </div>

      {isLoadingItems ? (
        <p className="status-message">იტვირთება...</p>
      ) : (
        <div className="courier-payroll-page__table-shell">
          <DataTable
            tableClassName="courier-payroll-table"
            headers={[
              renderSortHeader("პროდუქტი", "product", sort, handleSort),
              renderSortHeader("უბანი", "district", sort, handleSort),
              renderSortHeader("ქალაქი", "city", sort, handleSort),
              renderSortHeader("მისამართი", "address", sort, handleSort),
              renderSortHeader("კურიერის კომენტარი", "courier_comment", sort, handleSort),
              renderSortHeader("ფასი", "price", sort, handleSort),
              renderSortHeader("პარტნიორის ანგარიშზე", "transferred_to_shop_amount", sort, handleSort),
              renderSortHeader("ადმინის მხარეს აღებული", "collected_amount", sort, handleSort),
              renderSortHeader("დარიცხული ტარიფი", "base_tariff_amount", sort, handleSort),
              renderSortHeader("პარტნიორის დამატებითი", "partner_extra_price_per_item", sort, handleSort),
              renderSortHeader("გადახდა", "partner_paid_at", sort, handleSort),
            ]}
            filtersRow={(
              <tr className="delivery-items-table__filters">
                <th />
                <th>
                  <input
                    name="district"
                    value={filters.district}
                    onChange={handleFilterChange}
                    placeholder="ფილტრი"
                  />
                </th>
                <th>
                  <input
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    placeholder="ფილტრი"
                  />
                </th>
                <th>
                  <input
                    name="address"
                    value={filters.address}
                    onChange={handleFilterChange}
                    placeholder="ფილტრი"
                  />
                </th>
                <th />
                <th />
                <th />
                <th />
                <th />
                <th />
                <th />
              </tr>
            )}
            emptyMessage="ამ დღეს პარტნიორს მიწოდებული ნივთები არ აქვს."
            rows={sortedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.product || "-"}</td>
                <td>{item.district || "-"}</td>
                <td>{item.city || "-"}</td>
                <td>{item.address || "-"}</td>
                <td>{item.courier_comment || "-"}</td>
                <td>{item.price}</td>
                <td>{item.transferred_to_shop_amount ?? 0}</td>
                <td>{item.collected_amount ?? item.price}</td>
                <td>{item.base_tariff_amount ?? 0}</td>
                <td>
                  <MoneyField
                    className="courier-payroll-page__money-input"
                    disabled={savingExtraItemId === item.id}
                    itemId={item.id}
                    value={item.partner_extra_price_per_item}
                    onSave={handlePartnerExtraSave}
                  />
                </td>
                <td>{formatDateTime(item.partner_paid_at)}</td>
              </tr>
            ))}
          />
        </div>
      )}
    </section>
  );
}
