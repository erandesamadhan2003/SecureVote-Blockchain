import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Toggle } from "@radix-ui/react-toggle";
import { Accordion } from "@radix-ui/react-accordion";

/**
 * Admin System Settings page
 * - GET /admin/settings
 * - PUT /admin/settings/:section
 * - GET /admin/logs
 * - POST /admin/backup
 * - POST /admin/settings/reset
 */
export default function SystemSettings() {
  const { isSuperAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [settings, setSettings] = useState({
    general: { platformName: "", description: "", contactEmail: "" },
    blockchain: { networkName: "", rpcUrl: "", rolesContract: "", factoryContract: "", gasPriceLimit: "" },
    security: { jwtExpiresIn: "", maxLoginAttempts: "", enable2FA: false, sessionTimeout: "" },
    notifications: { emailEnabled: false, smsEnabled: false, templates: {} },
    maintenance: { enabled: false, message: "", scheduledAt: "" }
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/settings").catch(() => null);
        if (!mounted) return;
        if (res) {
          // Expect an object grouped by sections; fallbacks applied
          setSettings((prev) => ({ ...prev, ...res }));
        }
      } catch (err) {
        showError(err?.message || "Failed to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [isSuperAdmin, showError]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <h2 className="text-lg font-semibold">System Settings</h2>
          <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
          <div className="mt-4">
            <Button variant="outline" size="small" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const validateEmail = (email) => {
    if (!email) return false;
    // simple regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleFieldChange = (section, key, value) => {
    setSettings((s) => ({ ...s, [section]: { ...(s[section] || {}), [key]: value } }));
  };

  const saveSection = async (section) => {
    setSaving(true);
    try {
      // Basic validation per section
      if (section === "general") {
        const email = settings.general.contactEmail;
        if (email && !validateEmail(email)) throw new Error("Contact email is invalid");
      }
      if (section === "security") {
        const jwt = settings.security.jwtExpiresIn;
        const maxAttempts = settings.security.maxLoginAttempts;
        const session = settings.security.sessionTimeout;
        if (jwt && isNaN(Number(jwt))) throw new Error("JWT expiration must be numeric (in days)");
        if (maxAttempts && isNaN(Number(maxAttempts))) throw new Error("Max login attempts must be a number");
        if (session && isNaN(Number(session))) throw new Error("Session timeout must be numeric (minutes)");
      }
      if (section === "blockchain") {
        // gas price numeric
        const g = settings.blockchain.gasPriceLimit;
        if (g && isNaN(Number(g))) throw new Error("Gas price limit must be numeric (gwei)");
      }

      const payload = settings[section] || {};
      const res = await api.put(`/admin/settings/${section}`, payload);
      showSuccess("Saved");
      // optionally refresh all settings
      const refreshed = await api.get("/admin/settings").catch(() => null);
      if (refreshed) setSettings((s) => ({ ...s, ...refreshed }));
      return res;
    } catch (err) {
      showError(err?.message || "Save failed");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const downloadLogs = async () => {
    try {
      const blob = await api.get("/admin/logs", { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_logs_${Date.now()}.log`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err?.message || "Failed to download logs");
    }
  };

  const clearLogs = async () => {
    if (!window.confirm("Clear system logs? This action cannot be undone.")) return;
    try {
      await api.post("/admin/logs/clear");
      showSuccess("Logs cleared");
    } catch (err) {
      showError(err?.message || "Failed to clear logs");
    }
  };

  const backupDatabase = async () => {
    try {
      const res = await api.post("/admin/backup");
      showSuccess("Backup started");
      return res;
    } catch (err) {
      showError(err?.message || "Backup failed");
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm("Reset all settings to defaults?")) return;
    try {
      await api.post("/admin/settings/reset");
      const refreshed = await api.get("/admin/settings").catch(() => null);
      if (refreshed) setSettings((s) => ({ ...s, ...refreshed }));
      showSuccess("Settings reset to defaults");
    } catch (err) {
      showError(err?.message || "Reset failed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">System Settings</h1>
          <div className="text-sm text-gray-600">Configure platform, blockchain and security settings</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" onClick={() => { api.get("/admin/health").then(() => showSuccess("Health checked")).catch(e => showError(e?.message)); }}>Check Health</Button>
          <Button variant="primary" size="small" onClick={() => saveSection("general")} disabled={saving}>Save All</Button>
        </div>
      </div>

      <Accordion active={activeSection} onChange={(s) => setActiveSection(s)}>
        <Accordion.Item id="general" title="General Settings">
          <div className="space-y-3">
            <Input label="Platform Name" value={settings.general.platformName || ""} onChange={(v) => handleFieldChange("general", "platformName", v)} />
            <Textarea label="Description" value={settings.general.description || ""} onChange={(v) => handleFieldChange("general", "description", v)} />
            <Input label="Contact Email" value={settings.general.contactEmail || ""} onChange={(v) => handleFieldChange("general", "contactEmail", v)} />
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={() => saveSection("general")} disabled={saving}>Save General</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="blockchain" title="Blockchain Settings">
          <div className="space-y-3">
            <Input label="Network Name" value={settings.blockchain.networkName || ""} readOnly />
            <Input label="RPC URL" value={settings.blockchain.rpcUrl || ""} readOnly />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Roles Contract Address" value={settings.blockchain.rolesContract || ""} readOnly />
              <Input label="Factory Contract Address" value={settings.blockchain.factoryContract || ""} readOnly />
            </div>
            <Input label="Gas Price Limit (gwei)" value={settings.blockchain.gasPriceLimit || ""} onChange={(v) => handleFieldChange("blockchain", "gasPriceLimit", v)} />
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={() => saveSection("blockchain")} disabled={saving}>Save Blockchain</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="security" title="Security Settings">
          <div className="space-y-3">
            <Input label="JWT Expiration (days)" value={settings.security.jwtExpiresIn || ""} onChange={(v) => handleFieldChange("security", "jwtExpiresIn", v)} />
            <Input label="Max Login Attempts" value={settings.security.maxLoginAttempts || ""} onChange={(v) => handleFieldChange("security", "maxLoginAttempts", v)} />
            <Input label="Session Timeout (minutes)" value={settings.security.sessionTimeout || ""} onChange={(v) => handleFieldChange("security", "sessionTimeout", v)} />
            <div className="flex items-center gap-3">
              <Toggle checked={!!settings.security.enable2FA} onChange={(val) => handleFieldChange("security", "enable2FA", val)} label="Enable 2FA" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={() => saveSection("security")} disabled={saving}>Save Security</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="notifications" title="Notification Settings">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Toggle checked={!!settings.notifications.emailEnabled} onChange={(val) => handleFieldChange("notifications", "emailEnabled", val)} label="Email Notifications" />
              <Toggle checked={!!settings.notifications.smsEnabled} onChange={(val) => handleFieldChange("notifications", "smsEnabled", val)} label="SMS Notifications" />
            </div>
            <Textarea label="Notification Templates (JSON or text)" value={JSON.stringify(settings.notifications.templates || {}, null, 2)} onChange={(v) => {
              try {
                const parsed = JSON.parse(v);
                handleFieldChange("notifications", "templates", parsed);
              } catch {
                // store as raw string if invalid JSON
                handleFieldChange("notifications", "templates", v);
              }
            }} />
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={() => saveSection("notifications")} disabled={saving}>Save Notifications</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="maintenance" title="Maintenance Mode">
          <div className="space-y-3">
            <Toggle checked={!!settings.maintenance.enabled} onChange={(val) => handleFieldChange("maintenance", "enabled", val)} label="Enable Maintenance Mode" />
            <Textarea label="Maintenance Message" value={settings.maintenance.message || ""} onChange={(v) => handleFieldChange("maintenance", "message", v)} />
            <Input label="Scheduled Maintenance (ISO datetime)" type="datetime-local" value={settings.maintenance.scheduledAt || ""} onChange={(v) => handleFieldChange("maintenance", "scheduledAt", v)} />
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={() => saveSection("maintenance")} disabled={saving}>Save Maintenance</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="logs" title="System Logs">
          <div className="space-y-3">
            <div className="text-sm text-gray-600">View or export recent system logs.</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="small" onClick={() => downloadLogs()}>Download Logs</Button>
              <Button variant="outline" size="small" onClick={() => { api.get("/admin/logs/view").then(r => { /* show modal if implemented */ showSuccess("Logs fetched"); }).catch(e=>showError(e?.message)); }}>View Logs</Button>
              <Button variant="danger" size="small" onClick={() => clearLogs()}>Clear Logs</Button>
            </div>
          </div>
        </Accordion.Item>

        <Accordion.Item id="danger" title="Danger Zone">
          <div className="space-y-3">
            <div className="text-sm text-red-600">Actions here are destructive — use with caution.</div>
            <div className="flex flex-col gap-2">
              <Button variant="danger" size="small" onClick={() => resetDefaults()}>Reset to Defaults</Button>
              <Button variant="outline" size="small" onClick={() => backupDatabase()}>Backup Database</Button>
              <Button variant="outline" size="small" onClick={() => { showError("Restore not implemented in UI"); }}>Restore Database</Button>
            </div>
          </div>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
