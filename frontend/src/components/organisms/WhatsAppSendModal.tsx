'use client';
// src/components/organisms/WhatsAppSendModal.tsx — WhatsApp metin gönderim modalı.
// Lead/teklif/fatura ekranlarından ön-dolu açılır; sonuç (gönderildi/başarısız) gösterilir.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Modal } from '../molecules/Modal';
import { PhoneNumberField } from '../atoms/PhoneNumberField';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';

export function WhatsAppSendModal({
  initialPhone,
  initialBody,
  leadId,
  contactId,
  onClose,
}: {
  initialPhone?: string;
  initialBody?: string;
  leadId?: string;
  contactId?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [body, setBody] = useState(initialBody ?? '');
  const [result, setResult] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () =>
      unwrap<{ ok: boolean; message: { error?: string | null } }>(
        (
          await api.post('/whatsapp/send', {
            to: phone,
            body,
            leadId,
            contactId,
          })
        ).data,
      ),
    onSuccess: (r) => {
      setResult(
        r.ok ? t('wa.sent') : `${t('wa.failed')}: ${r.message.error ?? ''}`,
      );
      if (r.ok) setTimeout(onClose, 900);
    },
    onError: () => setResult(t('wa.notConnected')),
  });

  return (
    <Modal title={t('wa.sendVia')} onClose={onClose}>
      <div className="space-y-3">
        <PhoneNumberField
          id="wa-phone"
          label={t('field.phone')}
          value={phone}
          onChange={setPhone}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            {t('wa.message')}
          </label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button
          onClick={() => send.mutate()}
          disabled={send.isPending || !phone || !body.trim()}
        >
          {send.isPending ? '…' : t('wa.send')}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        {result && <span className="text-sm text-gray-600">{result}</span>}
      </div>
    </Modal>
  );
}
