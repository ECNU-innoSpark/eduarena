import React, {useEffect, useMemo, useState} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {ANNOTATION_CSS} from "./Annotation";
import {appUrl} from "./appUrl";
import {TypeaheadDropdown} from "./Components";
import {normalizeQualitativeRecord} from "./qualitativeUtils";

const USER_STORAGE_KEY = "eduarena-user";

function loadStoredUserEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    return typeof parsed?.email === "string" ? parsed.email.trim().toLowerCase() : "";
  } catch {
    return "";
  }
}

export const PAIRWISE_CSS = `
  ${ANNOTATION_CSS}

  .pairwise {
    position: relative;
    padding: 18px;
    padding-bottom: 112px;
  }

  .pairwise-debug-floating {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 18;
    margin: 0;
    width: min(calc(100vw - 32px), 360px);
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(16, 20, 23, 0.62);
    backdrop-filter: blur(8px);
    color: rgba(233, 237, 240, 0.62);
    font: 10px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
  }

  .pairwise-hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: start;
    margin-bottom: 18px;
  }

  .pairwise-hero h2 {
    margin: 0 0 8px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .pairwise-hero-copy {
    position: relative;
    display: inline-grid;
    gap: 10px;
  }

  .pairwise-hero-hint {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.01em;
  }

  .pairwise-hero-hint::before {
    content: "⌕";
    font-size: 12px;
    line-height: 1;
  }

  .pairwise-hero-hover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 5;
    width: min(560px, calc(100vw - 96px));
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(25, 24, 22, 0.94);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px);
    transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
    pointer-events: none;
  }

  .pairwise-hero-copy:hover .pairwise-hero-hover,
  .pairwise-hero-copy:focus-within .pairwise-hero-hover {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }

  .pairwise-hero-hover p {
    margin: 0;
    max-width: 58ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .pairwise-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .pairwise-layout {
    display: grid;
    gap: 18px;
  }

  .pairwise-bottom-bar {
    position: sticky;
    bottom: 18px;
    z-index: 12;
    display: flex;
    justify-content: center;
    margin-top: 22px;
    pointer-events: none;
  }

  .pairwise-bottom-inner {
    display: grid;
    gap: 12px;
    width: min(920px, calc(100% - 24px));
    padding: 10px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(34, 33, 30, 0.92);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .pairwise-scorecard {
    padding: 16px;
    border-radius: 20px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .pairwise-bottom-inner .pairwise-scorecard {
    padding: 4px 4px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .pairwise-candidates {
    display: grid;
    gap: 12px;
  }

  .pairwise-candidate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .pairwise-candidate-card {
    display: grid;
    align-content: start;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.02);
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .pairwise-candidate-card[data-slot="a"] {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .pairwise-candidate-card[data-slot="b"] {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .pairwise-candidate-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .candidate-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    font-size: 12px;
    font-weight: 700;
  }

  .candidate-name {
    font-size: 12px;
    color: var(--muted);
  }

  .candidate-role {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .candidate-body {
    padding: 0 16px 16px;
    min-width: 0;
    max-width: 100%;
  }

  .candidate-picker {
    margin: 0;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    min-width: 0;
  }

  .typeahead {
    position: relative;
  }

  .typeahead-input {
    width: 100%;
  }

  .typeahead-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    max-height: 320px;
    overflow-y: auto;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: #101417;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  }

  .typeahead-option {
    width: 100%;
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .typeahead-option:hover,
  .typeahead-option.active {
    background: rgba(255, 255, 255, 0.08);
  }

  .typeahead-option-label {
    font-size: 13px;
    color: var(--text);
    overflow-wrap: anywhere;
  }

  .typeahead-option-meta {
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .typeahead-empty {
    padding: 10px 12px;
    color: var(--muted);
    font-size: 13px;
  }

  .pairwise-candidate-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pairwise-record-id {
    color: var(--muted);
    font-size: 12px;
    font-family: "SFMono-Regular", "SF Mono", "Consolas", monospace;
  }

  .pairwise-candidates .field,
  .pairwise-candidates .field select,
  .pairwise-candidates .conversation-list,
  .pairwise-candidates .message-card,
  .pairwise-candidates .message-body,
  .pairwise-candidates .tool-call,
  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre {
    min-width: 0;
    max-width: 100%;
  }

  .pairwise-candidates .field select {
    width: 100%;
  }

  .pairwise-candidates .conversation-list {
    gap: 0;
  }

  .pairwise-candidates .message-body,
  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre,
  .pairwise-candidates .message-body code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .pairwise-candidates .tool-call pre,
  .pairwise-candidates .message-body pre {
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .candidate-body > :first-child {
    margin-top: 0;
  }

  .candidate-body > :last-child {
    margin-bottom: 0;
  }

  .pairwise-candidates .message-card {
    padding: 14px 0 12px;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0;
    background: transparent;
  }

  .pairwise-candidates .conversation-list > .message-card:first-child {
    border-top: 0;
  }

  .pairwise-candidates .message-card.user,
  .pairwise-candidates .message-card.assistant {
    border-color: rgba(255, 255, 255, 0.08);
    background: transparent;
  }

  .pairwise-candidates .message-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .pairwise-candidates .message-role {
    display: flex;
    align-items: start;
    gap: 8px;
    min-height: 18px;
  }

  .pairwise-candidates .message-role-label {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding-top: 1px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
  }

  .pairwise-candidates .message-card.user .message-role-label {
    color: rgba(202, 234, 236, 0.92);
  }

  .pairwise-candidates .message-card.assistant .message-role-label {
    color: rgba(241, 198, 160, 0.92);
  }

  .pairwise-candidates .message-tool-call-id {
    padding-top: 1px;
    line-height: 1.15;
  }

  .pairwise-candidates .message-index {
    padding-top: 1px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .message-fold-toggle {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 0;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
  }

  .message-fold-toggle:hover {
    color: var(--text);
  }

  .conversation-filters {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .segment-group {
    display: grid;
    gap: 8px;
  }

  .scorecard-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin-top: 14px;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: inherit;
  }

  .scorecard-toggle:hover {
    color: var(--text);
  }

  .scorecard-toggle-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--text);
    font-size: 12px;
    line-height: 1;
  }

  .segment-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .segment-options-inline {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .segment-option {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    color: var(--muted);
  }

  .segment-option.active {
    color: var(--text);
    border-color: transparent;
    background: linear-gradient(90deg, rgba(208, 119, 65, 0.4), rgba(63, 155, 161, 0.2));
  }

  .segment-option input {
    margin: 0;
    accent-color: var(--accent);
  }

  .pairwise-bottom-inner .segment-option {
    justify-content: center;
    min-height: 48px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
  }

  .pairwise-bottom-inner .segment-option span:last-child {
    white-space: nowrap;
  }

  .dimension-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }

  .dimension-card {
    padding: 10px 0 12px;
    border-radius: 0;
    border: 0;
    background: transparent;
  }

  .dimension-card strong {
    display: block;
    margin-bottom: 8px;
  }

  .dimension-card .segment-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .dimension-card .segment-option {
    justify-content: center;
    padding: 8px 10px;
    min-width: 0;
  }

  .pairwise-note {
    margin-top: 14px;
  }

  @media (max-width: 1080px) {
    .dimension-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .pairwise-hero {
      flex-direction: column;
    }

    .pairwise-hero-hover {
      position: static;
      width: 100%;
      margin-top: 6px;
    }

    .pairwise-candidate-grid,
    .dimension-grid {
      grid-template-columns: 1fr;
    }

    .segment-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pairwise-bottom-bar {
      bottom: 10px;
    }

    .pairwise-bottom-inner {
      width: 100%;
      padding: 8px;
    }

    .segment-options-inline {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .pairwise {
    padding: 24px;
    padding-bottom: 120px;
  }

  .pairwise-layout {
    display: grid;
    gap: 22px;
  }

  .pairwise-stage {
    display: grid;
    gap: 22px;
    padding: clamp(18px, 2vw, 28px);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top right, rgba(75, 149, 154, 0.18), transparent 28%),
      radial-gradient(circle at top left, rgba(207, 132, 78, 0.14), transparent 28%),
      rgba(25, 24, 22, 0.94);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.26);
  }

  .pairwise-stage-toolbar,
  .pairwise-stage-actions,
  .pairwise-stage-meta,
  .pairwise-shared-prompt-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pairwise-stage-actions {
    justify-content: flex-end;
  }

  .pairwise-stage-meta {
    min-width: 0;
    justify-content: flex-start;
  }

  .pairwise-scene-chip,
  .pairwise-record-id {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .pairwise-record-id {
    font-size: 12px;
    color: rgba(233, 237, 240, 0.74);
  }

  .pairwise-scene-chip {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .conversation-filters {
    gap: 10px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }

  .conversation-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 13px;
  }

  .conversation-filter input {
    margin: 0;
    accent-color: var(--accent);
  }

  .pairwise-stage-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    cursor: pointer;
    font: inherit;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
  }

  .pairwise-stage-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
  }

  .pairwise-shared-prompt {
    display: grid;
    gap: 10px;
  }

  .pairwise-shared-prompt-label {
    color: rgba(233, 237, 240, 0.7);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .pairwise-shared-prompt-note {
    color: var(--muted);
    font-size: 13px;
  }

  .pairwise-prompt-bubble {
    margin-left: auto;
    width: min(100%, 860px);
    padding: 22px 24px;
    border-radius: 28px 28px 10px 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .pairwise-prompt-bubble > :first-child,
  .pairwise-prompt-bubble > :first-child > :first-child {
    margin-top: 0;
  }

  .pairwise-prompt-bubble > :last-child,
  .pairwise-prompt-bubble > :last-child > :last-child {
    margin-bottom: 0;
  }

  .pairwise-shared-prompt-foot {
    margin-left: auto;
    color: var(--muted);
    font-size: 12px;
  }

  .pairwise-candidate-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
    align-items: stretch;
  }

  .pairwise-candidate-card {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    min-height: 520px;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(20, 20, 18, 0.92);
    overflow: hidden;
  }

  .pairwise-candidate-card[data-slot="a"] {
    background:
      linear-gradient(180deg, rgba(68, 134, 138, 0.12), transparent 112px),
      rgba(20, 20, 18, 0.94);
  }

  .pairwise-candidate-card[data-slot="b"] {
    background:
      linear-gradient(180deg, rgba(202, 132, 76, 0.12), transparent 112px),
      rgba(20, 20, 18, 0.94);
  }

  .pairwise-candidate-top {
    display: grid;
    gap: 14px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .pairwise-candidate-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .pairwise-candidate-heading {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .candidate-caption {
    color: rgba(233, 237, 240, 0.64);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .candidate-role {
    gap: 12px;
    font-size: clamp(24px, 2vw, 30px);
    font-weight: 600;
    letter-spacing: -0.03em;
  }

  .candidate-badge {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
    font-size: 13px;
  }

  .pairwise-candidate-card[data-slot="a"] .candidate-badge {
    background: rgba(75, 149, 154, 0.18);
  }

  .pairwise-candidate-card[data-slot="b"] .candidate-badge {
    background: rgba(207, 132, 78, 0.18);
  }

  .candidate-name {
    font-size: 13px;
    color: rgba(233, 237, 240, 0.62);
    overflow-wrap: anywhere;
  }

  .candidate-picker-toggle {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    transition: background 160ms ease, border-color 160ms ease;
  }

  .candidate-picker-toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .candidate-picker {
    padding: 14px 22px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
  }

  .candidate-picker-inline > span {
    display: block;
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 12px;
  }

  .candidate-body {
    min-height: 0;
    padding: 0 22px 24px;
    overflow: auto;
  }

  .comparison-response-list {
    padding-top: 8px;
  }

  .pairwise-candidates .conversation-list,
  .comparison-response-list {
    gap: 0;
  }

  .pairwise-bottom-inner {
    width: min(1040px, calc(100% - 24px));
  }

  @media (max-width: 1080px) {
    .pairwise-stage-toolbar,
    .pairwise-stage-actions,
    .pairwise-shared-prompt-head {
      align-items: stretch;
    }

    .pairwise-prompt-bubble {
      width: 100%;
    }

    .pairwise-candidate-grid,
    .dimension-grid {
      grid-template-columns: 1fr;
    }

    .pairwise-candidate-card {
      min-height: 420px;
    }
  }

  @media (max-width: 720px) {
    .pairwise {
      padding: 14px;
      padding-bottom: 128px;
    }

    .pairwise-stage {
      gap: 18px;
      padding: 16px;
      border-radius: 22px;
    }

    .pairwise-stage-toolbar,
    .pairwise-stage-actions,
    .pairwise-stage-meta,
    .pairwise-shared-prompt-head {
      flex-direction: column;
      align-items: stretch;
    }

    .pairwise-prompt-bubble {
      margin-left: 0;
      padding: 18px;
      border-radius: 22px;
    }

    .pairwise-shared-prompt-foot {
      margin-left: 0;
    }

    .pairwise-candidate-card {
      min-height: auto;
      border-radius: 22px;
    }

    .pairwise-candidate-top,
    .candidate-picker {
      padding-left: 16px;
      padding-right: 16px;
    }

    .candidate-body {
      padding: 0 16px 18px;
    }
  }
`;

const DIMENSIONS = [
  { key: "pedagogy", label: "专业性" },
  { key: "accuracy", label: "个性化" },
  { key: "clarity", label: "创造力" },
  { key: "completeness", label: "价值观" },
];

const CHOICE_OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "tie", label: "持平" },
];

const PAIRWISE_COPY = {
  zh: {
    workspace: "Pairwise Workspace",
    title: "Pairwise 质性评审",
    meta: "pairwise annotation workspace",
    eyebrow: "pairwise review",
    hoverHint: "悬停查看说明",
    hero: "将记录信息与完整消息流放在同一块面板里，再把候选回答和胜负判断拆到右侧，适合做 Arena 风格的 pairwise 标注。",
    pill: "记录、消息与 pairwise 评分联动",
    record: "记录与消息",
    recordInfo: "记录信息",
    candidates: "Pairwise 候选回答",
    scoring: "Pairwise 评分",
    stats: "评分概览",
    selectMessage: "选择消息文件",
    selectCandidateA: "候选 A 文件",
    selectCandidateB: "候选 B 模型",
    showCandidatePicker: "显示详情",
    hideCandidatePicker: "隐藏详情",
    messagesUnit: "条消息",
    showTool: "显示 tool",
    showSystemPrompt: "显示 system prompt",
    sharedPrompt: "共享题目",
    sharedPromptHint: "A / B 使用同一道题，下方只展示各自回答。",
    nextQuestion: "换一题",
    userTurns: "条用户消息",
    preferred: "整体胜负",
    winnerOptions: [
      { value: "a", label: "A 更好" },
      { value: "b", label: "B 更好" },
      { value: "tie", label: "平局" },
      { value: "both_bad", label: "都不好" },
    ],
    dimension: "维度对比",
    confidence: "判定信心",
    note: "评审备注",
    dimensions: "维度评分",
    expandDimensions: "展开维度评分",
    collapseDimensions: "收起维度评分",
    expandConfidence: "展开判定信心",
    collapseConfidence: "收起判定信心",
    expandNote: "展开评审备注",
    collapseNote: "收起评审备注",
    expandSave: "展开保存操作",
    collapseSave: "收起保存操作",
    save: "保存 Pairwise 评分",
    saveHint: "优先写入服务端 qualitative ratings；如果接口不可用，则回退到浏览器本地存储。",
    loading: "Pairwise 记录加载中。",
    summaryCount: "已评分记录",
    summaryWinner: "当前胜者",
    noCandidate: "当前记录里没有明确的双候选回答，已回退为从 assistant 消息中提取示例内容。",
    candidateFallback: "暂无候选回答内容。",
    candidateA: "助手 A",
    candidateB: "助手 B",
  },
  en: {
    workspace: "Pairwise Workspace",
    title: "Pairwise Review",
    meta: "pairwise annotation workspace",
    eyebrow: "pairwise review",
    hoverHint: "Hover for details",
    hero: "This view combines record metadata with the full message stream, then separates candidate comparison and pairwise judgment into a dedicated scoring column.",
    pill: "Record, messages, and pairwise scoring",
    record: "Record and Messages",
    recordInfo: "Record Info",
    candidates: "Pairwise Candidates",
    scoring: "Pairwise Scoring",
    stats: "Rating Summary",
    selectMessage: "Message file",
    selectCandidateA: "Candidate A file",
    selectCandidateB: "Candidate B model",
    showCandidatePicker: "Show details",
    hideCandidatePicker: "Hide details",
    messagesUnit: "messages",
    showTool: "Show tool",
    showSystemPrompt: "Show system prompt",
    sharedPrompt: "Shared prompt",
    sharedPromptHint: "Both assistants answer the same prompt; only their replies are shown below.",
    nextQuestion: "Next prompt",
    userTurns: "user turns",
    preferred: "Overall winner",
    winnerOptions: [
      { value: "a", label: "A Better" },
      { value: "b", label: "B Better" },
      { value: "tie", label: "Tie" },
      { value: "both_bad", label: "Both Bad" },
    ],
    dimension: "Dimension comparison",
    confidence: "Confidence",
    note: "Reviewer note",
    dimensions: "Dimension Scoring",
    expandDimensions: "Show dimension scoring",
    collapseDimensions: "Hide dimension scoring",
    expandConfidence: "Show confidence",
    collapseConfidence: "Hide confidence",
    expandNote: "Show reviewer note",
    collapseNote: "Hide reviewer note",
    expandSave: "Show save actions",
    collapseSave: "Hide save actions",
    save: "Save Pairwise Rating",
    saveHint: "Prefer writing to the server-side qualitative ratings endpoint; if unavailable, fall back to browser local storage.",
    loading: "Loading pairwise record.",
    summaryCount: "Rated records",
    summaryWinner: "Current winner",
    noCandidate: "No explicit pairwise candidates were found in this record. Falling back to assistant messages.",
    candidateFallback: "No candidate answer content found.",
    candidateA: "Assistant A",
    candidateB: "Assistant B",
  },
};

function createEmptyPairwiseRatings() {
  return {
    pairwise: {
      winner: "",
      confidence: "",
      note: "",
      pedagogy: "",
      accuracy: "",
      clarity: "",
      completeness: "",
    },
  };
}

function normalizeCandidate(rawCandidate, fallbackLabel) {
  if (!rawCandidate) {
    return {
      label: fallbackLabel,
      content: "",
      meta: "",
    };
  }

  if (typeof rawCandidate === "string") {
    return {
      label: fallbackLabel,
      content: rawCandidate,
      meta: "",
    };
  }

  return {
    label: rawCandidate.label ?? rawCandidate.name ?? rawCandidate.model ?? fallbackLabel,
    content:
      rawCandidate.content
      ?? rawCandidate.text
      ?? rawCandidate.response
      ?? rawCandidate.answer
      ?? rawCandidate.output
      ?? "",
    meta: rawCandidate.model ?? rawCandidate.id ?? rawCandidate.role ?? "",
  };
}

function derivePairwiseCandidates(source, record, copy) {
  const directA =
    source?.candidateA
    ?? source?.candidate_a
    ?? source?.responseA
    ?? source?.response_a
    ?? source?.answerA
    ?? source?.answer_a
    ?? source?.chosen;
  const directB =
    source?.candidateB
    ?? source?.candidate_b
    ?? source?.responseB
    ?? source?.response_b
    ?? source?.answerB
    ?? source?.answer_b
    ?? source?.rejected;

  if (directA || directB) {
    return {
      candidates: [
        normalizeCandidate(directA, copy.candidateA),
        normalizeCandidate(directB, copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  if (Array.isArray(source?.candidates) && source.candidates.length >= 2) {
    return {
      candidates: [
        normalizeCandidate(source.candidates[0], copy.candidateA),
        normalizeCandidate(source.candidates[1], copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  if (Array.isArray(source?.responses) && source.responses.length >= 2) {
    return {
      candidates: [
        normalizeCandidate(source.responses[0], copy.candidateA),
        normalizeCandidate(source.responses[1], copy.candidateB),
      ],
      usedFallback: false,
    };
  }

  const assistantMessages = (record?.messages ?? []).filter((message) => message?.role === "assistant");

  return {
    candidates: [
      normalizeCandidate(assistantMessages[0]?.content ?? "", copy.candidateA),
      normalizeCandidate(assistantMessages[1]?.content ?? "", copy.candidateB),
    ],
    usedFallback: true,
  };
}

function buildCandidateFromRecord(recordSource, normalizedRecord, fallbackLabel) {
  if (!recordSource || !normalizedRecord) {
    return {
      label: fallbackLabel,
      meta: "",
      messages: [],
      turnCount: 0,
    };
  }

  return {
    label: fallbackLabel,
    meta: normalizedRecord.scenario,
    messages: normalizedRecord.messages ?? [],
    turnCount: normalizedRecord.turn_count ?? (normalizedRecord.messages ?? []).length ?? 0,
  };
}

function renderMarkdown(value) {
  if (!value || typeof value !== "string") return null;
  return (
    <Markdown remarkPlugins={[remarkGfm]}>
      {value}
    </Markdown>
  );
}

function extractTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text ?? "";
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildSharedPrompt(record) {
  const userMessages = (record?.messages ?? []).filter((message) => message?.role === "user");
  const latestUserMessage = [...userMessages]
    .reverse()
    .map((message) => extractTextContent(message?.content).trim())
    .find(Boolean);

  return {
    text: latestUserMessage || String(record?.question ?? "").trim(),
    userTurnCount: userMessages.length,
  };
}

function getVisibleCandidateMessages(messages, { showToolMessages, showSystemMessages }) {
  return (messages ?? []).filter((message) => {
    if (!message || message.role === "user") return false;
    if (!showToolMessages && message.role === "tool") return false;
    if (!showSystemMessages && message.role === "system") return false;
    return true;
  });
}

function formatToolArguments(rawArguments) {
  if (!rawArguments) return "";

  try {
    return JSON.stringify(JSON.parse(rawArguments), null, 2);
  } catch {
    return rawArguments;
  }
}

function renderMessageContent(message) {
  const textContent = extractTextContent(message?.content);
  if (textContent.trim()) {
    return renderMarkdown(textContent);
  }

  if (Array.isArray(message?.tool_calls) && message.tool_calls.length) {
    return (
      <div className="tool-calls">
        {message.tool_calls.map((toolCall, toolIndex) => {
          const functionName = toolCall?.function?.name || toolCall?.type || "tool_call";
          const formattedArguments = formatToolArguments(toolCall?.function?.arguments);

          return (
            <div key={toolCall?.id || `${functionName}-${toolIndex}`} className="tool-call">
              <div className="tool-call-head">
                <span className="tool-call-name">{functionName}</span>
                {toolCall?.id ? <span className="tool-call-id">{toolCall.id}</span> : null}
              </div>
              {formattedArguments ? (
                <>
                  <span className="tool-call-label">arguments</span>
                  <pre>{formattedArguments}</pre>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function getMiddleMessagesToggleLabel(locale, hiddenCount, isExpanded) {
  if (locale === "en") {
    return isExpanded
      ? "Hide middle messages"
      : `Show ${hiddenCount} middle message${hiddenCount === 1 ? "" : "s"}`;
  }

  return isExpanded ? "收起中间过程" : `展开中间 ${hiddenCount} 条消息`;
}

function splitMessagePath(fileName) {
  return String(fileName || "")
    .split("/")
    .filter(Boolean);
}

function getCandidateQuestionFolder(fileName) {
  const parts = splitMessagePath(fileName);
  return parts.length > 2 ? parts.slice(0, -2).join("/") : "";
}

function getCandidateVariant(fileName) {
  const parts = splitMessagePath(fileName);
  return parts.length > 1 ? parts.slice(-2).join("/") : String(fileName || "");
}

function getCandidateVariantLabel(fileName) {
  const parts = splitMessagePath(fileName);
  return parts.length > 1 ? parts[parts.length - 2] : String(fileName || "");
}

function buildCandidateFileFromFolder(folderName, variantFile) {
  const folder = String(folderName || "").replace(/^\/+|\/+$/g, "");
  const variant = String(variantFile || "").replace(/^\/+|\/+$/g, "");
  if (!folder) return variant;
  if (!variant) return "";
  return `${folder}/${variant}`;
}

function pickDefaultCandidateBVariant(items, candidateAFile) {
  const candidateAVariant = getCandidateVariant(candidateAFile);
  const siblingVariants = items.map((item) => item.fileName);
  const uniqueVariants = [...new Set(siblingVariants)];
  return uniqueVariants.find((variant) => variant !== candidateAVariant) ?? uniqueVariants[0] ?? candidateAVariant;
}

function pickRandomCandidateAFile(items, currentFile = "") {
  const availableFiles = items
    .map((item) => item?.fileName)
    .filter(Boolean);

  if (!availableFiles.length) return "";

  const pool = availableFiles.filter((fileName) => fileName !== currentFile);
  const candidates = pool.length ? pool : availableFiles;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex] ?? "";
}

function renderConversationMessageCard({
  message,
  messageIndex,
  slotKey,
}) {
  const role = message.role || "unknown";
  const messageKey = `${slotKey}-${role}-${messageIndex}-${message.tool_call_id || message.id || "message"}`;

  return (
    <div key={messageKey} className={`message-card ${role}`}>
      <div className="message-head">
        <div className="message-role">
          <span className="message-role-label">{role}</span>
          {message.role === "tool" && message.tool_call_id ? (
            <span className="message-tool-call-id">{message.tool_call_id}</span>
          ) : null}
        </div>
        <div className="message-index">#{messageIndex + 1}</div>
      </div>
      <div className="message-body">
        {renderMessageContent(message)}
      </div>
    </div>
  );
}

export function PairwiseRating({ locale = "zh" }) {
  const copy = PAIRWISE_COPY[locale] ?? PAIRWISE_COPY.zh;
  const [messageOptions, setMessageOptions] = useState([]);
  const [candidateBOptions, setCandidateBOptions] = useState([]);
  const [selectedCandidateAFile, setSelectedCandidateAFile] = useState("");
  const [selectedCandidateBVariant, setSelectedCandidateBVariant] = useState("");
  const [candidateARawRecord, setCandidateARawRecord] = useState(null);
  const [candidateBRawRecord, setCandidateBRawRecord] = useState(null);
  const [candidateARecord, setCandidateARecord] = useState(null);
  const [candidateBRecord, setCandidateBRecord] = useState(null);
  const [ratingFolderSummary, setRatingFolderSummary] = useState(null);
  const [ratings, setRatings] = useState(createEmptyPairwiseRatings());
  const [saveState, setSaveState] = useState("");
  const [showToolMessages, setShowToolMessages] = useState(true);
  const [showSystemMessages, setShowSystemMessages] = useState(false);
  const [visibleCandidatePickers, setVisibleCandidatePickers] = useState({ a: false, b: false });
  const [expandedMiddleMessages, setExpandedMiddleMessages] = useState({});
  const [isSaveFolded, setIsSaveFolded] = useState(true);
  const [isDimensionFolded, setIsDimensionFolded] = useState(true);
  const [isConfidenceFolded, setIsConfidenceFolded] = useState(true);
  const [isNoteFolded, setIsNoteFolded] = useState(true);

  useEffect(() => {
    async function loadMessageOptions() {
      const response = await fetch(appUrl("/api/qualitative-messages?multi_model_only=1"));
      if (!response.ok) throw new Error(`message options failed:${response.status}`);

      const items = await response.json();
      setMessageOptions(items);
      const randomCandidateAFile = pickRandomCandidateAFile(items);
      if (randomCandidateAFile) {
        setSelectedCandidateAFile(randomCandidateAFile);
        setSelectedCandidateBVariant("");
      }
    }

    loadMessageOptions().catch(() => {
      setSaveState("消息列表加载失败。");
    });
  }, []);

  useEffect(() => {
    async function loadRatingFolderSummary() {
      const response = await fetch(appUrl("/api/qualitative-ratings-folder?kind=pairwise"));
      if (!response.ok) {
        throw new Error(`folder summary failed:${response.status}`);
      }
      const summary = await response.json();
      setRatingFolderSummary(summary);
    }

    loadRatingFolderSummary().catch(() => {
      setRatingFolderSummary(null);
    });
  }, []);

  useEffect(() => {
    if (!selectedCandidateAFile) return;

    async function loadCandidateRecord() {
      const response = await fetch(
        appUrl(`/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateAFile)}`),
      );
      if (!response.ok) throw new Error(`candidate A failed:${response.status}`);

      const nextRaw = await response.json();
      setCandidateARawRecord(nextRaw);
      setCandidateARecord(normalizeQualitativeRecord(nextRaw, selectedCandidateAFile));
    }

    loadCandidateRecord().catch(() => {
      setCandidateARawRecord(null);
      setCandidateARecord(null);
    });
  }, [selectedCandidateAFile]);

  useEffect(() => {
    if (!selectedCandidateAFile) return;

    async function loadCandidateBOptions() {
      const response = await fetch(
        appUrl(`/api/qualitative-message-siblings?file=${encodeURIComponent(selectedCandidateAFile)}`),
      );
      if (!response.ok) throw new Error(`candidate B options failed:${response.status}`);

      const items = await response.json();
      setCandidateBOptions(items);
    }

    loadCandidateBOptions().catch(() => {
      setCandidateBOptions([]);
      setSelectedCandidateBVariant("");
    });
  }, [selectedCandidateAFile]);

  useEffect(() => {
    if (!candidateBOptions.length) {
      if (selectedCandidateBVariant) setSelectedCandidateBVariant("");
      return;
    }
    if (candidateBOptions.some((item) => item.fileName === selectedCandidateBVariant)) return;
    setSelectedCandidateBVariant(pickDefaultCandidateBVariant(candidateBOptions, selectedCandidateAFile));
  }, [candidateBOptions, selectedCandidateAFile, selectedCandidateBVariant]);

  useEffect(() => {
    if (!selectedCandidateAFile || !selectedCandidateBVariant) return;

    async function loadCandidateRecord() {
      const candidateAFolder = getCandidateQuestionFolder(selectedCandidateAFile);
      const response = await fetch(
        appUrl(
          `/api/qualitative-messages?file=${encodeURIComponent(selectedCandidateBVariant)}&folder=${encodeURIComponent(candidateAFolder)}`,
        ),
      );
      if (!response.ok) throw new Error(`candidate B failed:${response.status}`);

      const nextRaw = await response.json();
      const resolvedCandidateBFile = buildCandidateFileFromFolder(candidateAFolder, selectedCandidateBVariant);
      setCandidateBRawRecord(nextRaw);
      setCandidateBRecord(normalizeQualitativeRecord(nextRaw, resolvedCandidateBFile));
    }

    loadCandidateRecord().catch(() => {
      setCandidateBRawRecord(null);
      setCandidateBRecord(null);
    });
  }, [selectedCandidateAFile, selectedCandidateBVariant]);

  const activeRecord = candidateARecord ?? candidateBRecord ?? null;
  const sharedPrompt = useMemo(() => buildSharedPrompt(activeRecord), [activeRecord]);

  useEffect(() => {
    setRatings(createEmptyPairwiseRatings());
    setVisibleCandidatePickers({ a: false, b: false });
  }, [activeRecord?.record_id]);

  const pairwiseCandidates = useMemo(() => {
    const candidateA = buildCandidateFromRecord(candidateARawRecord, candidateARecord, copy.candidateA);
    const candidateB = buildCandidateFromRecord(candidateBRawRecord, candidateBRecord, copy.candidateB);

    return {
      candidates: [candidateA, candidateB],
    };
  }, [candidateARecord, candidateARawRecord, candidateBRecord, candidateBRawRecord, copy.candidateA, copy.candidateB]);

  const ratingFolderDebugMessage = useMemo(() => {
    if (!ratingFolderSummary) return "pairwise folder summary: unavailable";
    const dirName = String(ratingFolderSummary.dir || "").split("/").filter(Boolean).at(-1) || "unknown";
    const latestFile = ratingFolderSummary.files?.[ratingFolderSummary.files.length - 1];
    const latestText = latestFile
      ? `latest: ${latestFile.name}\nlatestRecordCount: ${latestFile.recordCount}`
      : "latest: none";
    return `debug pairwise folder
dir: ${dirName}
fileCount: ${ratingFolderSummary.fileCount ?? 0}
${latestText}`;
  }, [ratingFolderSummary]);

  const ratingFolderDebugTitle = useMemo(() => {
    if (!ratingFolderSummary) return "pairwise folder summary unavailable";
    return JSON.stringify(ratingFolderSummary, null, 2);
  }, [ratingFolderSummary]);

  function updatePairwise(field, value) {
    const nextRatings = {
      ...ratings,
      pairwise: {
        ...ratings.pairwise,
        [field]: value,
      },
    };
    setRatings(nextRatings);
    return nextRatings;
  }

  function advanceToNextCandidates() {
    if (!messageOptions.length) return;

    const nextCandidateAFile = pickRandomCandidateAFile(messageOptions, selectedCandidateAFile);
    if (!nextCandidateAFile) return;
    setSelectedCandidateAFile(nextCandidateAFile);
  }

  async function handleSave(ratingsOverride = ratings) {
    if (!activeRecord) return;
    const updatedAt = new Date().toISOString();
    const userEmail = loadStoredUserEmail();
    const recordToSave = {
      version: 1,
      savedAt: updatedAt,
      records: {
        [activeRecord.record_id]: {
          record_id: activeRecord.record_id,
          scenario: activeRecord.scenario,
          question: activeRecord.question,
          turn_count: activeRecord.turn_count,
          updatedAt,
          ...(userEmail ? {user_email: userEmail} : {}),
          pairwise: ratingsOverride.pairwise,
          pairwise_meta: {
            candidate_a_file: selectedCandidateAFile,
            candidate_b_file: buildCandidateFileFromFolder(
                getCandidateQuestionFolder(selectedCandidateAFile),
                selectedCandidateBVariant,
            ),
          },
        },
      },
    };

    try {
      const response = await fetch(appUrl("/api/qualitative-ratings-save"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordToSave),
      });

      if (!response.ok) throw new Error(`save failed:${response.status}`);

      await response.json();
      try {
        const folderResponse = await fetch(appUrl("/api/qualitative-ratings-folder?kind=pairwise"));
        if (folderResponse.ok) {
          const folderSummary = await folderResponse.json();
          setRatingFolderSummary(folderSummary);
        }
      } catch {}
      setSaveState("Pairwise 评分已保存到服务器端 JSON 文件。");
      advanceToNextCandidates();
    } catch (error) {
      const message = String(error?.message ?? "");
      if (message.includes("404")) {
        setSaveState("保存接口不存在，Pairwise 评分未保存。");
        return;
      }
      setSaveState("服务器保存失败，Pairwise 评分未保存。");
    }
  }

  function handleWinnerSelect(value) {
    const nextRatings = updatePairwise("winner", value);
    if (isSaveFolded) {
      handleSave(nextRatings);
    }
  }

  return (
    <>
      <section className="pairwise">
        <div className="pairwise-debug-floating" title={ratingFolderDebugTitle}>{ratingFolderDebugMessage}</div>
        {activeRecord ? (
          <div className="pairwise-layout">
            <div className="pairwise-stage pairwise-candidates">
              <div className="pairwise-stage-toolbar">
                <div className="pairwise-stage-meta">
                  <span className="pairwise-scene-chip">{activeRecord.scenario}</span>
                  <span className="pairwise-record-id">{activeRecord.record_id}</span>
                </div>
                <div className="pairwise-stage-actions">
                  <div className="conversation-filters">
                    <label className="conversation-filter">
                      <input
                        checked={showToolMessages}
                        onChange={(event) => setShowToolMessages(event.target.checked)}
                        type="checkbox"
                      />
                      <span>{copy.showTool}</span>
                    </label>
                    <label className="conversation-filter">
                      <input
                        checked={showSystemMessages}
                        onChange={(event) => setShowSystemMessages(event.target.checked)}
                        type="checkbox"
                      />
                      <span>{copy.showSystemPrompt}</span>
                    </label>
                  </div>
                  <button type="button" className="pairwise-stage-button" onClick={advanceToNextCandidates}>
                    {copy.nextQuestion}
                  </button>
                </div>
              </div>

              <div className="pairwise-shared-prompt">
                <div className="pairwise-prompt-bubble">
                  {sharedPrompt.text ? renderMarkdown(sharedPrompt.text) : <p>{activeRecord.question}</p>}
                </div>
                {sharedPrompt.userTurnCount > 1 ? (
                  <div className="pairwise-shared-prompt-foot">
                    {sharedPrompt.userTurnCount} {copy.userTurns}
                  </div>
                ) : null}
              </div>

              <div className="pairwise-candidate-grid">
                {pairwiseCandidates.candidates.map((candidate, index) => {
                  const isCandidateA = index === 0;
                  const slotKey = isCandidateA ? "a" : "b";
                  const selectedFile = isCandidateA ? selectedCandidateAFile : selectedCandidateBVariant;
                  const setSelectedFile = isCandidateA ? setSelectedCandidateAFile : setSelectedCandidateBVariant;
                  const selectLabel = isCandidateA ? copy.selectCandidateA : copy.selectCandidateB;
                  const selectOptions = isCandidateA ? messageOptions : candidateBOptions;
                  const candidateMessages = getVisibleCandidateMessages(candidate.messages, {
                    showToolMessages,
                    showSystemMessages,
                  });
                  const hiddenMessageCount = Math.max(candidateMessages.length - 2, 0);
                  const middleMessagesKey = selectedFile || `${slotKey}-${index}`;
                  const isMiddleExpanded = expandedMiddleMessages[middleMessagesKey] ?? false;
                  const candidateTitle = getCandidateVariantLabel(selectedFile) || candidate.label;
                  const isPickerVisible = visibleCandidatePickers[slotKey] ?? false;

                  return (
                    <article
                      key={`${candidate.label}-${index}`}
                      className="pairwise-candidate-card"
                      data-slot={slotKey}
                    >
                      <div className="pairwise-candidate-top">
                        <div className="pairwise-candidate-top-row">
                          <span className="candidate-caption">{candidate.label}</span>
                          <button
                            type="button"
                            className="candidate-picker-toggle"
                            aria-expanded={isPickerVisible}
                            onClick={() => {
                              setVisibleCandidatePickers((current) => ({
                                ...current,
                                [slotKey]: !current[slotKey],
                              }));
                            }}
                          >
                            {isPickerVisible ? copy.hideCandidatePicker : copy.showCandidatePicker}
                          </button>
                        </div>

                        {isPickerVisible ? (
                          <div className="pairwise-candidate-heading">
                            <div className="candidate-role">
                              <span className="candidate-badge">{isCandidateA ? "A" : "B"}</span>
                              <span>{candidateTitle}</span>
                            </div>
                            <span className="candidate-name">
                              {candidate.meta} · {candidate.turnCount ?? 0} {copy.messagesUnit}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {isPickerVisible && selectOptions.length ? (
                        <TypeaheadDropdown
                          fieldClassName="field candidate-picker candidate-picker-inline"
                          label={selectLabel}
                          onChange={setSelectedFile}
                          options={selectOptions}
                          value={selectedFile}
                        />
                      ) : null}

                      <div className="candidate-body">
                        {candidateMessages.length ? (
                          <div className="conversation-list comparison-response-list">
                            {candidateMessages.slice(0, 1).map((message, messageIndex) =>
                              renderConversationMessageCard({
                                message,
                                messageIndex,
                                slotKey: `${slotKey}-${middleMessagesKey}`,
                              }),
                            )}

                            {hiddenMessageCount > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="message-fold-toggle"
                                  onClick={() => {
                                    setExpandedMiddleMessages((current) => ({
                                      ...current,
                                      [middleMessagesKey]: !isMiddleExpanded,
                                    }));
                                  }}
                                >
                                  {getMiddleMessagesToggleLabel(locale, hiddenMessageCount, isMiddleExpanded)}
                                </button>

                                {isMiddleExpanded
                                  ? candidateMessages.slice(1, -1).map((message, middleIndex) => {
                                    const actualIndex = middleIndex + 1;
                                    return renderConversationMessageCard({
                                      message,
                                      messageIndex: actualIndex,
                                      slotKey: `${slotKey}-${middleMessagesKey}`,
                                    });
                                  })
                                  : null}
                              </>
                            ) : null}

                            {candidateMessages.length > 1
                              ? candidateMessages.slice(-1).map((message) =>
                                renderConversationMessageCard({
                                  message,
                                  messageIndex: candidateMessages.length - 1,
                                  slotKey: `${slotKey}-${middleMessagesKey}`,
                                }),
                              )
                              : null}
                          </div>
                        ) : (
                          <p>{copy.candidateFallback}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="pairwise-bottom-bar">
              <div className="pairwise-bottom-inner">
                <article className="pairwise-scorecard">
                  <div className="section-title">
                    <h3>{copy.scoring}</h3>
                    <span>{copy.stats}</span>
                  </div>

                  <button
                    type="button"
                    className="scorecard-toggle"
                    onClick={() => setIsDimensionFolded((current) => !current)}
                  >
                    <span className="scorecard-toggle-indicator">{isDimensionFolded ? "+" : "-"}</span>
                    <span>{isDimensionFolded ? copy.expandDimensions : copy.collapseDimensions}</span>
                  </button>

                  {isDimensionFolded ? null : (
                    <div className="dimension-grid">
                      {DIMENSIONS.map((dimension) => (
                        <div key={dimension.key} className="dimension-card">
                          <strong>{dimension.label}</strong>
                          <div className="segment-options">
                            {CHOICE_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className={`segment-option ${ratings.pairwise[dimension.key] === option.value ? "active" : ""}`}
                              >
                                <input
                                  checked={ratings.pairwise[dimension.key] === option.value}
                                  name={dimension.key}
                                  onChange={() => updatePairwise(dimension.key, option.value)}
                                  type="radio"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="scorecard-toggle"
                    onClick={() => setIsConfidenceFolded((current) => !current)}
                  >
                    <span className="scorecard-toggle-indicator">{isConfidenceFolded ? "+" : "-"}</span>
                    <span>{isConfidenceFolded ? copy.expandConfidence : copy.collapseConfidence}</span>
                  </button>

                  {isConfidenceFolded ? null : (
                    <label className="field pairwise-note">
                      <span>{copy.confidence}</span>
                      <select
                        value={ratings.pairwise.confidence}
                        onChange={(event) => updatePairwise("confidence", event.target.value)}
                      >
                        <option value="">--</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </label>
                  )}

                  <button
                    type="button"
                    className="scorecard-toggle"
                    onClick={() => setIsNoteFolded((current) => !current)}
                  >
                    <span className="scorecard-toggle-indicator">{isNoteFolded ? "+" : "-"}</span>
                    <span>{isNoteFolded ? copy.expandNote : copy.collapseNote}</span>
                  </button>

                  {isNoteFolded ? null : (
                    <label className="field pairwise-note">
                      <span>{copy.note}</span>
                      <textarea
                        rows="4"
                        value={ratings.pairwise.note}
                        onChange={(event) => updatePairwise("note", event.target.value)}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    className="scorecard-toggle"
                    onClick={() => setIsSaveFolded((current) => !current)}
                  >
                    <span className="scorecard-toggle-indicator">{isSaveFolded ? "+" : "-"}</span>
                    <span>{isSaveFolded ? copy.expandSave : copy.collapseSave}</span>
                  </button>

                  {isSaveFolded ? null : (
                    <div className="save-row">
                      <button className="primary-btn" type="button" onClick={handleSave}>
                        {copy.save}
                      </button>
                      <span className="save-hint">{saveState || copy.saveHint}</span>
                    </div>
                  )}
                </article>

                <div className="segment-options segment-options-inline">
                  {copy.winnerOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`segment-option ${ratings.pairwise.winner === option.value ? "active" : ""}`}
                    >
                      <input
                        checked={ratings.pairwise.winner === option.value}
                        name="winner"
                        onChange={() => handleWinnerSelect(option.value)}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty">{copy.loading}</div>
        )}
      </section>
    </>
  );
}
