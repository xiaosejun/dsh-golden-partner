window.__ModuleLoader__.load({
  id: 'dsh-golden-partner',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'goldenPartner'
    const PANEL_ID = 'golden-partner'

    const zh = {
      'panel.label': '黄金搭档',
      title: 'deepseek黄金搭档',
      subtitle:
        '在免费网页版里把逻辑聊清楚，回到本机由 Agent 动手 —— 省的是讨论的 token，不是执行的质量。',
      'step1.title': '第一步 打开免费版',
      'step1.body':
        '按 Ctrl+T 新建一个 Browser 页，打开 chat.deepseek.com。右栏是与 Agent 的对话，左栏就是这一页，不用来回切窗口。',
      'step2.title': '第二步 拿一份上下文包',
      'step2.body':
        '让 Agent 跑 handoff_pack：它会把仓库目录、技术栈、关键文件摘录写成一份 markdown，你整段贴给免费版讨论。',
      'step3.title': '第三步 把执行简报交回来',
      'step3.body':
        '免费版按六段格式给出方案后，把简报粘到下面的框里核对，再复制成一句指令发回给 Agent。',
      'brief.label': '免费版执行简报（先粘这里核对，再复制指令）',
      'brief.placeholder':
        '## 目标\n…\n## 动哪里\n…\n## 约束\n…\n## 验收\n…\n## 不要做\n…\n## 怎么验证\n…',
      copyPack: '复制：出上下文包的指令',
      copyRun: '复制：执行计划的指令',
      copyTemplate: '复制：免费版开场白',
      copyBrief: '复制：这份简报的待执行指令',
      copied: '已复制，去粘贴吧',
      copyFailed: '复制失败，请手动选中文字复制',
      format: '六段格式：目标 / 动哪里 / 约束 / 验收 / 不要做 / 怎么验证',
      tools:
        'handoff_pack 与 plan_intake 是 Agent 侧的工具；本页只负责把你手里的文字变成一句能直接发出去的指令。',
    }

    const en = {
      'panel.label': 'Golden Partner',
      title: 'deepseek golden partner',
      subtitle:
        'Talk the logic through in the free web chat, then let the agent do the work here — you save discussion tokens, not execution quality.',
      'step1.title': 'Step 1 Open the free chat',
      'step1.body':
        'Press Ctrl+T for a new Browser tab and open chat.deepseek.com. The agent conversation stays on the right, this page on the left.',
      'step2.title': 'Step 2 Get a context pack',
      'step2.body':
        'Ask the agent to run handoff_pack: it writes the repository layout, stack and key excerpts into one markdown file you can paste into the free chat.',
      'step3.title': 'Step 3 Bring the brief back',
      'step3.body':
        'Paste the six-section brief below to check it, then copy it as one instruction back to the agent.',
      'brief.label': 'Execution brief from the free chat',
      'brief.placeholder':
        '## Goal\n…\n## Where\n…\n## Constraints\n…\n## Acceptance\n…\n## Do not\n…\n## How to verify\n…',
      copyPack: 'Copy: context pack request',
      copyRun: 'Copy: run the plan',
      copyTemplate: 'Copy: free chat opener',
      copyBrief: 'Copy: send this brief',
      copied: 'Copied — paste it',
      copyFailed: 'Copy failed, select the text manually',
      format: 'Six sections: goal / where / constraints / acceptance / do not / how to verify',
      tools:
        'handoff_pack and plan_intake are agent-side tools; this page only turns your words into one sendable instruction.',
    }

    const TEMPLATE_ZH =
      '我在用 DeepSeek Harness 干活，需要你按下面的格式给我一份执行简报，我拿回本机照做。\n' +
      '只给方案：不要写代码补丁，不要猜测我仓库里没给你的文件。\n\n' +
      '## 目标\n（一句话说清要得到什么结果）\n' +
      '## 动哪里\n（文件路径 + 改什么，按重要性排序）\n' +
      '## 约束\n（不能动的东西、必须保留的行为、性能或兼容要求）\n' +
      '## 验收\n（可验证的通过标准，尽量具体）\n' +
      '## 不要做\n（明显会跑偏的事，防止我执行时过度发挥）\n' +
      '## 怎么验证\n（命令、检查步骤、看什么输出）\n\n' +
      '要求：500 字以内，不写客套话，路径用仓库相对路径。'

    const PROMPT_PACK =
      '让 deepseek黄金搭档 出一份上下文包：焦点是「在这里写你要解决的问题」，用 handoff_pack 生成，包含目录结构、技术栈与脚本、重点文件摘录、既有约定，然后只告诉我文件路径。'

    const PROMPT_RUN =
      '读我剪贴板里的计划，用 plan_intake 落成 plans/ 下的计划文件，然后按计划执行；和计划冲突的地方先停下问我，不要自己改需求。'

    const COLORS = {
      text: 'var(--dsw-alias-label-primary)',
      muted: 'var(--dsw-alias-label-secondary)',
      faint: 'var(--dsw-alias-label-tertiary)',
      card: 'var(--dsw-alias-bg-layer-2)',
      border: 'var(--dsw-alias-border-l2)',
      primary: 'var(--dsw-alias-button-primary-fill)',
      primaryHover: 'var(--dsw-alias-button-primary-hover)',
      onPrimary: 'var(--dsw-alias-label-primary-foreground)',
      page: 'var(--dsw-alias-bg-base)',
    }

    let translate = (key) => key

    function wrapBrief(text) {
      const body = text.trim()
      if (body === '') return PROMPT_RUN
      return (
        '按下面这份执行简报干活：\n\n' +
        body +
        '\n\n先复述你要遵守的 3~5 条约束，确认没有歧义后开始执行；缺的信息一次问清。'
      )
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
          return true
        }
      } catch {}
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(area)
        return ok
      } catch {
        return false
      }
    }

    function GoldenPartnerIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18
      const active = props.active === true
      return h(
        'svg',
        {
          viewBox: '0 0 36 36',
          width: size,
          height: size,
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('rect', {
          x: 4,
          y: 7,
          width: 18,
          height: 13,
          rx: 4,
          fill: active ? 'currentColor' : 'var(--dsw-alias-brand-primary)',
        }),
        h('rect', {
          x: 14,
          y: 16,
          width: 18,
          height: 13,
          rx: 4,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          opacity: 0.85,
        }),
      )
    }

    function Step(props) {
      return h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '22px 1fr',
            gap: 10,
            padding: '14px 16px',
            background: COLORS.card,
            border: '1px solid ' + COLORS.border,
            borderRadius: 'var(--dsw-radius-lg)',
          },
        },
        h(
          'div',
          { style: { fontSize: 13, fontWeight: 600, color: COLORS.faint, paddingTop: 1 } },
          String(props.index),
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          h('div', { style: { fontSize: 13.5, fontWeight: 600, color: COLORS.text } }, props.title),
          h('div', { style: { fontSize: 12.5, lineHeight: 1.65, color: COLORS.muted } }, props.body),
        ),
      )
    }

    function CopyButton(props) {
      const [state, setState] = React.useState('idle')
      const primary = props.primary === true
      const onClick = React.useCallback(() => {
        const text = typeof props.text === 'function' ? props.text() : props.text
        copyText(text).then(function (ok) {
          setState(ok ? 'done' : 'failed')
          setTimeout(function () {
            setState('idle')
          }, 1800)
        })
      }, [props.text])
      const label =
        state === 'done' ? props.copiedLabel : state === 'failed' ? props.failedLabel : props.label
      return h(
        'button',
        {
          type: 'button',
          onClick: onClick,
          style: {
            appearance: 'none',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: 12.5,
            fontWeight: 500,
            padding: '7px 12px',
            borderRadius: 'var(--dsw-radius-md)',
            border: primary ? '1px solid transparent' : '1px solid ' + COLORS.border,
            background: primary ? COLORS.primary : 'transparent',
            color: primary ? COLORS.onPrimary : COLORS.text,
          },
          onMouseEnter: function (event) {
            event.currentTarget.style.background = primary ? COLORS.primaryHover : COLORS.card
          },
          onMouseLeave: function (event) {
            event.currentTarget.style.background = primary ? COLORS.primary : 'transparent'
          },
        },
        label,
      )
    }

    function GoldenPartnerPage() {
      const [brief, setBrief] = React.useState('')
      const t = function (key) {
        return translate(key)
      }
      return h(
        'div',
        {
          style: {
            height: '100%',
            overflowY: 'auto',
            padding: '32px 28px 48px',
            background: COLORS.page,
            color: COLORS.text,
            boxSizing: 'border-box',
          },
        },
        h(
          'div',
          {
            style: {
              maxWidth: 760,
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            },
          },
          h(
            'div',
            { style: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' } },
            t('title'),
          ),
          h(
            'div',
            { style: { fontSize: 13, lineHeight: 1.7, color: COLORS.muted } },
            t('subtitle'),
          ),
          h(Step, { index: 1, title: t('step1.title'), body: t('step1.body') }),
          h(Step, { index: 2, title: t('step2.title'), body: t('step2.body') }),
          h(Step, { index: 3, title: t('step3.title'), body: t('step3.body') }),
          h(
            'div',
            {
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: '14px 16px',
                background: COLORS.card,
                border: '1px solid ' + COLORS.border,
                borderRadius: 'var(--dsw-radius-lg)',
              },
            },
            h(CopyButton, {
              label: t('copyPack'),
              text: PROMPT_PACK,
              copiedLabel: t('copied'),
              failedLabel: t('copyFailed'),
            }),
            h(CopyButton, {
              label: t('copyRun'),
              text: PROMPT_RUN,
              copiedLabel: t('copied'),
              failedLabel: t('copyFailed'),
            }),
            h(CopyButton, {
              label: t('copyTemplate'),
              text: TEMPLATE_ZH,
              copiedLabel: t('copied'),
              failedLabel: t('copyFailed'),
            }),
          ),
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h(
              'div',
              { style: { fontSize: 12.5, fontWeight: 600, color: COLORS.text } },
              t('brief.label'),
            ),
            h('textarea', {
              value: brief,
              onChange: function (event) {
                setBrief(event.target.value)
              },
              placeholder: t('brief.placeholder'),
              spellCheck: false,
              style: {
                minHeight: 168,
                resize: 'vertical',
                padding: '12px 14px',
                font: 'inherit',
                fontSize: 12.5,
                lineHeight: 1.7,
                color: COLORS.text,
                background: COLORS.card,
                border: '1px solid ' + COLORS.border,
                borderRadius: 'var(--dsw-radius-md)',
                outline: 'none',
                boxSizing: 'border-box',
              },
            }),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
              h(CopyButton, {
                label: t('copyBrief'),
                text: function () {
                  return wrapBrief(brief)
                },
                copiedLabel: t('copied'),
                failedLabel: t('copyFailed'),
                primary: true,
              }),
              h(
                'span',
                { style: { fontSize: 11.5, color: COLORS.faint } },
                t('format'),
              ),
            ),
          ),
          h(
            'div',
            {
              style: {
                fontSize: 11.5,
                lineHeight: 1.7,
                color: COLORS.faint,
                borderTop: '1px solid ' + COLORS.border,
                paddingTop: 12,
              },
            },
            t('tools'),
          ),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        // Every side effect is owned by ctx.effect so an HMR re-apply disposes
        // the previous dictionaries and slot entries instead of double-binding.
        const own = function (run, label) {
          if (typeof ctx.effect === 'function') return ctx.effect(run, label)
          return run()
        }
        own(function () { return ctx.locale.register(NS, { zh: zh, en: en }) }, 'golden-partner: locale')
        const bound = ctx.locale.bind(NS)
        translate = function (key) {
          const value = bound(key)
          return value === key ? key : value
        }
        own(function () {
          return ctx.slots.inject('sidebar.panellist', function () {
            return ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: 30,
                label: function () {
                  return bound('panel.label')
                },
                locale: NS,
              },
              GoldenPartnerIcon,
            )
          })
        }, 'golden-partner: sidebar entry')
        own(function () {
          return ctx.slots.inject('main', function () {
            return ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, GoldenPartnerPage)
          })
        }, 'golden-partner: panel page')
      },
    }
  },
})
