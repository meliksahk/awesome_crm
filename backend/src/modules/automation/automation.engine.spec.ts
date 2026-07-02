// src/modules/automation/automation.engine.spec.ts
import {
  AutomationEngine,
  evaluateConditions,
  interpolate,
} from './automation.engine';
import { AutomationRepository } from './automation.repository';
import { MailService } from '../integrations/mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

describe('evaluateConditions', () => {
  it('koşulsuz kural her zaman eşleşir', () => {
    expect(evaluateConditions(null, { status: 'WON' })).toBe(true);
  });
  it('eşleşen koşul → true', () => {
    expect(
      evaluateConditions({ field: 'status', equals: 'WON' }, { status: 'WON' }),
    ).toBe(true);
  });
  it('eşleşmeyen koşul → false', () => {
    expect(
      evaluateConditions(
        { field: 'status', equals: 'WON' },
        { status: 'OPEN' },
      ),
    ).toBe(false);
  });
});

describe('interpolate', () => {
  it('{{alan}} yer tutucularını doldurur; bilinmeyen alan boş olur', () => {
    expect(
      interpolate('Merhaba {{firstName}} ({{yok}})', { firstName: 'Ali' }),
    ).toBe('Merhaba Ali ()');
  });
});

describe('AutomationEngine.run', () => {
  let engine: AutomationEngine;
  let repo: { findActiveByTrigger: jest.Mock; createDealActivity: jest.Mock };
  let mail: { sendTemplate: jest.Mock };
  let wa: { send: jest.Mock };

  beforeEach(() => {
    repo = {
      findActiveByTrigger: jest.fn(),
      createDealActivity: jest.fn().mockResolvedValue({}),
    };
    mail = { sendTemplate: jest.fn().mockResolvedValue(undefined) };
    wa = { send: jest.fn().mockResolvedValue({ ok: true }) };
    engine = new AutomationEngine(
      repo as unknown as AutomationRepository,
      mail as unknown as MailService,
      wa as unknown as WhatsAppService,
    );
  });

  it('eşleşen kuralda create_activity çalışır', async () => {
    repo.findActiveByTrigger.mockResolvedValue([
      {
        id: 'r1',
        conditions: null,
        actions: [{ type: 'create_activity', note: 'Otomatik not' }],
      },
    ]);
    await engine.run('deal.created', { dealId: 'd1' });
    expect(repo.createDealActivity).toHaveBeenCalledWith(
      'd1',
      'automation',
      'Otomatik not',
    );
  });

  it('koşul eşleşmezse aksiyon çalışmaz', async () => {
    repo.findActiveByTrigger.mockResolvedValue([
      {
        id: 'r2',
        conditions: { field: 'status', equals: 'WON' },
        actions: [{ type: 'create_activity', note: 'x' }],
      },
    ]);
    await engine.run('deal.moved', { dealId: 'd1', status: 'OPEN' });
    expect(repo.createDealActivity).not.toHaveBeenCalled();
  });

  it('send_email aksiyonu MailService.sendTemplate çağırır', async () => {
    repo.findActiveByTrigger.mockResolvedValue([
      {
        id: 'r3',
        conditions: null,
        actions: [{ type: 'send_email', to: 'a@b.com', template: 'deal.won' }],
      },
    ]);
    await engine.run('invoice.paid', { number: 'INV-1' });
    expect(mail.sendTemplate).toHaveBeenCalledWith(
      'a@b.com',
      'deal.won',
      expect.objectContaining({ number: 'INV-1' }),
    );
  });

  it('send_whatsapp: payload telefonuna interpolasyonlu gövde gönderir', async () => {
    repo.findActiveByTrigger.mockResolvedValue([
      {
        id: 'r4',
        conditions: null,
        actions: [{ type: 'send_whatsapp', note: 'Merhaba {{firstName}}!' }],
      },
    ]);
    await engine.run('lead.created', {
      leadId: 'l1',
      firstName: 'Ayşe',
      phone: '+905551112233',
    });
    expect(wa.send).toHaveBeenCalledWith({
      to: '+905551112233',
      body: 'Merhaba Ayşe!',
      leadId: 'l1',
    });
  });

  it('send_whatsapp: telefon yoksa gönderim yapılmaz', async () => {
    repo.findActiveByTrigger.mockResolvedValue([
      {
        id: 'r5',
        conditions: null,
        actions: [{ type: 'send_whatsapp', note: 'x' }],
      },
    ]);
    await engine.run('lead.created', { leadId: 'l2' });
    expect(wa.send).not.toHaveBeenCalled();
  });
});
