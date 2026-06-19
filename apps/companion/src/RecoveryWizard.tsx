import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  RECOVERY_CHECKLIST_ITEMS,
  RECOVERY_WIZARD_STEPS,
  type RecoveryChecklistState,
} from '@ase/core';

interface RecoveryChecklist {
  rotatePasswords: boolean;
  revokeOauth: boolean;
  verifyPayout: boolean;
  reviewedExtensions: boolean;
  reviewedStartup: boolean;
}

interface ExposureDiffItem {
  id: string;
  kind: string;
  label: string;
  detail: string;
}

interface BrowserExtensionEntry {
  id: string;
  name: string;
  version?: string;
  enabled: boolean;
  installType?: string;
}

interface ExposureDiff {
  scannedAt: string;
  newStartupEntries: ExposureDiffItem[];
  newScheduledTasks: ExposureDiffItem[];
  suspiciousExtensions: BrowserExtensionEntry[];
}

export interface RecoveryWizardState {
  active: boolean;
  step: number;
  startedAt?: string;
  checklist: RecoveryChecklist;
  latestDiff?: ExposureDiff;
  browserExtensions: BrowserExtensionEntry[];
  lastUndoSummary?: string;
}

interface ExportResult {
  htmlPath: string;
  pdfPath: string;
  message: string;
}

interface RecoveryWizardProps {
  open: boolean;
  onClose: () => void;
}

function toUiChecklist(checklist: RecoveryChecklist): RecoveryChecklistState {
  return {
    rotatePasswords: checklist.rotatePasswords,
    revokeOauth: checklist.revokeOauth,
    verifyPayout: checklist.verifyPayout,
    reviewedExtensions: checklist.reviewedExtensions,
    reviewedStartup: checklist.reviewedStartup,
  };
}

function toRustChecklist(checklist: RecoveryChecklistState): RecoveryChecklist {
  return {
    rotatePasswords: checklist.rotatePasswords,
    revokeOauth: checklist.revokeOauth,
    verifyPayout: checklist.verifyPayout,
    reviewedExtensions: checklist.reviewedExtensions,
    reviewedStartup: checklist.reviewedStartup,
  };
}

export function RecoveryWizard({ open, onClose }: RecoveryWizardProps) {
  const [state, setState] = useState<RecoveryWizardState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUndo, setSelectedUndo] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const next = await invoke<RecoveryWizardState>('get_recovery_wizard_state');
    setState(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const unlisten = listen('recovery-updated', () => {
      void refresh();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [open, refresh]);

  if (!open) return null;

  const step = state?.step ?? 0;
  const checklist = toUiChecklist(
    state?.checklist ?? {
      rotatePasswords: false,
      revokeOauth: false,
      verifyPayout: false,
      reviewedExtensions: false,
      reviewedStartup: false,
    },
  );

  const diffItems = [
    ...(state?.latestDiff?.newStartupEntries ?? []),
    ...(state?.latestDiff?.newScheduledTasks ?? []),
  ];

  async function startWizard(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const next = await invoke<RecoveryWizardState>('start_recovery_wizard');
      setState(next);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function goToStep(nextStep: number): Promise<void> {
    setBusy(true);
    try {
      const next = await invoke<RecoveryWizardState>('set_recovery_wizard_step', {
        step: nextStep,
      });
      setState(next);
    } finally {
      setBusy(false);
    }
  }

  async function saveChecklist(next: RecoveryChecklistState): Promise<void> {
    setBusy(true);
    try {
      const updated = await invoke<RecoveryWizardState>('update_recovery_checklist', {
        checklist: toRustChecklist(next),
      });
      setState(updated);
    } finally {
      setBusy(false);
    }
  }

  async function scanExposure(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      await invoke('request_browser_extension_snapshot');
      const next = await invoke<RecoveryWizardState>('refresh_exposure_diff');
      setState(next);
      setMessage('Exposure scan complete. Browser extensions refresh when the extension pings.');
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function undoSelected(): Promise<void> {
    if (selectedUndo.size === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await invoke<RecoveryWizardState>('undo_exposure_items', {
        itemIds: [...selectedUndo],
      });
      setState(next);
      setSelectedUndo(new Set());
      setMessage(next.lastUndoSummary ?? 'Undo complete.');
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function exportReport(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const result = await invoke<ExportResult>('export_recovery_report');
      setMessage(result.message);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function finishWizard(): Promise<void> {
    setBusy(true);
    try {
      await invoke('close_recovery_wizard');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="recovery-wizard" role="dialog" aria-label="Recovery wizard">
      <div className="recovery-inner">
        <header className="recovery-header">
          <span className="recovery-badge">Recovery kit</span>
          <button type="button" className="ghost" disabled={busy} onClick={() => void finishWizard()}>
            Close
          </button>
        </header>

        <ol className="recovery-steps">
          {RECOVERY_WIZARD_STEPS.map((label, index) => (
            <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}>
              {label}
            </li>
          ))}
        </ol>

        {message && <p className="action-message">{message}</p>}

        {step === 0 && (
          <section>
            <h2>Something feel off?</h2>
            <p className="hint">
              This guided wizard helps you secure accounts, scan for suspicious startup changes, undo
              them if needed, and export a report for platform support.
            </p>
            {!state?.active ? (
              <button type="button" className="primary" disabled={busy} onClick={() => void startWizard()}>
                Start recovery wizard
              </button>
            ) : (
              <button type="button" className="primary" disabled={busy} onClick={() => void goToStep(1)}>
                Continue
              </button>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2>Secure your accounts</h2>
            <ul className="checklist">
              {RECOVERY_CHECKLIST_ITEMS.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checklist[item.id]}
                      onChange={(event) => {
                        void saveChecklist({
                          ...checklist,
                          [item.id]: event.target.checked,
                        });
                      }}
                    />
                    <span>
                      <strong>{item.title}</strong>
                      <span className="hint">{item.detail}</span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer">
                          Open settings
                        </a>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="wizard-nav">
              <button type="button" disabled={busy} onClick={() => void goToStep(0)}>
                Back
              </button>
              <button type="button" className="primary" disabled={busy} onClick={() => void goToStep(2)}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2>Exposure scan</h2>
            <p className="hint">
              Compares startup registry entries and scheduled tasks against the baseline captured when
              you started this wizard.
            </p>
            <button type="button" className="primary" disabled={busy} onClick={() => void scanExposure()}>
              Scan now
            </button>

            {diffItems.length > 0 && (
              <>
                <h3>New startup / tasks</h3>
                <ul className="preview-list">
                  {diffItems.map((item) => (
                    <li key={item.id}>
                      <strong>{item.label}</strong> — {item.detail}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(state?.latestDiff?.suspiciousExtensions.length ?? 0) > 0 && (
              <>
                <h3>Suspicious browser extensions</h3>
                <ul className="preview-list">
                  {state?.latestDiff?.suspiciousExtensions.map((ext) => (
                    <li key={ext.id}>{ext.name}</li>
                  ))}
                </ul>
              </>
            )}

            {(state?.browserExtensions.length ?? 0) > 0 && (
              <p className="hint">{state?.browserExtensions.length} browser extensions captured.</p>
            )}

            <div className="wizard-nav">
              <button type="button" disabled={busy} onClick={() => void goToStep(1)}>
                Back
              </button>
              <button type="button" className="primary" disabled={busy} onClick={() => void goToStep(3)}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2>Undo suspicious changes</h2>
            <p className="hint">Only items that appeared after the baseline can be removed.</p>
            {diffItems.length === 0 ? (
              <p className="hint">No new startup entries or scheduled tasks to undo.</p>
            ) : (
              <ul className="undo-list">
                {diffItems.map((item) => (
                  <li key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedUndo.has(item.id)}
                        onChange={(event) => {
                          setSelectedUndo((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(item.id);
                            else next.delete(item.id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        <strong>{item.label}</strong> ({item.kind})
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="danger"
              disabled={busy || selectedUndo.size === 0}
              onClick={() => void undoSelected()}
            >
              Undo selected
            </button>
            <div className="wizard-nav">
              <button type="button" disabled={busy} onClick={() => void goToStep(2)}>
                Back
              </button>
              <button type="button" className="primary" disabled={busy} onClick={() => void goToStep(4)}>
                Next
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2>Export report</h2>
            <p className="hint">
              Saves HTML and PDF to your Documents/Anti-SE Reports folder and opens the PDF in your
              default viewer for platform support.
            </p>
            <button type="button" className="primary" disabled={busy} onClick={() => void exportReport()}>
              Export report
            </button>
            <div className="wizard-nav">
              <button type="button" disabled={busy} onClick={() => void goToStep(3)}>
                Back
              </button>
              <button type="button" disabled={busy} onClick={() => void finishWizard()}>
                Done
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
