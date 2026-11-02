import { useLocalSearchParams } from 'expo-router';

import { BudgetEditor, ContributeEditor, SavingEditor, SubEditor, TxEditor } from '@/features/editors/finance';
import { GoalEditor } from '@/features/editors/goal';
import { EventEditor, HabitEditor, LeisureEditor, TaskEditor } from '@/features/editors/plan';
import type { DimensionKey, TxType } from '@/types/models';

/** One modal route for every editor: /edit/<kind>?id=… (edit) or without id (create). */
export default function Edit() {
  const q = useLocalSearchParams<{
    kind: string;
    id?: string;
    date?: string;
    title?: string;
    type?: string;
    goalId?: string;
    dimension?: string;
  }>();
  switch (q.kind) {
    case 'task':
      return <TaskEditor id={q.id} title={q.title} goalId={q.goalId} />;
    case 'event':
      return <EventEditor id={q.id} date={q.date} />;
    case 'habit':
      return <HabitEditor id={q.id} />;
    case 'leisure':
      return <LeisureEditor id={q.id} />;
    case 'tx':
      return <TxEditor id={q.id} type={q.type as TxType | undefined} />;
    case 'saving':
      return <SavingEditor id={q.id} />;
    case 'contribute':
      return q.id ? <ContributeEditor id={q.id} /> : null;
    case 'budget':
      return <BudgetEditor id={q.id} />;
    case 'sub':
      return <SubEditor id={q.id} />;
    case 'goal':
      return <GoalEditor id={q.id} title={q.title} dimension={q.dimension as DimensionKey | undefined} />;
    default:
      return null;
  }
}
