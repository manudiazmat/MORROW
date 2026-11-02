import { useState } from 'react';
import { View } from 'react-native';

import { Field, Row, Segmented, Toggle, Txt } from '@/components/ui';
import { todayKey } from '@/lib/dates';
import { money, parseAmount } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore } from '@/store';
import { space } from '@/theme';
import type { ExpenseCategory, Priority, Subscription, Transaction, TxCategory, TxType } from '@/types/models';
import { EXPENSE_CATS, INCOME_CATS } from '../constants';
import { ChoiceField, DateField } from '../pickers';
import { EditorScaffold } from './Scaffold';

const centsToInput = (c: number | undefined, lang: 'es' | 'en') =>
  c == null ? '' : lang === 'es' ? (c / 100).toFixed(2).replace('.', ',') : (c / 100).toFixed(2);

export function TxEditor({ id, type: initialType }: { id?: string; type?: TxType }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.transactions.find((x) => x.id === id));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const [type, setType] = useState<TxType>(existing?.type ?? initialType ?? 'expense');
  const [amount, setAmount] = useState(centsToInput(existing?.amount, lang));
  const [category, setCategory] = useState<TxCategory>(existing?.category ?? 'food');
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [description, setDescription] = useState(existing?.description ?? '');
  const [account, setAccount] = useState(existing?.account ?? '');
  const [error, setError] = useState<string | null>(null);
  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;

  const save = () => {
    const cents = parseAmount(amount);
    if (!cents) {
      setError(t('c.invalidAmount'));
      return false;
    }
    const cat = (cats as string[]).includes(category) ? category : cats[0];
    const data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      amount: cents,
      type,
      category: cat,
      date,
      description: description.trim() || t(`txc.${cat}`),
      account,
      subscriptionId: existing?.subscriptionId ?? null,
    };
    if (existing) update('transactions', existing.id, data);
    else create('transactions', data);
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editTx') : t('ed.newTx')}
      onSave={save}
      onDelete={existing ? () => remove('transactions', existing.id) : undefined}
      deleteName={existing?.description}
    >
      <Segmented
        value={type}
        onChange={(v) => {
          setType(v);
          setCategory(v === 'expense' ? 'food' : 'salary');
        }}
        options={[
          { value: 'expense', label: t('ed.expense') },
          { value: 'income', label: t('ed.income') },
        ]}
      />
      <Field
        large
        label={t('ed.amount')}
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setError(null);
        }}
        keyboardType="decimal-pad"
        placeholder={t('qa.amountPh')}
        error={error}
        autoFocus={!existing}
        prefix={type === 'expense' ? '−' : '+'}
      />
      <ChoiceField
        label={t('c.category')}
        value={category}
        onChange={setCategory}
        options={cats.map((c) => ({ value: c as TxCategory, label: t(`txc.${c}`) }))}
      />
      <DateField label={t('c.date')} value={date} onChange={(v) => v && setDate(v)} />
      <Field label={t('ed.description')} value={description} onChangeText={setDescription} placeholder={t('qa.descPh')} />
      <Field label={`${t('ed.account')} (${t('c.optional')})`} value={account} onChangeText={setAccount} />
    </EditorScaffold>
  );
}

export function SavingEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.financial_goals.find((x) => x.id === id));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(centsToInput(existing?.target, lang));
  const [current, setCurrent] = useState(centsToInput(existing?.current ?? 0, lang));
  const [dueDate, setDueDate] = useState<string | null>(existing?.dueDate ?? null);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) {
      setError(t('c.required'));
      return false;
    }
    const tg = parseAmount(target);
    const cur = parseAmount(current || '0') ?? 0;
    if (!tg) {
      setAmountError(t('c.invalidAmount'));
      return false;
    }
    if (existing) {
      const diff = cur - existing.current;
      update('financial_goals', existing.id, {
        name: name.trim(),
        target: tg,
        current: cur,
        dueDate,
        priority,
        contributions: diff ? [...existing.contributions, { date: todayKey(), amount: diff }] : existing.contributions,
      });
    } else
      create('financial_goals', {
        name: name.trim(),
        target: tg,
        current: cur,
        dueDate,
        priority,
        contributions: cur ? [{ date: todayKey(), amount: cur }] : [],
      });
  };

  return (
    <EditorScaffold
      title={existing ? t('ed.editSaving') : t('ed.newSaving')}
      onSave={save}
      onDelete={existing ? () => remove('financial_goals', existing.id) : undefined}
      deleteName={existing?.name}
    >
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <Field
        label={t('ed.target')}
        value={target}
        onChangeText={(v) => {
          setTarget(v);
          setAmountError(null);
        }}
        keyboardType="decimal-pad"
        error={amountError}
      />
      <Field label={t('ed.current')} value={current} onChangeText={setCurrent} keyboardType="decimal-pad" />
      <DateField label={`${t('ed.dueDate')} (${t('c.optional')})`} value={dueDate} onChange={setDueDate} allowEmpty />
      <View style={{ gap: space.s }}>
        <Txt v="label" muted>
          {t('c.priority')}
        </Txt>
        <Segmented
          small
          value={String(priority)}
          onChange={(v) => setPriority(Number(v) as Priority)}
          options={[1, 2, 3].map((n) => ({ value: String(n), label: t(`prio.${n}`) }))}
        />
      </View>
    </EditorScaffold>
  );
}

export function ContributeEditor({ id }: { id: string }) {
  const { t } = useT();
  const goal = useStore((s) => s.financial_goals.find((x) => x.id === id));
  const contribute = useStore((s) => s.contribute);
  const prefs = useStore((s) => s.prefs);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!goal) return null;
  return (
    <EditorScaffold
      title={t('fin.contributeTitle', { name: goal.name })}
      saveLabel={t('fin.contribute')}
      onSave={() => {
        const c = parseAmount(amount);
        if (!c) {
          setError(t('c.invalidAmount'));
          return false;
        }
        contribute(goal.id, c);
      }}
    >
      <Txt muted num>
        {money(goal.current, prefs.currency, prefs.language)} / {money(goal.target, prefs.currency, prefs.language)}
      </Txt>
      <Field
        large
        label={t('ed.amount')}
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setError(null);
        }}
        keyboardType="decimal-pad"
        placeholder={t('qa.amountPh')}
        error={error}
        autoFocus
        prefix="+"
      />
    </EditorScaffold>
  );
}

export function BudgetEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.budgets.find((x) => x.id === id));
  const budgets = useStore((s) => s.budgets.filter((b) => !b.deletedAt));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const free = EXPENSE_CATS.filter((c) => c === existing?.category || !budgets.some((b) => b.category === c));
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? free[0] ?? 'other');
  const [limit, setLimit] = useState(centsToInput(existing?.monthlyLimit, lang));
  const [error, setError] = useState<string | null>(null);
  return (
    <EditorScaffold
      title={existing ? t(`txc.${existing.category}`) : t('ed.newBudget')}
      onDelete={existing ? () => remove('budgets', existing.id) : undefined}
      deleteName={existing ? t(`txc.${existing.category}`) : undefined}
      onSave={() => {
        const c = parseAmount(limit);
        if (!c) {
          setError(t('c.invalidAmount'));
          return false;
        }
        if (existing) update('budgets', existing.id, { category, monthlyLimit: c });
        else create('budgets', { category, monthlyLimit: c });
      }}
    >
      <ChoiceField
        label={t('c.category')}
        value={category}
        onChange={setCategory}
        options={free.map((c) => ({ value: c, label: t(`txc.${c}`) }))}
      />
      <Field
        large
        label={t('ed.limit')}
        value={limit}
        onChangeText={(v) => {
          setLimit(v);
          setError(null);
        }}
        keyboardType="decimal-pad"
        placeholder={t('qa.amountPh')}
        error={error}
      />
    </EditorScaffold>
  );
}

export function SubEditor({ id }: { id?: string }) {
  const { t, lang } = useT();
  const existing = useStore((s) => s.subscriptions.find((x) => x.id === id));
  const create = useStore((s) => s.create);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(existing?.amount, lang));
  const [cycle, setCycle] = useState<Subscription['cycle']>(existing?.cycle ?? 'monthly');
  const [nextDate, setNextDate] = useState(existing?.nextDate ?? todayKey());
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? 'subscriptions');
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  return (
    <EditorScaffold
      title={existing ? t('ed.editSub') : t('ed.newSub')}
      onDelete={existing ? () => remove('subscriptions', existing.id) : undefined}
      deleteName={existing?.name}
      onSave={() => {
        if (!name.trim()) {
          setError(t('c.required'));
          return false;
        }
        const c = parseAmount(amount);
        if (!c) {
          setAmountError(t('c.invalidAmount'));
          return false;
        }
        const data = { name: name.trim(), amount: c, cycle, nextDate, category, active };
        if (existing) update('subscriptions', existing.id, data);
        else create('subscriptions', data);
      }}
    >
      <Field
        label={t('ed.name')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(null);
        }}
        error={error}
        autoFocus={!existing}
      />
      <Field
        large
        label={t('ed.amount')}
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setAmountError(null);
        }}
        keyboardType="decimal-pad"
        placeholder={t('qa.amountPh')}
        error={amountError}
      />
      <Segmented
        value={cycle}
        onChange={setCycle}
        options={[
          { value: 'monthly', label: t('ed.monthly') },
          { value: 'yearly', label: t('ed.yearly') },
        ]}
      />
      <DateField label={t('ed.nextDate')} value={nextDate} onChange={(v) => v && setNextDate(v)} />
      <ChoiceField
        label={t('c.category')}
        value={category}
        onChange={setCategory}
        options={EXPENSE_CATS.map((c) => ({ value: c, label: t(`txc.${c}`) }))}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label">{t('goals.status.active')}</Txt>
        <Toggle value={active} onChange={setActive} label={t('goals.status.active')} />
      </Row>
    </EditorScaffold>
  );
}
