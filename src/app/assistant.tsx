import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewInstance } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Mark } from '@/components/Icon';
import { Button, Chip, ChipRow, Field, IconButton, Panel, Press, Row, Txt, haptic } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { applyAction, askAssistant, assistantConfigured, assistantProviderName, toProposals } from '@/lib/assistant';
import { computeInsights, type Insight } from '@/lib/domain/insights';
import { hhmm, parseDateTime } from '@/lib/dates';
import { money, shortDate } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useStore, live } from '@/store';
import { useUI } from '@/store/ui';
import { ease } from '@/theme/motion';
import { layout, radius, space, usePalette } from '@/theme';
import type { ActionProposal, AssistantMessage } from '@/types/models';

function Thinking() {
  const p = usePalette();
  const { t } = useT();
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700, easing: ease.inOut }), -1, true);
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: space.s, alignItems: 'center' }, s]}>
      <Mark size={16} color={p.muted} accent={p.accent} />
      <Txt muted>{t('as.thinking')}</Txt>
    </Animated.View>
  );
}

function ProposalCard({ msg, prop }: { msg: AssistantMessage; prop: ActionProposal }) {
  const p = usePalette();
  const { t, lang } = useT();
  const prefs = useStore((s) => s.prefs);
  const patch = useStore((s) => s.patchMessage);
  const a = prop.action;
  const setStatus = (status: ActionProposal['status']) =>
    patch(msg.id, { proposals: msg.proposals?.map((x) => (x.id === prop.id ? { ...x, status } : x)) });

  let detail = '';
  switch (a.kind) {
    case 'create_task':
      detail = `${a.title}${a.due ? ` · ${shortDate(a.due, lang, prefs.dateFormat)}` : ''}`;
      break;
    case 'create_event':
    case 'move_event': {
      const s = parseDateTime(a.start);
      detail = `${'title' in a ? a.title : (useStore.getState().events.find((e) => e.id === a.eventId)?.title ?? '')} · ${shortDate(a.start, lang, prefs.dateFormat)} ${hhmm(s)}–${hhmm(parseDateTime(a.end))}`;
      break;
    }
    case 'add_transaction':
      detail = `${a.type === 'income' ? '+' : '−'}${money(Math.round(a.amount * 100), prefs.currency, lang)} · ${a.description}`;
      break;
    case 'create_goal':
      detail = `${a.title}${a.milestones?.length ? ` · ${a.milestones.length} ${t('ed.milestones').toLowerCase()}` : ''}`;
      break;
    case 'create_habit':
      detail = a.title;
      break;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      layout={LinearTransition.duration(200)}
      style={{ backgroundColor: p.panel, borderRadius: radius.row, padding: space.l, gap: space.m }}
    >
      <View style={{ gap: 2 }}>
        <Txt v="meta" muted>
          {t('as.proposed')} · {t(`as.act.${a.kind}`)}
        </Txt>
        <Txt v="label">{detail}</Txt>
      </View>
      {prop.status === 'pending' ? (
        <Row gap={space.s}>
          <Button
            compact
            label={t('as.apply')}
            onPress={() => {
              const ok = applyAction(a);
              haptic(ok ? 'success' : 'light');
              setStatus(ok ? 'applied' : 'dismissed');
            }}
          />
          <Button compact kind="ghost" label={t('as.dismiss')} onPress={() => setStatus('dismissed')} />
        </Row>
      ) : (
        <Row gap={6}>
          <Icon name={prop.status === 'applied' ? 'check' : 'close'} size={16} color={prop.status === 'applied' ? p.positive : p.muted} />
          <Txt v="meta" color={prop.status === 'applied' ? p.positive : p.muted}>
            {prop.status === 'applied' ? t('as.applied') : t('as.dismissed')}
          </Txt>
        </Row>
      )}
    </Animated.View>
  );
}

function InsightRow({ i, onAsk }: { i: Insight; onAsk?: (q: string) => void }) {
  const p = usePalette();
  const { t } = useT();
  const text = t(i.k, { ...i.p, cat: i.p?.cat ? t(`txc.${i.p.cat}`).toLowerCase() : '' });
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.accent, marginTop: 8 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Txt>{text}</Txt>
        <Row gap={space.l}>
          <Press onPress={() => router.push(i.href as never)} hitSlop={8}>
            <Txt v="label" color={p.muted}>
              {t('c.more')}
            </Txt>
          </Press>
          {i.ask && onAsk && (
            <Press onPress={() => onAsk(i.ask!)} hitSlop={8}>
              <Txt v="label" color={p.muted}>
                {t('as.ask')}
              </Txt>
            </Press>
          )}
        </Row>
      </View>
    </View>
  );
}

export default function Assistant() {
  const p = usePalette();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const state = useStore();
  const ctx = useUI((s) => s.assistantContext);
  const consent = state.prefs.assistant.consent;
  const signedIn = state.user.mode === 'cloud';
  const conversations = live(state.assistant_conversations).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [convId, setConvId] = useState<string | null>(conversations[0]?.id ?? null);
  const messages = state.messages.filter((m) => m.conversationId === convId);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const insights = useMemo(() => computeInsights(state), [state]);

  const canChat = assistantConfigured && signedIn && consent;

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !canChat) return;
    let cid = convId;
    if (!cid) {
      const c = state.create('assistant_conversations', { title: q.slice(0, 60), context: ctx ?? undefined });
      cid = c.id;
      setConvId(cid);
    } else state.update('assistant_conversations', cid, {});
    state.addMessage({ conversationId: cid, role: 'user', text: q });
    setDraft('');
    setBusy(true);
    try {
      const r = await askAssistant(cid, ctx);
      useStore.getState().addMessage({ conversationId: cid, role: 'assistant', text: r.text, proposals: toProposals(r.actions) });
    } catch (e) {
      useStore.getState().addMessage({
        conversationId: cid,
        role: 'assistant',
        text: t('as.error', { msg: e instanceof Error ? e.message : String(e) }),
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ['as.s1', 'as.s2', 'as.s3', 'as.s4'];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.ground }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          paddingTop: insets.top + space.s,
          paddingHorizontal: layout.gutter,
          paddingBottom: space.m,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.m,
        }}
      >
        <IconButton icon="close" label={t('a11y.close')} onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt v="title">{t('as.title')}</Txt>
          {ctx && (
            <Txt v="meta" muted>
              {t('as.context', { module: t(ctx === 'home' ? 'tab.home' : `tab.${ctx}`) })}
            </Txt>
          )}
        </View>
        {canChat && (
          <>
            <IconButton icon="history" label={t('as.history')} onPress={() => setHistoryOpen(true)} />
            <IconButton icon="plus" label={t('as.new')} onPress={() => setConvId(null)} />
          </>
        )}
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: space.xxl, gap: space.xl }}
      >
        {/* Deterministic observations from the person's own data — work without AI */}
        <View style={{ gap: space.m }}>
          <Txt v="section">{t('as.detected')}</Txt>
          <Panel style={{ gap: space.l }}>
            {insights.length ? (
              insights.slice(0, 4).map((i) => <InsightRow key={i.id} i={i} onAsk={canChat ? (q) => void send(q) : undefined} />)
            ) : (
              <Txt muted>{t('as.noInsights')}</Txt>
            )}
          </Panel>
        </View>

        {!assistantConfigured ? (
          <Panel style={{ gap: space.s }}>
            <Txt v="section">{t('as.offTitle')}</Txt>
            <Txt muted>{t('as.offBody')}</Txt>
          </Panel>
        ) : !signedIn ? (
          <Panel style={{ gap: space.m }}>
            <Txt>{t('as.needAccount')}</Txt>
            <Button label={t('pf.signIn')} kind="raised" compact onPress={() => router.push('/auth')} style={{ alignSelf: 'flex-start' }} />
          </Panel>
        ) : !consent ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <Panel style={{ gap: space.m }}>
              <Txt v="section">{t('as.consentTitle')}</Txt>
              <Txt muted>{t('as.consentBody', { provider: assistantProviderName || t('as.providerFallback') })}</Txt>
              <Row gap={space.s}>
                <Button
                  compact
                  label={t('as.consentAccept')}
                  onPress={() => state.setPrefs({ assistant: { ...state.prefs.assistant, consent: true } })}
                />
                <Button compact kind="ghost" label={t('as.consentLater')} onPress={() => router.back()} />
              </Row>
            </Panel>
          </Animated.View>
        ) : (
          <View style={{ gap: space.l }}>
            {messages.map((m) =>
              m.role === 'user' ? (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.duration(220)}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '85%',
                    backgroundColor: p.primary,
                    borderRadius: 20,
                    borderBottomRightRadius: 6,
                    paddingHorizontal: space.l,
                    paddingVertical: space.m,
                  }}
                >
                  <Txt color={p.onPrimary}>{m.text}</Txt>
                </Animated.View>
              ) : (
                <Animated.View key={m.id} entering={FadeIn.duration(260)} style={{ gap: space.m }}>
                  <Row gap={space.s} style={{ alignItems: 'flex-start' }}>
                    <View style={{ paddingTop: 2 }}>
                      <Mark size={16} color={p.muted} accent={p.accent} />
                    </View>
                    <Txt v="bodyL" style={{ flex: 1 }} color={m.error ? p.negative : p.text}>
                      {m.text}
                    </Txt>
                  </Row>
                  {m.proposals?.map((pr) => (
                    <ProposalCard key={pr.id} msg={m} prop={pr} />
                  ))}
                </Animated.View>
              ),
            )}
            {busy && <Thinking />}
            {!messages.length && !busy && (
              <View style={{ gap: space.m }}>
                <ChipRow wrap>
                  {suggestions.map((s) => (
                    <Chip key={s} label={t(s)} onPress={() => void send(t(s))} />
                  ))}
                </ChipRow>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {canChat && (
        <View
          style={{
            paddingHorizontal: layout.gutter,
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            paddingTop: space.s,
            flexDirection: 'row',
            gap: space.s,
            alignItems: 'flex-end',
          }}
        >
          <View style={{ flex: 1 }}>
            <Field
              placeholder={t('as.placeholder')}
              value={draft}
              onChangeText={setDraft}
              multiline
              onSubmitEditing={() => void send(draft)}
              submitBehavior="submit"
              style={{ minHeight: undefined, maxHeight: 120, paddingVertical: 14 }}
            />
          </View>
          <IconButton icon="send" label={t('as.send')} onPress={() => void send(draft)} size={52} />
        </View>
      )}

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: space.l, gap: space.s }}>
          <Txt v="title">{t('as.history')}</Txt>
          {conversations.map((c) => (
            <Press
              key={c.id}
              onPress={() => {
                setConvId(c.id);
                setHistoryOpen(false);
              }}
              style={{
                minHeight: 52,
                justifyContent: 'center',
                paddingHorizontal: space.m,
                borderRadius: radius.row,
                backgroundColor: c.id === convId ? p.panel : 'transparent',
              }}
            >
              <Txt numberOfLines={1}>{c.title}</Txt>
              <Txt v="meta" muted>
                {c.updatedAt.slice(0, 10)}
              </Txt>
            </Press>
          ))}
        </ScrollView>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
