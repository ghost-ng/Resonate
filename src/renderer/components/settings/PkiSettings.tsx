import { useSettingsStore } from '../../stores/settings.store';

const inputClass =
  'rounded-card border border-border bg-surface px-3 py-1.5 text-base text-text outline-none focus:border-accent w-full';

export default function PkiSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const enabled = settings.pki_enabled === 'true';

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text">PKI / Certificate Settings</h3>
      <p className="text-sm text-text-muted">
        Configure client certificates for mTLS authentication and custom CA trust
        for corporate networks. Changes take effect on the next API request (some
        environment-level settings require an app restart).
      </p>

      {/* Enable toggle */}
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setSetting('pki_enabled', e.target.checked ? 'true' : 'false')}
          className="accent-accent"
        />
        Enable PKI certificate support
      </label>

      {enabled && (
        <div className="grid grid-cols-[160px_1fr] items-center gap-x-3 gap-y-2">
          {/* Client Certificate */}
          <label className="text-sm text-text-muted">Client Certificate</label>
          <input
            type="text"
            placeholder="/path/to/client.pem or .pfx"
            value={settings.pki_client_cert_path || ''}
            onChange={(e) => setSetting('pki_client_cert_path', e.target.value)}
            className={inputClass}
          />

          {/* Client Key */}
          <label className="text-sm text-text-muted">Client Key</label>
          <input
            type="text"
            placeholder="/path/to/client.key (PEM only)"
            value={settings.pki_client_key_path || ''}
            onChange={(e) => setSetting('pki_client_key_path', e.target.value)}
            className={inputClass}
          />

          {/* PFX Passphrase */}
          <label className="text-sm text-text-muted">PFX Passphrase</label>
          <input
            type="password"
            placeholder="Passphrase for .pfx/.p12 file"
            value={settings.pki_client_pfx_passphrase || ''}
            onChange={(e) => setSetting('pki_client_pfx_passphrase', e.target.value)}
            className={inputClass}
          />

          {/* Custom CA */}
          <label className="text-sm text-text-muted">Custom CA Cert</label>
          <input
            type="text"
            placeholder="/path/to/ca-bundle.pem"
            value={settings.pki_ca_cert_path || ''}
            onChange={(e) => setSetting('pki_ca_cert_path', e.target.value)}
            className={inputClass}
          />

          {/* Use system certs */}
          <label className="text-sm text-text-muted">System Certs</label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={settings.pki_use_system_certs !== 'false'}
              onChange={(e) =>
                setSetting('pki_use_system_certs', e.target.checked ? 'true' : 'false')
              }
              className="accent-accent"
            />
            Use Windows system certificate store
          </label>

          {/* Skip TLS verification */}
          <label className="text-sm text-text-muted">Skip TLS Verify</label>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={settings.pki_reject_unauthorized === 'false'}
                onChange={(e) =>
                  setSetting('pki_reject_unauthorized', e.target.checked ? 'false' : 'true')
                }
                className="accent-accent"
              />
              Disable TLS certificate verification
            </label>
            {settings.pki_reject_unauthorized === 'false' && (
              <span className="text-xs text-red-400">
                Warning: disabling TLS verification is insecure. Use only for development.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
