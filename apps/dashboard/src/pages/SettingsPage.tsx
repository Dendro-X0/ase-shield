import { DEFAULT_EXTENSION_SETTINGS_SYNC, type ExtensionSettingsSync } from '@ase/core';
import { rulePack } from '@ase/rules';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { fetchSettings, saveSettings } from '@/api';
import {
  ActionErrorAlert,
  ConnectionIssueBanner,
} from '@/components/connection-issue-banner';
import { IncidentExportActions } from '@/components/incident-export-actions';
import { PageHeader, PageSkeleton } from '@/components/layout/page-header';
import { SectionCard } from '@/components/section-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCompanionStatus } from '@/context/companion-status';
import { usePoll } from '@/hooks/use-poll';

function parseAllowlist(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function settingsEqual(a: ExtensionSettingsSync, b: ExtensionSettingsSync): boolean {
  return (
    a.overlaysEnabled === b.overlaysEnabled &&
    a.marketplaceOnlyScan === b.marketplaceOnlyScan &&
    a.showJobBrowserHint === b.showJobBrowserHint &&
    a.allowlistedDomains.join('\n') === b.allowlistedDomains.join('\n') &&
    a.disabledRuleIds.slice().sort().join(',') === b.disabledRuleIds.slice().sort().join(',')
  );
}

export function SettingsPage() {
  const poll = usePoll(fetchSettings, 3000);
  const { extensionState } = useCompanionStatus();
  const [draft, setDraft] = useState<ExtensionSettingsSync>(DEFAULT_EXTENSION_SETTINGS_SYNC);
  const [allowlistText, setAllowlistText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!poll.data?.settings || dirty) return;
    setDraft(poll.data.settings);
    setAllowlistText(poll.data.settings.allowlistedDomains.join('\n'));
  }, [poll.data, dirty]);

  const toggleRule = useCallback((ruleId: string, enabled: boolean) => {
    setDirty(true);
    setDraft((current) => {
      const disabled = new Set(current.disabledRuleIds);
      if (enabled) disabled.delete(ruleId);
      else disabled.add(ruleId);
      return { ...current, disabledRuleIds: [...disabled] };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const payload: ExtensionSettingsSync = {
      ...draft,
      allowlistedDomains: parseAllowlist(allowlistText),
    };
    try {
      await saveSettings(payload);
      setDraft(payload);
      setDirty(false);
      setSaveMessage('Saved. Syncing to extension…');
      await poll.refresh();
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }, [allowlistText, draft, poll]);

  useEffect(() => {
    if (!saveMessage || !poll.data) return;
    if (!poll.data.pendingSave && poll.data.settings && settingsEqual(poll.data.settings, draft)) {
      setSaveMessage(null);
    }
  }, [poll.data, saveMessage, draft]);

  const extensionConnected = poll.data?.extensionConnected ?? false;
  const pendingSync = poll.data?.pendingSave ?? false;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Extension preferences synced over localhost. Incident export and beta feedback remain in the extension options page."
        onRefresh={() => void poll.refresh()}
        refreshing={poll.refreshing}
        lastUpdated={poll.lastUpdated}
        loading={poll.loading && !poll.data}
      />

      {poll.loading && !poll.data && <PageSkeleton rows={3} />}

      {(poll.error || (extensionState != null && extensionState !== 'connected')) && (
        <ConnectionIssueBanner
          companionError={poll.error}
          extensionState={poll.error ? null : extensionState ?? undefined}
          onRetry={() => void poll.refresh()}
        />
      )}

      {saveError && <ActionErrorAlert error={saveError} title="Save failed" onDismiss={() => setSaveError(null)} />}

      {saveMessage && (
        <Alert variant="info">
          <Loader2 className="size-4 animate-spin" />
          <AlertTitle>Syncing</AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {pendingSync && !saveMessage && (
        <Alert variant="info">
          <Loader2 className="size-4 animate-spin" />
          <AlertTitle>Pending sync</AlertTitle>
          <AlertDescription>
            Waiting for the extension to apply settings (usually within a few seconds).
          </AlertDescription>
        </Alert>
      )}

      {(!poll.loading || poll.data) && (
        <>
          <SectionCard
            title="Protection"
            description="Control in-page overlays on supported sites."
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="overlays">Risk overlays</Label>
                <p className="text-sm text-muted-foreground">
                  Show warnings when automatic scanning is active. Right-click selected text on any page to
                  analyze without an overlay.
                </p>
              </div>
              <Switch
                id="overlays"
                checked={draft.overlaysEnabled}
                disabled={!extensionConnected}
                onCheckedChange={(checked) => {
                  setDirty(true);
                  setDraft((current) => ({ ...current, overlaysEnabled: checked }));
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <div className="space-y-1">
                <Label htmlFor="marketplace-only">Freelance &amp; B2B sites only</Label>
                <p className="text-sm text-muted-foreground">
                  When on, automatic scan runs only on Gmail, LinkedIn, Upwork, Fiverr, Freelancer.com,
                  WhatsApp Web, and Telegram Web. Turn off to scan all HTTPS sites (forums, Discord web, etc.).
                </p>
              </div>
              <Switch
                id="marketplace-only"
                checked={draft.marketplaceOnlyScan}
                disabled={!extensionConnected}
                onCheckedChange={(checked) => {
                  setDirty(true);
                  setDraft((current) => ({ ...current, marketplaceOnlyScan: checked }));
                }}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Detection rules"
            description="Disable rules you do not want applied. Changes apply after save and sync."
          >
            <ul className="divide-y rounded-lg border">
              {rulePack.map((rule) => {
                const enabled = !draft.disabledRuleIds.includes(rule.id);
                return (
                  <li key={rule.id} className="flex items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      id={`rule-${rule.id}`}
                      className="mt-1 size-4 rounded border-input"
                      checked={enabled}
                      disabled={!extensionConnected}
                      onChange={(event) => toggleRule(rule.id, event.target.checked)}
                    />
                    <label htmlFor={`rule-${rule.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-sm font-medium">
                        {rule.id} — {rule.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{rule.why}</p>
                    </label>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          <SectionCard
            title="Trusted domains"
            description="One domain per line. Link warnings are relaxed for these domains."
          >
            <Textarea
              rows={5}
              placeholder="clientcorp.com"
              value={allowlistText}
              disabled={!extensionConnected}
              onChange={(event) => {
                setDirty(true);
                setAllowlistText(event.target.value);
              }}
            />
          </SectionCard>

          <SectionCard
            title="Job browser profile"
            description="Reminder to keep client work in a separate browser profile."
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="job-hint">Profile reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Keep personal email, banking, and passwords out of the profile you use for unknown
                  clients.
                </p>
              </div>
              <Switch
                id="job-hint"
                checked={draft.showJobBrowserHint}
                disabled={!extensionConnected}
                onCheckedChange={(checked) => {
                  setDirty(true);
                  setDraft((current) => ({ ...current, showJobBrowserHint: checked }));
                }}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Incident export"
            description="Download synced incidents as JSON and HTML for platform support or your records."
          >
            <IncidentExportActions disabled={Boolean(poll.error)} />
            <p className="mt-3 text-xs text-muted-foreground">
              Exports incidents mirrored from the extension to this companion. Nothing is uploaded.
            </p>
          </SectionCard>

          <SectionCard
            title="More options"
            description="Beta feedback and tutorial links live in the extension options page."
          >
            <Button variant="outline" size="sm" asChild>
              <a href="chrome://extensions" target="_blank" rel="noreferrer">
                Open extension options
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Right-click the Anti-SE Shield extension → Options. Or open from{' '}
              <code className="rounded bg-muted px-1 py-0.5">chrome://extensions</code>.
            </p>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void handleSave()}
              disabled={!extensionConnected || !dirty || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save settings'
              )}
            </Button>
            {poll.data?.settings && !dirty && !pendingSync && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Synced with extension
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
