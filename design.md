# Wilbur's RewardBook Design System

> 目的：統一 Wilbur's RewardBook 後續所有頁面的視覺語言、版面規則、元件樣式與互動模式。新增或重構頁面時，請先依本文件判斷頁面類型，再套用對應 shell、spacing、card、button、form、modal 與 responsive 規範。

## 1. Design Direction

Wilbur's RewardBook 是給家長/老師管理學生學習、獎勵、評量與目標的工具。整體風格不是企業後台的冷硬 dashboard，而是「明亮、柔和、鼓勵感」的學習管理系統。

設計關鍵字：

- 明亮、清爽、低壓力
- 柔和藍色背景與白色玻璃感容器
- 大圓角、輕陰影、少量漸層
- 管理頁要穩定易掃描，避免過度裝飾
- 學生頁可以更活潑，但仍需保有資料密度
- 行動裝置優先保證可點、可讀、不卡版

目前專案使用：

- Next.js App Router
- Tailwind CSS v4 utility classes
- `app/globals.css` 作為全域 token 與 helper class 來源
- `next-intl` 管理 zh-TW / en 文案
- Material Icons / Material Icons Round 作為主要圖示
- 少量 emoji 作為學生/獎勵/科目識別
- `lucide-react` 已安裝，但現有 UI 主體仍以 Material Icons 為主

## 2. Source Of Truth

設計相關主要檔案：

- `app/globals.css`：全域色彩、字體、玻璃卡片、背景、scrollbar、動畫 helper
- `app/layout.tsx`：字體載入、viewport、Material Icons、Noto Sans TC / Poppins
- `app/components/HomePageClient.tsx`：首頁 shell、學生卡片與全域管理入口
- `app/components/HomeButton.tsx`：全域管理頁回首頁按鈕樣式
- `app/components/Modal.tsx`：通用 modal 基礎樣式
- `app/student/[id]/page.tsx`：學生內頁 glass shell 代表
- `app/student/[id]/components/StudentSidebarHeader.tsx`：學生側欄 header / 快速導覽
- `app/student/[id]/SubjectTabs.tsx`：學生評量頁篩選、toolbar、資料列表 layout
- `app/student/[id]/components/AssessmentRecordCard.tsx`：評量卡片代表
- `app/settings/page.tsx`：全域設定頁 shell
- `app/settings/rewards/page.tsx`：全域設定 tab shell
- `app/student/[id]/rewards/RewardsPageClient.tsx`：獎勵 dashboard / 目標 / 商店風格代表

新增設計 helper 或 token 時，優先放在 `app/globals.css`。不要在單一頁面大量複製微調 class，除非是該頁特有互動。

## 3. Page Inventory

### Canonical Pages

| Route | 類型 | 目前 shell | 統一方向 |
|---|---|---|---|
| `/` | 首頁 | `bg-app-shell`, `max-w-5xl`, 學生卡/管理入口 | 保留，作為首頁標準 |
| `/login` | 登入 | `bg-app-shell`, centered card | 保留，表單欄位需與全域表單一致 |
| `/settings` | 全域管理 | `bg-app-shell` + overlay, `max-w-5xl`, 白色 section | 全域管理頁標準 |
| `/settings/rewards` | 全域管理 tab | `bg-app-shell`, `max-w-6xl`, tab bar + white panel | Tab 管理頁標準 |
| `/settings/initialization` | 全域管理 | 類似 settings | 對齊 settings shell |
| `/settings/ai-logs` | 開發/營運頁 | `bg-slate-50` | 建議改為 settings shell |
| `/reward-types` | 舊全域管理 | `bg-app-shell`, white panel | 逐步收斂到 `/settings/rewards` |
| `/achievement-events` | 舊全域管理 | `bg-app-shell`, white panel | 逐步收斂到 `/settings/rewards` |
| `/major-goals` | 全域/demo 混合 | `bg-app-shell`, white panel | 若保留為正式頁，套用全域管理 shell |
| `/student/[id]` | 學生內頁 | full glass-panel + sidebar + main | 學生頁標準 |
| `/student/[id]/subjects` | 學生內頁 | full glass-panel + sidebar + main | 學生頁標準 |
| `/student/[id]/transactions` | 學生內頁 | full glass-panel + sidebar + main | 學生頁標準 |
| `/student/[id]/rewards` | 學生內頁 | full glass-panel + sidebar + reward dashboard | 學生頁標準，可較活潑 |
| `/student/[id]/print` | 列印 | white A4 document | 獨立列印標準，不套 glass |

### Transitional Pages

這些頁面目前多為早期新增/編輯頁，使用 centered white card。未來重構時應視情況整合為 modal 或套入學生 shell。

| Route | 目前狀態 | 建議 |
|---|---|---|
| `/students/add` | centered form | 保留，但改用全域 page header + white section |
| `/students/[studentId]/edit` | centered form | 保留或移入 modal |
| `/student/[id]/add-assessment` | centered form | 優先改由學生頁 modal 使用 |
| `/student/[id]/assessment/[assessmentId]/edit` | centered form | 優先改由學生頁 modal 使用 |
| `/student/[id]/subjects/add` | centered form | 優先改由科目頁 modal 使用 |
| `/student/[id]/subjects/[subjectId]/edit` | centered form | 優先改由科目頁 modal 使用 |
| `/student/[id]/subjects/[subjectId]/rewards` | centered management | 優先改由科目 modal / drawer 使用 |
| `/student/[id]/transactions/add` | centered form | 優先改由交易頁 modal 使用 |
| `/student/[id]/transactions/[transactionId]/edit` | centered form | 優先改由交易頁 modal 使用 |

### Demo / Dev Pages

以下頁面不作為 production design source of truth：

- `/demo/reward-goals`
- `/demo/settings-rewards`
- `/demo/student-rewards-dashboard`
- `/examples/reward-config-preview`
- `/test-connection`

Demo 頁可以保存靈感，但正式頁規格以本文件與 canonical pages 為準。

## 4. Global Tokens

### Color Tokens

現有 `app/globals.css` 內定義：

```css
--color-primary: #6a99e0;
--color-accent-gold: #F59E0B;
--color-accent-green: #10B981;
--color-accent-purple: #A855F7;
--color-accent-blue: #3B82F6;
--color-accent-rose: #F43F5E;
--color-accent-cyan: #06B6D4;
```

核心色彩：

- Primary: `#6a99e0`, Tailwind class `bg-primary`, `text-primary`
- Student toolbar primary: `#5f94e8`, hover `#5588e0`
- App shell background: `linear-gradient(135deg, #a7d9ef 0%, #c1d9f0 50%, #e0e7f2 100%)`
- Default text: `slate-800`, `slate-700`, `slate-500`, `slate-400`
- Section borders: `slate-100`, `slate-200`, `white/40`, `white/60`
- Success: `emerald` / `green`
- Warning: `amber` / `yellow`
- Danger: `red` / `rose`
- Info: `sky` / `blue`

Usage rules:

- 頁面大面積背景使用 `bg-app-shell`，不要每頁自創不同主色。
- 管理頁主色優先使用 `primary` / `sky` / `purple` / `amber` 作小面積 accent。
- 學生/科目/獎勵可以使用資料自帶 hex color，但要維持低飽和背景與深色文字。
- 大面積不可使用高飽和純色；高飽和色只用在 icon tile、badge、button、progress。
- 文字主要使用 `slate-*`，不要混用大量 `gray-*`。新頁優先使用 `slate`。
- Legacy `gray-*` 可以逐步替換為 `slate-*`。

### Typography

字體由 `app/layout.tsx` 載入：

- Body: `Noto Sans TC`, `Poppins`, sans-serif
- Next font variables: Geist / Geist Mono
- Monospace: Geist Mono or `font-mono`

字級規範：

- Page title: `text-2xl md:text-3xl font-bold text-slate-800`
- Student page main title: `text-2xl font-black tracking-tight text-slate-900`
- Section title: `text-lg sm:text-xl font-bold text-slate-800`
- Card title: `text-base sm:text-lg font-bold text-slate-800`
- Dense item title: `text-sm font-bold text-slate-700`
- Body: `text-sm text-slate-500` or `text-sm text-slate-600`
- Hint/help: `text-xs text-slate-400` or `text-xs text-slate-500`
- Numeric highlights: `text-2xl` to `text-5xl`, `font-black`, color by semantic meaning. Avoid pure black or `text-slate-900` for large display numbers; prefer `text-slate-700`, `text-slate-600`, or a softened semantic color so scores and counters do not overpower the card.

Rules:

- 不使用 negative letter-spacing。
- 不用 viewport width 動態縮放文字。
- 小容器內避免 hero 字級。
- 所有按鈕文字需在 320px 寬度仍能換行或縮短，不可溢出。

### Radius

目前專案偏大圓角：

- Full page glass shell: `rounded-3xl`
- Modal large panels: `rounded-3xl`
- Standard sections/cards: `rounded-2xl`
- Small controls: `rounded-xl`
- Inputs: `rounded-lg` or `rounded-xl`
- Toolbar pills / segmented controls: `rounded-full`
- Icon tiles: `rounded-xl` / `rounded-2xl`

統一規則：

- 全域管理頁 section 用 `rounded-2xl`。
- 學生 dashboard 卡片可用 `rounded-2xl` 或 `rounded-3xl`。
- 表單欄位預設 `rounded-lg`，設定頁可用 `rounded-xl`。
- 不要在小型 dense table/list item 使用過大的 `rounded-3xl`。

### Shadows

常用陰影：

- Page section / modal: `shadow-2xl`
- Normal card: `shadow-sm`, hover `hover:shadow-md` or `hover:shadow-lg`
- Home/global featured card: `shadow-lg`, hover `hover:shadow-2xl`
- Glass panel: custom `box-shadow: 0 20px 40px -8px rgba(0,0,0,0.1)`
- Reward cards: `.reward-card-shadow`
- Store cards: `.store-card`

Rules:

- 同一畫面不要讓所有卡片都 `shadow-2xl`。`shadow-2xl` 留給 page panel、modal、重要浮層。
- List/card items用 `shadow-sm`，hover 時提升一級即可。
- 玻璃背景上使用 `ring-1 ring-white/60` 或 `border-white/50` 讓邊界清楚。

## 5. Page Shells

### 5.1 Home Shell

首頁採用：

```tsx
<div className="min-h-screen bg-app-shell p-4 sm:p-6 md:p-8">
  <div className="max-w-5xl mx-auto">
    ...
  </div>
</div>
```

特徵：

- 頂部右側 action bar：首頁、設定、語言、登出
- 中央大標題與 subtitle
- 學生卡片作為主要入口
- 全域管理入口以 white translucent cards 呈現
- 功能說明卡片使用 `bg-slate-50/95`

新增首頁區塊時：

- 使用 `max-w-5xl`
- 卡片用 `rounded-2xl`, `border`, `bg-white/80` 到 `bg-white/90`
- 避免加入新的 hero 區塊；首頁已經以學生列表為主體

### 5.2 Global Management Shell

適用：

- `/settings`
- `/settings/rewards`
- `/reward-types`
- `/achievement-events`
- `/major-goals`
- `/settings/initialization`

標準：

```tsx
<div className="min-h-screen relative overflow-hidden">
  <div className="absolute inset-0 bg-app-shell" />
  <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent" />
  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20" />

  <div className="relative z-10 p-4 sm:p-6 md:p-8">
    <div className="max-w-5xl mx-auto">
      <PageHeader />
      <main className="space-y-6">...</main>
    </div>
  </div>
</div>
```

Header pattern:

```tsx
<div className="flex justify-between items-center mb-6">
  <div className="flex items-center gap-4">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br ... flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
      <span className="material-icons-outlined text-white text-2xl">settings</span>
    </div>
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800">...</h1>
      <p className="text-slate-500 text-sm">...</p>
    </div>
  </div>
  <HomeButton />
</div>
```

Global page content panel:

```tsx
<section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
  ...
</section>
```

Rules:

- `max-w-5xl` for normal settings pages.
- `max-w-6xl` for tabbed management pages.
- `HomeButton` is the default top-right navigation.
- Header icon is `w-14 h-14`.
- Header title and subtitle are not inside a card.
- Content sections are white cards with clear boundaries.
- Do not add extra floating decorative blobs on global management pages.

### 5.3 Student Workspace Shell

適用：

- `/student/[id]`
- `/student/[id]/subjects`
- `/student/[id]/transactions`
- `/student/[id]/rewards`

標準：

```tsx
<div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800">
  <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">
    <aside className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
      <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
        <StudentSidebarHeader />
      </header>
    </aside>
    <main className="relative z-10 flex-1 min-w-0">
      ...
    </main>
  </div>
</div>
```

Background:

- Default learning pages use `#a7d9ef → #c1d9f0 → #e0e7f2`.
- Transactions/rewards may use a warmer variant, but should stay pastel.
- Existing student pages include two large low-opacity background washes inside the glass panel. Keep them subtle. Do not introduce additional standalone decorative blobs.

Sidebar:

- Width: `lg:w-80`
- Sticky on desktop: `lg:sticky lg:top-0`
- Header: `StudentSidebarHeader`
- Quick navigation uses segmented pills with `bg-white/60`, active `bg-white shadow-sm`.

Main:

- Use `flex-1 min-w-0`.
- Header row uses icon + `text-2xl font-black`.
- Primary actions use `.student-toolbar-primary`, `rounded-full`, `min-h-11`.
- Data cards use `.glass-card` or white translucent cards.

#### 5.3.1 Student Narrow Width Layout Sample

Use this archived sample for student-related pages at phone or narrow panel widths, especially:

- `/student/[id]`
- `/student/[id]/subjects`
- `/student/[id]/transactions`
- `/student/[id]/rewards`
- assessment list/detail surfaces embedded in the student workspace

This pattern is based on the supplied mobile learning-record mockup, adapted to the current Wilbur design system. It is a narrow-width variant of the student shell, not a replacement for the desktop sidebar shell.

Layout anatomy:

- Mobile/narrow student pages must reuse `app/student/[id]/components/StudentFloatingQuickNav.tsx`. It owns the floating student header, quick page links, and switch-student expansion.
- Sticky compact student header: avatar, student name, current page label, one icon menu/action button.
- Optional horizontal quick navigation: scrollable pill row under the header, thin low-contrast scrollbar, no body overflow.
- Desktop/wide pages keep `StudentSidebarHeader` and the existing sidebar shell; hide it only below `lg`.
- Main content padding: `px-5 pt-4 pb-24` on phone, or parent-controlled padding when embedded in the existing student shell.
- Action header: icon + page title on the left, primary action and secondary utilities on the right; wrap at 320px.
- Filter row: compact rounded pills or icon + label button. Dense filters may scroll horizontally.
- Record stack: one column, `space-y-3` or `space-y-4`.
- Pagination: separate from cards, centered, 40px circular buttons.

Assessment card anatomy:

- Container: `bg-white/90`, `rounded-3xl`, `border border-white/70`, `shadow-sm`; use `rounded-2xl` instead if the row becomes dense.
- Subject identity: 4px left border using the subject color, plus an icon tile with the same color at low opacity.
- Main text: subject name, title/unit, short extra line, and a small type badge.
- Score: large right-aligned number, `text-4xl` or `text-5xl`, with a small unit label. Use `text-slate-700` or a softened subject/semantic tone, not full black.
- Attachments: bottom thumbnail strip, `w-10 h-10` or `w-14 h-14`, rounded image tiles.
- Secondary details: date, status, or mistake summary should stay compact; dense raw details belong in modal/edit/debug panels.

Template:

```tsx
export function StudentNarrowRecordLayout() {
  const subjectColor = '#F59E0B'

  return (
    <div className="min-h-screen bg-app-shell text-slate-800 overflow-x-hidden">
      <div className="mx-auto w-full max-w-md">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/60">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-white/70">
                <StudentAvatar />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-800">Student Name</h1>
                <p className="text-xs font-semibold text-primary">Learning Records</p>
              </div>
            </div>
            <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm transition-transform active:scale-95" aria-label="Open menu">
              <span className="material-icons-outlined text-xl">menu</span>
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(26,90,189,0.15)_transparent] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(26,90,189,0.15)]">
            <button className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">Records</button>
            <button className="shrink-0 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-slate-600">Rewards</button>
          </nav>
        </header>

        <main className="space-y-4 px-5 pb-24 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-icons-outlined rounded-xl bg-white/70 p-1.5 text-primary">analytics</span>
              <h2 className="text-2xl font-black text-slate-800">Learning Records</h2>
            </div>
            <div className="ml-auto flex gap-2">
              <button className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/80 px-3 text-sm font-semibold text-primary shadow-sm">
                <span className="material-icons-outlined text-base">print</span>
                Print
              </button>
              <button className="student-toolbar-primary inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold">
                <span className="material-icons-outlined text-base">add_circle</span>
                Add
              </button>
            </div>
          </div>

          <button className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/80 px-4 text-sm font-semibold text-primary shadow-sm">
            <span className="material-icons-outlined text-lg">filter_list</span>
            Filter
          </button>

          <article className="rounded-3xl border border-white/70 border-l-4 bg-white/90 p-5 shadow-sm" style={{ borderLeftColor: subjectColor }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${subjectColor}1A`, color: subjectColor }}>
                  <span className="material-icons-outlined text-3xl">school</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold" style={{ color: subjectColor }}>Subject</h3>
                  <p className="line-clamp-2 text-sm font-medium text-slate-700">Assessment title or unit</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${subjectColor}1A`, color: subjectColor }}>
                    <span className="material-icons-outlined text-sm">fact_check</span>
                    Quiz
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-5xl font-black leading-none text-slate-700">94</span>
                <span className="ml-1 text-xs font-semibold text-slate-500">pts</span>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex gap-2">
                <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <AssessmentThumbnail />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500">2026-05-21</p>
            </div>
          </article>
        </main>
      </div>
    </div>
  )
}
```

Conflict notes from the supplied mockup:

- Do not import the mockup's Tailwind CDN config, generated CSS, or page-level font links. Use local Tailwind, `app/globals.css`, `Noto Sans TC`, and `Poppins`.
- The mockup palette (`#1a5abd`, `#f6faff`, Material surface tokens) is close in mood but conflicts with the current `#6a99e0` primary and `bg-app-shell`. Map it to existing tokens unless a future token refactor is planned.
- The mockup uses `Material Symbols Outlined`; new production UI should prefer the currently documented `material-icons-outlined` / `material-icons-round` classes.
- `rounded-3xl` is acceptable for primary student record cards, but not for every dense list row. Use `rounded-2xl` for compact rows.
- `overflow-x-hidden` should not hide layout bugs. Fix overflowing controls first; only apply it on the narrow shell when horizontal chip rows are intentionally contained.
- Sticky top header and mobile quick nav are allowed only as the mobile/narrow variant. Desktop student pages should keep the sidebar shell.
- Static labels from the mockup must be wired through `next-intl` in production.

Narrow filter row notes:

- When the filter button expands, prefer lightweight horizontal chip rows over a heavy bordered panel.
- Subject chips use icon + label, rounded-full, visible low-friction horizontal scrolling, and a thin 3px scrollbar thumb using primary at low opacity.
- Type chips can be smaller than subject chips; date controls may sit at the end of the type row as calendar icon + previous/current/next pill.
- Do not hide scrollbars for filter rows when discoverability matters. Use thin, subtle scrollbars instead of fully hidden scrollbars.

### 5.4 Centered Form Shell

Current transitional add/edit pages use:

```tsx
<div className="min-h-screen relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br ..." />
  <div className="relative z-10 p-4 sm:p-6 md:p-8">
    <div className="max-w-2xl mx-auto">
      <Header />
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <Form />
      </div>
    </div>
  </div>
</div>
```

Future direction:

- Prefer modal/drawer within the parent workspace for create/edit flows.
- If standalone page is needed, use global management shell header + `bg-white rounded-2xl shadow-2xl`.
- Keep forms max width at `max-w-2xl` unless multi-column configuration needs `max-w-4xl`.

### 5.5 Print Shell

列印頁不使用 glass、gradient、shadow。

Rules:

- White background only.
- A4 width: `max-w-[210mm]`.
- Use `print.css`.
- Hide controls with `.no-print`.
- Preserve color printing via `print-color-adjust: exact`.

## 6. Components

### 6.1 Page Header

Use page headers consistently:

- Left: icon tile + text
- Right: navigation or primary action
- Icon tile size: `w-14 h-14`
- Icon tile radius: `rounded-2xl` or `rounded-full` only when existing page uses circular identity
- Icon tile shadow: `shadow-lg ring-4 ring-white/80`
- Title: `text-2xl md:text-3xl font-bold text-slate-800`
- Subtitle: `text-slate-500 text-sm`

Icon color examples:

- Settings: sky/cyan, `settings`
- Rewards center: amber/pink/purple, `stars`
- Reward types: purple/indigo, `card_giftcard`
- Achievement events: amber/orange, `emoji_events`
- Major goals: sky/cyan, `flag`
- Student records: blue, `assessment`
- Subjects: orange, `menu_book`
- Transactions: green/rose depending context, `account_balance_wallet`
- AI import: green/blue, `smart_toy` or `image_search`

### 6.2 Buttons

#### Global Primary

```tsx
className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity font-semibold text-sm"
```

Use for:

- Save/open primary action in global management pages
- Confirmation buttons in small panels

#### Student Toolbar Primary

```tsx
className="student-toolbar-primary px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
```

Use for:

- Add assessment
- Add subject
- Manage rules
- Reward dashboard primary actions

#### Secondary / Ghost

```tsx
className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
```

Use for cancel/back actions.

#### Icon Buttons

```tsx
className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
```

Rules:

- Use Material Icons where possible.
- Provide `title` / `aria-label` for icon-only buttons.
- Destructive icon hover: `hover:text-red-600 hover:bg-red-50`.

#### Destructive

```tsx
className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
```

Use only for real destructive actions. Place in a danger zone or confirmation modal.

### 6.3 Cards

#### Global Management Card

```tsx
<section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
  ...
</section>
```

Use for settings blocks.

#### Global List Item Card

```tsx
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5">
  ...
</div>
```

Use for reward types, events, rules, templates.

#### Glass Card

```tsx
<div className="glass-card rounded-2xl p-4">
  ...
</div>
```

Use inside student shell only, where the parent is already glass/pastel.

#### Assessment Record Card

Current standard:

- `.glass-card`
- `p-6`
- `rounded-[2.5rem]`
- subject color as left border
- large score on top right
- date bottom right
- images bottom left
- mistake summary block in rose tint

Rules:

- Keep score hierarchy large and right aligned.
- Use subject color for icon, badge, and left border.
- Do not overload the card with full raw details; use modal/edit area for dense info.

#### Empty State

```tsx
<div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
  <span className="material-icons-outlined text-5xl text-slate-300 mb-3">...</span>
  <p className="text-slate-500 text-lg font-medium">...</p>
  <p className="text-slate-400 text-sm mt-1">...</p>
</div>
```

Rules:

- Empty states are calm and useful.
- Use dashed border only for empty/drop/upload states.

### 6.4 Forms

Form label:

```tsx
<label className="block text-sm font-semibold text-slate-700 mb-1.5">
```

Input:

```tsx
className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
```

Legacy forms often use:

```tsx
className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

Future direction:

- Use `slate` instead of `gray` in new work.
- Prefer `rounded-xl` in settings/modals, `rounded-lg` acceptable in dense forms.
- Use `focus:ring-2` with page accent color.
- Hints: `text-xs text-slate-500 mt-1`.
- Required marker: keep `*` next to label.
- Radio card selectors: border-2, selected `border-blue-500 bg-blue-50 shadow-md`.
- Numeric emphasis inputs may use larger text, but should not resize layout.

Form layout:

- Mobile: single column.
- Desktop: use `grid grid-cols-2 gap-4` or `grid grid-cols-3 gap-4`.
- Avoid 5-column selectors on narrow widths unless they have a responsive fallback.
- Touch targets should be at least 44px high.

### 6.5 Modals

Base modal:

- Backdrop: `.modal-backdrop backdrop-blur-md`
- Panel: `bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`
- Header: `p-6 border-b border-gray-200`
- Title: `text-2xl font-bold text-gray-800`
- Body scrolls: `flex-1 overflow-y-auto`

Large visual modals in rewards/settings may use:

- `rounded-3xl`
- `max-w-4xl` or `max-w-2xl`
- `animate-in fade-in zoom-in duration-300`

Rules:

- Modals should trap body scroll.
- Close on Escape where practical.
- Header close button must be icon-only with `aria-label`.
- Do not place full page shells inside modals.
- Avoid nesting cards inside cards; use sections with separators when content is dense.

### 6.6 Tabs And Segmented Controls

Global tab bar:

```tsx
<div className="flex flex-wrap gap-1 mb-6 bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200/60 shadow-sm">
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 min-w-[120px] justify-center">
```

Student filter segmented control:

```tsx
<div className="bg-white/60 backdrop-blur-sm p-1.5 rounded-full border border-white/40 shadow-sm">
  <button className="rounded-full ... active:bg-white active:shadow-sm">
```

Rules:

- Active state is white with shadow.
- Inactive state is slate text with hover white tint.
- Tab labels may hide text on very small mobile if icons remain clear.
- Keep tab controls on one row when possible, allow horizontal scroll for dense filters.

### 6.7 Navigation

Global management pages:

- Use `HomeButton` in top-right.

Home page:

- Use top-right icon/action cluster:
  - home
  - settings
  - language
  - logout

Student pages:

- Use `StudentSidebarHeader`.
- Quick navigation and student switcher live in sidebar.
- On mobile, student pages stack sidebar above content.
- Rewards page currently has a mobile bottom nav. If extended to all student pages, use one shared component.

### 6.8 Images

Assessment images:

- Thumbnails: `w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-sm`
- Use `ImageViewer` for preview.

Uploader:

- Drop/upload area uses dashed border, `rounded-2xl`, `bg-white/60`.
- Preview grid uses small rounded thumbnails.
- Delete is a small red circular icon button.

Rules:

- Store actual product/goal/assessment images visibly; do not hide them behind dark overlays.
- Use `object-contain` for document preview and `object-cover` for decorative/thumbnail cards.

### 6.9 Alerts And Status

Error:

```tsx
className="bg-red-50 border border-red-200 text-red-700 rounded-lg"
```

Success:

```tsx
className="bg-green-50 border border-green-200 text-green-700 rounded-lg"
```

Info:

```tsx
className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg"
```

Warning:

```tsx
className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg"
```

Rules:

- Use icon + short message when possible.
- Error messages should include actionability if user can fix it.
- Long debug output belongs in collapsible/debug panels, not alert banners.

## 7. Layout And Responsive Rules

Breakpoints currently used:

- `sm`: small phone/tablet refinements
- `md`: page padding and 2-column form grids
- `lg`: student shell switches to sidebar + main
- Custom:
  - `min-[360px]` for very small device layout
  - `min-[880px]` / `min-[1192px]` for assessment card grids
  - `min-[1024px]:max-[1191px]` for filter edge cases

Standards:

- Page padding:
  - Home/global: `p-4 sm:p-6 md:p-8`
  - Student workspace: `p-4 md:p-10`
- Main widths:
  - Normal global page: `max-w-5xl`
  - Wide global tab page: `max-w-6xl`
  - Student workspace: `max-w-7xl`
  - Simple form: `max-w-2xl`
  - Print: `max-w-[210mm]`
- Student shell:
  - mobile: sidebar/header first, main below
  - desktop: `lg:flex-row`, sidebar `lg:w-80`
- Cards:
  - grids should fall back to one column on mobile
  - avoid fixed pixel widths except stable icon/thumbnail tiles
- Horizontal overflow:
  - acceptable for dense filter chips
  - never acceptable for page body or primary form fields

## 8. Icons

Primary icon system:

- Material Icons Outlined
- Material Icons Round

Use:

```tsx
<span className="material-icons-outlined text-lg">add</span>
```

Rules:

- Buttons should use an icon when the command is common: add, save, edit, delete, close, print, upload, settings.
- Use icon + text for primary actions.
- Use icon-only for compact list actions, with `title` or `aria-label`.
- Emoji is acceptable for:
  - student avatars
  - reward type identity
  - legacy subject icon compatibility
- For new operational UI, prefer Material Icons over emoji.

Common icon mappings:

- home: `home`
- settings: `settings`
- add: `add` / `add_circle`
- edit: `edit`
- delete: `delete_outline`
- close: `close`
- assessment: `assessment`
- subject/book: `menu_book`
- rewards: `stars`, `diamond`, `card_giftcard`
- goals: `flag`, `track_changes`
- events: `emoji_events`
- transactions: `account_balance_wallet`
- print: `print`
- upload/image: `photo_camera`, `image_search`
- AI: `smart_toy`

## 9. Motion And Interaction

Current motion language:

- Hover lift: `hover:-translate-y-0.5`, `hover:-translate-y-1`, `hover:scale-105`
- Active press: `active:scale-95` or `active:scale-[0.99]`
- Card hover: shadow increase
- Progress bars: `transition-all`, `.progress-bar-fill`
- Modal: fade/slide/zoom in
- Loading: `animate-pulse` skeletons and icon spinner

Rules:

- Motion should confirm interactivity, not distract.
- Use `duration-200` or `duration-300` for most UI.
- Do not animate large page layout shifts.
- Filters and segmented controls should update instantly with subtle active state.
- Drag handles can show pulse/indicator, but keep drag previews simple.

## 10. Content And Language

Project is bilingual.

Rules:

- All user-facing text should go through `next-intl` unless it is temporary debug/developer text.
- zh-TW is the primary tone:
  - warm but concise
  - action labels short
  - avoid overly technical wording in normal UI
- English should be clear, not word-for-word if it becomes awkward.
- Debug panels may include technical labels such as `Validated JSON`, but ordinary users should see natural labels.

Labels:

- Primary action verbs: 新增, 儲存, 編輯, 刪除, 確認, 取消, 開啟
- Status: 已設定, 已啟用, 未設定, 處理中, 完成, 失敗
- Empty hints should tell the next action.

## 11. Accessibility

Minimum expectations:

- Buttons and links must be keyboard reachable.
- Icon-only buttons must have `aria-label` or `title`.
- Color cannot be the only signal for state; include icon/text/badge.
- Use visible focus rings on inputs and controls.
- Maintain contrast:
  - body text: `slate-700` or darker
  - hint text: `slate-500` minimum on white
  - avoid `white/50` text on light glass
- Touch targets should be at least `min-h-10`, preferred `min-h-11`.
- Avoid fixed height containers that clip translated labels.
- Modals should prevent background scroll and support Escape close.

## 12. Implementation Rules For Future Work

Do:

- Reuse `bg-app-shell`, `glass-panel`, `glass-card`, `student-toolbar-primary`.
- Use page shell by route type before inventing custom layout.
- Use `slate-*` text colors for new UI.
- Use Material Icons for tool buttons.
- Keep management pages calm and scan-friendly.
- Keep student pages warmer and more rewarding, but still structured.
- Use `rounded-2xl` / `rounded-3xl` consistently.
- Use semantic alert colors.
- Store new shared visual primitives in `app/globals.css` or a shared component.

Avoid:

- Creating one-off background gradients per page.
- Adding new decorative blobs/orbs. Existing low-opacity student shell washes may remain until refactor.
- Nesting cards inside cards for entire page sections. Use separators, bands, or list rows instead.
- Mixing `gray-*` and `slate-*` in new components.
- Using huge shadows on every item.
- Using emoji as a replacement for operational icons.
- Hardcoding zh-TW text in new production UI when translations should be used.
- Adding hover lift to non-clickable elements.
- Allowing text overflow inside buttons/cards on mobile.
- Using invalid Tailwind color classes such as `bg-f7b2c9`; use `bg-[#f7b2c9]/30` or CSS variables instead.

## 13. Refactor Priorities

1. Consolidate page shells:
   - Extract `GlobalManagementShell`
   - Extract `GlobalPageHeader`
   - Extract `StudentWorkspaceShell`

2. Normalize forms:
   - Replace legacy `gray-*` form classes with `slate-*`
   - Standardize inputs to `rounded-xl border-slate-200`
   - Replace standalone add/edit pages with modal/drawer flows where natural

3. Normalize action buttons:
   - Use `.student-toolbar-primary` on student workspace actions
   - Use `bg-primary rounded-xl` on global management actions
   - Use one destructive button style

4. Normalize cards:
   - Use global list card for management lists
   - Use glass cards only inside student shell
   - Reduce nested card appearance in dense settings panels

5. Clean CSS:
   - Remove duplicated `.glass-nav`
   - Replace legacy invalid/custom Tailwind class names
   - Move repeated emoji-to-Material mapping to one helper
   - Remove debug fetch probes from UI components when no longer needed

6. Mobile pass:
   - Check 320px, 360px, 390px, 768px, 1024px, 1280px
   - Ensure no horizontal page overflow
   - Ensure filter rows and form grids wrap correctly

## 14. Quick Recipes

### New Global Management Page

```tsx
export default function Page() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-app-shell" />
      <div className="absolute inset-0 bg-gradient-to-tl from-white/50 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-100/30 to-sky-200/20" />

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg ring-4 ring-white/80 flex-shrink-0">
                <span className="material-icons-outlined text-white text-2xl">settings</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Page Title</h1>
                <p className="text-slate-500 text-sm">Short description</p>
              </div>
            </div>
            <HomeButton />
          </div>

          <main className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
              ...
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
```

### New Student Workspace Page

```tsx
export default function StudentFeaturePage() {
  return (
    <div className="min-h-screen p-4 md:p-10 flex justify-center items-start text-gray-800 bg-app-shell">
      <div className="w-full max-w-7xl glass-panel rounded-3xl p-6 md:p-10 min-h-[90vh] relative overflow-hidden flex flex-col lg:flex-row">
        <aside className="relative z-20 lg:w-80 lg:flex-shrink-0 mb-6 lg:mb-0 lg:mr-8 p-4 lg:p-0 rounded-2xl lg:rounded-none lg:min-w-0">
          <header className="flex flex-col lg:items-start lg:sticky lg:top-0 w-full lg:min-w-0">
            <StudentSidebarHeader />
          </header>
        </aside>

        <main className="relative z-10 flex-1 min-w-0">
          <div className="mb-6 flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="material-icons-outlined text-3xl text-blue-600 drop-shadow-sm flex-shrink-0">assessment</span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Feature Title</h1>
                <p className="text-sm text-slate-500">Feature subtitle</p>
              </div>
            </div>
            <button className="student-toolbar-primary px-6 py-2.5 min-h-11 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <span className="material-icons-outlined text-lg">add_circle</span>
              Add
            </button>
          </div>

          <div className="space-y-4">
            ...
          </div>
        </main>
      </div>
    </div>
  )
}
```

### Standard Settings Section

```tsx
<section className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 sm:p-7">
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Section Title</h2>
      <p className="text-sm text-slate-500">Section description</p>
    </div>
    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity font-semibold text-sm">
      Action
      <span className="material-icons-outlined text-base">arrow_forward</span>
    </button>
  </div>
</section>
```

## 15. Acceptance Checklist

Before shipping a new or refactored page:

- [ ] Page uses the correct shell for its route type.
- [ ] Background uses `bg-app-shell` or the approved student pastel variant.
- [ ] Header follows icon tile + title + subtitle pattern.
- [ ] Primary actions use the correct global/student button style.
- [ ] Cards use approved radius, border, shadow, and background.
- [ ] Forms use consistent labels, inputs, focus rings, and hints.
- [ ] Empty/loading/error states are present.
- [ ] Mobile width has no horizontal body overflow.
- [ ] Text does not overflow buttons/cards.
- [ ] Icon-only buttons have labels.
- [ ] zh-TW/en text is translated through `next-intl`.
- [ ] No new one-off color palette or decorative blobs were introduced.
- [ ] Print pages remain white and print-friendly.
