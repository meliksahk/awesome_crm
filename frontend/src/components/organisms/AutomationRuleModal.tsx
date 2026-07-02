'use client';
// src/components/organisms/AutomationRuleModal.tsx — otomasyon kuralı oluştur/düzenle/sil.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Modal } from '../molecules/Modal';
import { FormField } from '../molecules/FormField';
import { Button } from '../atoms/Button';

export interface RuleAction {
  type: 'create_activity' | 'send_email' | 'send_whatsapp' | 'log';
  note?: string;
  template?: string;
  to?: string;
}
export interface Rule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  conditions: { field: string; equals: string } | null;
  actions: RuleAction[];
}

const TRIGGERS = [
  'deal.created',
  'deal.moved',
  'lead.created',
  'invoice.paid',
  'invoice.issued',
];
const ACTION_TYPES: RuleAction['type'][] = [
  'create_activity',
  'send_email',
  'send_whatsapp',
  'log',
];

export function AutomationRuleModal({
  rule,
  onClose,
  onSaved,
}: {
  rule: Rule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isNew = rule === null;
  const [name, setName] = useState(rule?.name ?? '');
  const [trigger, setTrigger] = useState(rule?.trigger ?? TRIGGERS[0]);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [condField, setCondField] = useState(rule?.conditions?.field ?? '');
  const [condEquals, setCondEquals] = useState(rule?.conditions?.equals ?? '');
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions?.length ? rule.actions : [{ type: 'create_activity', note: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setAction = (i: number, patch: Partial<RuleAction>) =>
    setActions(actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const buildActions = () =>
    actions.map((a) => {
      if (a.type === 'send_email')
        return { type: a.type, template: a.template || undefined, to: a.to || undefined };
      if (a.type === 'send_whatsapp')
        return { type: a.type, note: a.note || undefined, to: a.to || undefined };
      return { type: a.type, note: a.note || undefined };
    });

  const conditions = () =>
    condField.trim() && condEquals.trim()
      ? { field: condField.trim(), equals: condEquals.trim() }
      : undefined;

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (isNew) {
        await api.post('/automation/rules', {
          name: name.trim(),
          trigger,
          conditions: conditions(),
          actions: buildActions(),
        });
      } else {
        await api.patch(`/automation/rules/${rule.id}`, {
          isActive,
          conditions: conditions(),
          actions: buildActions(),
        });
      }
      onSaved();
      onClose();
    } catch {
      setErr(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!rule) return;
    if (!confirm(`${t('common.delete')}?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api.delete(`/automation/rules/${rule.id}`);
      onSaved();
      onClose();
    } catch {
      setErr(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? t('auto.newTitle') : `${t('auto.editPrefix')}: ${rule.name}`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          id="ar-name"
          label={`${t('field.name')} ${isNew ? '*' : t('cf.immutable')}`}
          value={name}
          disabled={!isNew}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            {t('auto.trigger')} {isNew ? '*' : t('cf.immutable')}
          </label>
          <select
            value={trigger}
            disabled={!isNew}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          >
            {TRIGGERS.map((tr) => (
              <option key={tr} value={tr}>
                {tr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isNew && (
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {t('common.active')}
        </label>
      )}

      <p className="mb-1 mt-4 text-sm font-medium text-gray-600">
        {t('auto.condition')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <FormField
          id="ar-cf"
          label={t('auto.field')}
          placeholder={t('auto.condFieldPh')}
          value={condField}
          onChange={(e) => setCondField(e.target.value)}
        />
        <FormField
          id="ar-ce"
          label={t('auto.equals')}
          placeholder={t('auto.condEqualsPh')}
          value={condEquals}
          onChange={(e) => setCondEquals(e.target.value)}
        />
      </div>

      <p className="mb-1 mt-4 text-sm font-medium text-gray-600">
        {t('auto.actions')}
      </p>
      {actions.map((a, i) => (
        <div key={i} className="mb-2 rounded-md border border-gray-100 p-2">
          <div className="flex items-center gap-2">
            <select
              value={a.type}
              onChange={(e) =>
                setAction(i, { type: e.target.value as RuleAction['type'] })
              }
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {ACTION_TYPES.map((at) => (
                <option key={at} value={at}>
                  {at}
                </option>
              ))}
            </select>
            {actions.length > 1 && (
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => setActions(actions.filter((_, idx) => idx !== i))}
              >
                {t('auto.remove')}
              </Button>
            )}
          </div>
          {a.type === 'send_email' ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                placeholder={t('auto.templatePh')}
                value={a.template ?? ''}
                onChange={(e) => setAction(i, { template: e.target.value })}
              />
              <input
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                placeholder={t('auto.toPh')}
                value={a.to ?? ''}
                onChange={(e) => setAction(i, { to: e.target.value })}
              />
            </div>
          ) : a.type === 'send_whatsapp' ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                placeholder={t('wa.message') + ' — {{firstName}}…'}
                value={a.note ?? ''}
                onChange={(e) => setAction(i, { note: e.target.value })}
              />
              <input
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                placeholder={t('auto.sendWhatsappHint')}
                value={a.to ?? ''}
                onChange={(e) => setAction(i, { to: e.target.value })}
              />
            </div>
          ) : (
            <input
              className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              placeholder={t('auto.notePh')}
              value={a.note ?? ''}
              onChange={(e) => setAction(i, { note: e.target.value })}
            />
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        className="text-xs"
        onClick={() => setActions([...actions, { type: 'log', note: '' }])}
      >
        {t('auto.addAction')}
      </Button>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button disabled={busy || (isNew && !name.trim())} onClick={save}>
            {busy ? '…' : t('common.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
        {!isNew && (
          <Button variant="danger" disabled={busy} onClick={del}>
            {t('common.delete')}
          </Button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </Modal>
  );
}
