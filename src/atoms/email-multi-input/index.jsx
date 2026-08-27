import React, { useMemo, useState } from "react";
import useUI from "@/hooks/useUI";
import { validateEmails } from "@/api/userManagementApi";

const MAX_EMAILS = 1500;

const MAX_LOCAL_PART_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;

/**
 * Strict address pattern, applied to the normalized (trimmed + lowercased) value.
 *
 * Local part : dot-separated segments, each at least one allowed character, so
 *              leading dots, trailing dots and consecutive dots all fail.
 * Domain     : one or more labels that must start and end with a letter/digit
 *              (rejects `example-.com` and `exam_ple.com`), each followed by a
 *              dot, then a TLD of two or more letters (rejects `user@example`).
 * Whitespace and extra `@` characters cannot match either side.
 */
const STRICT_EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Trim + lowercase so casing and padding never affect validation or dedupe. */
const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

/** Duplicate key is the normalized value, making comparison case-insensitive. */
const normalizeEmailKey = (email) => normalizeEmail(email);

const isValidEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (normalized.length > MAX_EMAIL_LENGTH) return false;

  const [localPart] = normalized.split("@");
  if (!localPart || localPart.length > MAX_LOCAL_PART_LENGTH) return false;

  return STRICT_EMAIL_PATTERN.test(normalized);
};

/**
 * Split pasted/typed text into records on comma, semicolon, newline or tab.
 * Spaces are trimmed from each record instead of being treated as separators,
 * so " a@b.com " stays one record rather than becoming several.
 */
const parseEmailRecords = (text) =>
  String(text ?? "")
    .split(/[,;\n\r\t]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

/**
 * Classify records following: normalize → validate → (invalid) or (duplicate check).
 *
 * Validation runs before duplicate detection, so an invalid address is only ever
 * counted as invalid — repeated invalid values each add to the invalid count.
 * Only valid emails enter the `seen` set, so duplicate detection is limited to
 * valid addresses; the first occurrence is unique, every later one is duplicate.
 */
const classifyRecords = (records, alreadyAddedValidKeys) => {
  const seen = new Set(alreadyAddedValidKeys);
  const entries = [];
  const duplicates = [];
  let invalidCount = 0;

  records.forEach((record) => {
    const normalized = normalizeEmail(record);
    if (!normalized) return; // empty values are not records

    if (!isValidEmail(normalized)) {
      entries.push({ value: normalized, valid: false });
      invalidCount += 1;
      return;
    }

    if (seen.has(normalized)) {
      duplicates.push(normalized);
      return;
    }

    seen.add(normalized);
    entries.push({ value: normalized, valid: true });
  });

  return {
    total: records.length,
    entries,
    duplicates,
    invalidCount,
    validUniqueCount: entries.length - invalidCount,
  };
};

/** Aggregate duplicate occurrences into { value, count } rows for display. */
const mergeDuplicates = (existingRows, newValues) => {
  const rows = existingRows.map((row) => ({ ...row }));
  const indexByKey = new Map(
    rows.map((row, index) => [normalizeEmailKey(row.value), index]),
  );

  newValues.forEach((value) => {
    const key = normalizeEmailKey(value);
    const index = indexByKey.get(key);
    if (index === undefined) {
      indexByKey.set(key, rows.length);
      rows.push({ value, count: 1 });
    } else {
      rows[index].count += 1;
    }
  });

  return rows;
};

const EmailMultiInput = ({
  value: emails = [],
  onChange: setEmails,
}) => {
  const [input, setInput] = useState("");
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const { warning, error, Toast } = useUI();
  const atLimit = emails.length >= MAX_EMAILS;
  const inputDisabled = atLimit || isValidating;

  const invalidEmails = useMemo(
    () =>
      emails
        .map((email, index) => ({ email, index }))
        .filter(({ email }) => email?.valid === false),
    [emails],
  );

  const orderedEmails = useMemo(() => {
    const invalid = [];
    const valid = [];
    emails.forEach((email, index) => {
      if (email?.valid === false) invalid.push({ email, index });
      else valid.push({ email, index });
    });
    return [...invalid, ...valid];
  }, [emails]);

  const validUniqueCount = emails.length - invalidEmails.length;
  const invalidCount = invalidEmails.length;
  const duplicateCount = useMemo(
    () => duplicateRows.reduce((sum, row) => sum + row.count, 0),
    [duplicateRows],
  );
  // Total Records = Valid Unique + Duplicate + Invalid
  const totalRecords = validUniqueCount + duplicateCount + invalidCount;

  const showLimitWarning = (remaining) => {
    warning(
      remaining <= 0
        ? `Maximum of ${MAX_EMAILS} emails allowed. Remove some emails to add more.`
        : `Maximum of ${MAX_EMAILS} emails allowed. You can add only ${remaining} more.`,
    );
  };

  const addEmailsFromText = async (text) => {
    if (isValidating) return;

    const remaining = MAX_EMAILS - emails.length;

    if (remaining <= 0) {
      showLimitWarning(0);
      setInput("");
      return;
    }

    const records = parseEmailRecords(text);
    if (records.length === 0) {
      setInput("");
      return;
    }

    const alreadyAddedValidKeys = emails
      .filter((email) => email?.valid !== false)
      .map((email) => normalizeEmailKey(email.value));

    const result = classifyRecords(records, alreadyAddedValidKeys);

    // Duplicates are never stored, so only new entries count against the limit.
    if (result.entries.length > remaining) {
      showLimitWarning(remaining);
      setInput("");
      return;
    }

    if (result.duplicates.length > 0) {
      setDuplicateRows((prev) => mergeDuplicates(prev, result.duplicates));
    }

    const formatInvalidEntries = result.entries.filter((entry) => !entry.valid);
    const formatValidEntries = result.entries.filter((entry) => entry.valid);

    // Nothing format-valid to verify with the backend.
    if (formatValidEntries.length === 0) {
      if (formatInvalidEntries.length > 0) {
        setEmails([...emails, ...formatInvalidEntries]);
      }
      setInput("");
      return;
    }

    setIsValidating(true);
    try {
      const apiResult = await validateEmails(
        formatValidEntries.map((entry) => entry.value),
      );

      const rejectedKeys = new Set(
        (apiResult.rejectedEmails || []).map((email) => normalizeEmailKey(email)),
      );

      const verifiedEntries = formatValidEntries.map((entry) => ({
        value: entry.value,
        valid: !rejectedKeys.has(normalizeEmailKey(entry.value)),
      }));

      setEmails([...emails, ...formatInvalidEntries, ...verifiedEntries]);
      setInput("");
    } catch (err) {
      error(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to validate emails. Please try again.",
      );
    } finally {
      setIsValidating(false);
    }
  };

  const addEmail = () => {
    addEmailsFromText(input);
  };

  const removeEmailAt = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const clearAllEmails = () => {
    setEmails([]);
    setInput("");
    setDuplicateRows([]);
  };

  const clearDuplicates = () => {
    setDuplicateRows([]);
  };

  const removeAllInvalidEmails = () => {
    setEmails(emails.filter((email) => email?.valid !== false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addEmail();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData("text");
    if (!pasted) return;

    if (atLimit) {
      e.preventDefault();
      showLimitWarning(0);
      return;
    }

    if (isValidating) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    addEmailsFromText(`${input}${pasted}`);
  };

  return (
    <>
      {totalRecords > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-[#1e1e1e]">
            Total records: {totalRecords}
          </span>
          <span className="text-blue-700">Valid unique: {validUniqueCount}</span>
          <span className="text-amber-700">Duplicates: {duplicateCount}</span>
          <span className="text-red-600">Invalid: {invalidCount}</span>
        </div>
      ) : null}

      {(invalidCount > 0 || duplicateRows.length > 0) && (
        <div className="mb-3 space-y-2">
          {invalidCount > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-red-700">
                  Invalid emails ({invalidCount})
                </p>
                <button
                  type="button"
                  onClick={removeAllInvalidEmails}
                  className="shrink-0 text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                >
                  Remove all
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {invalidEmails.map(({ email, index }) => (
                  <span
                    key={`invalid-${index}-${email.value}`}
                    className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700"
                  >
                    {email.value}
                    <button
                      type="button"
                      onClick={() => removeEmailAt(index)}
                      className="ml-1.5 text-xs font-bold"
                      aria-label={`Remove ${email.value}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {duplicateRows.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-amber-800">
                  Duplicate emails skipped ({duplicateCount})
                </p>
                <button
                  type="button"
                  onClick={clearDuplicates}
                  className="shrink-0 text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {duplicateRows.map((row) => (
                  <span
                    key={`dup-${normalizeEmailKey(row.value)}`}
                    className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-900"
                  >
                    {row.value}
                    {row.count > 1 ? ` ×${row.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center border rounded-lg px-2 py-2 bg-white">
        <input
          type="text"
          placeholder="type or paste emails (comma / semicolon / new line)"
          className="flex-1 outline-none text-sm px-2 disabled:cursor-not-allowed disabled:opacity-60"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={inputDisabled}
        />

        <button
          type="button"
          onClick={addEmail}
          disabled={inputDisabled}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {isValidating
            ? "Validating emails…"
            : `Maximum ${MAX_EMAILS} emails · duplicates are not allowed`}
          {!isValidating && emails.length > 0
            ? ` · ${emails.length}/${MAX_EMAILS}`
            : ""}
          {!isValidating && atLimit ? " · limit reached" : ""}
        </p>
        {emails.length > 0 ? (
          <button
            type="button"
            onClick={clearAllEmails}
            disabled={isValidating}
            className="shrink-0 text-xs font-medium text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Tags — invalid first */}
      <div className="mt-3 flex flex-wrap gap-2">
        {orderedEmails.map(({ email, index }) => (
          <div
            key={`${index}-${email.value}`}
            className={`flex items-center rounded-full px-3 py-1 text-sm ${
              email.valid
                ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {email.value}

            <button
              type="button"
              onClick={() => removeEmailAt(index)}
              className="ml-2 text-xs font-bold"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <Toast />
    </>
  );
};

export default EmailMultiInput;
