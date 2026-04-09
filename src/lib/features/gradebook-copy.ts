import type { FeatureDef } from "../runtime/types";
import { waitForElement } from "../utils/wait-for-element";

const BAR_CLASS = "uw-copy-qa-bar";
const BUTTON_CLASS = "uw-copy-qa-button";

export const gradebookCopyFeature: FeatureDef = {
  id: "gradebookCopyButton",
  title: "Copy question and answer",
  description:
    "Adds a copy button on gradebook attempts to copy the question text and your selected answer.",
  defaults: { enabled: true, options: {} },
  async setup(_ctx, _state) {
    const widget = await waitForElement(
      'form[action*="/gradebook/attempts/save"], form[id^="Assessment/attempts/save"]',
    );
    if (!widget) return {};

    ensureButtons();

    const observer = new MutationObserver(() => ensureButtons());
    observer.observe(widget, { childList: true, subtree: true });

    return {
      cleanup: () => observer.disconnect(),
    };
  },
};

function ensureButtons(): void {
  const tables = Array.from(document.querySelectorAll("table.table-primary")) as HTMLTableElement[];
  for (const table of tables) {
    attachButton(table);
  }
}

function attachButton(table: HTMLTableElement): void {
  const prev = table.previousElementSibling;
  if (prev && prev.classList.contains(BAR_CLASS)) return;

  const bar = document.createElement("div");
  bar.className = BAR_CLASS;
  bar.style.display = "flex";
  bar.style.justifyContent = "flex-end";
  bar.style.margin = "-4px 0 6px 0";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `btn btn-custom btn-bordered btn-rounded btn-sm ${BUTTON_CLASS}`;
  btn.textContent = "Copy Q&A";
  btn.addEventListener("click", () => copyQuestionAndAnswer(table, btn));

  bar.appendChild(btn);
  table.insertAdjacentElement("beforebegin", bar);
}

async function copyQuestionAndAnswer(
  table: HTMLTableElement,
  btn: HTMLButtonElement,
): Promise<void> {
  const questionTitle = findQuestionLabel(table);
  const questionText = extractQuestionText(table);
  const optionLines = extractOptionLines(table);
  const typedLines = extractTypedLines(table);

  const parts = [questionTitle, questionText && `Question: ${questionText}`].filter(Boolean);

  if (optionLines.length) {
    parts.push("Options:");
    parts.push(...optionLines);
  }

  if (typedLines.length) {
    parts.push("Typed:");
    parts.push(...typedLines);
  }

  if (!optionLines.length && !typedLines.length) {
    parts.push("Answer: No answer provided.");
  }

  const payload = parts.join("\n");

  try {
    await navigator.clipboard.writeText(payload);
    showCopied(btn);
  } catch (err) {
    console.error("uwrench: failed to copy question and answer", err);
    showError(btn);
  }
}

function findQuestionLabel(table: HTMLTableElement): string {
  let el: Element | null = table.previousElementSibling;
  while (el) {
    if (el.tagName === "P") {
      const text = collapseWhitespace(el.textContent ?? "");
      if (text) return text;
    }
    el = el.previousElementSibling;
  }

  const heading = table.closest(".widget")?.querySelector(".widget-head .text-grey");
  if (heading) return collapseWhitespace(heading.textContent ?? "");

  return "Question";
}

function extractQuestionText(table: HTMLTableElement): string {
  const cell = table.querySelector("tr td");
  if (!cell) return "";
  return collapseWhitespace(cell.textContent ?? "");
}

function extractOptionLines(table: HTMLTableElement): string[] {
  const inputs = Array.from(
    table.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
  );

  const lines: string[] = [];

  for (const input of inputs) {
    const labelText = getInputLabel(input) || input.value || "Option";
    const mark = input.checked ? "[x]" : "[ ]";
    lines.push(`${mark} ${labelText}`);
  }

  return dedupe(lines);
}

function extractTypedLines(table: HTMLTableElement): string[] {
  const typedInputs = Array.from(
    table.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'textarea, input[type="text"], input[type="number"]',
    ),
  )
    .map((el) => collapseWhitespace((el as HTMLInputElement).value ?? ""))
    .filter(Boolean);

  return dedupe(typedInputs);
}

function getInputLabel(input: HTMLInputElement): string {
  if (input.getAttribute("aria-label"))
    return collapseWhitespace(input.getAttribute("aria-label") ?? "");

  const inputGroup = input.closest(".input-group");
  if (inputGroup) {
    const checkAnswer = inputGroup.querySelector(".check_answer");
    if (checkAnswer) return collapseWhitespace(checkAnswer.textContent ?? "");
  }

  const parentCell = input.closest("td");
  const labelCell = parentCell?.nextElementSibling;
  if (labelCell?.textContent) return collapseWhitespace(labelCell.textContent);

  const label = input.labels?.[0]?.textContent;
  if (label) return collapseWhitespace(label);

  return "";
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function showCopied(btn: HTMLButtonElement): void {
  const original = btn.textContent;
  btn.textContent = "Copied!";
  btn.classList.add("btn-success");
  setTimeout(() => {
    btn.textContent = original || "Copy Q&A";
    btn.classList.remove("btn-success");
  }, 1500);
}

function showError(btn: HTMLButtonElement): void {
  const original = btn.textContent;
  btn.textContent = "Copy failed";
  btn.classList.add("btn-danger");
  setTimeout(() => {
    btn.textContent = original || "Copy Q&A";
    btn.classList.remove("btn-danger");
  }, 1500);
}
