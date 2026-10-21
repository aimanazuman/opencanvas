# OpenCanvas whiteboard UI spec

Reference: Figma web app (light neutral canvas, hairlines, compact chrome, floating panels). Stack found: React 18, CRA (react-scripts 5), Tailwind 3.3 (`frontend/tailwind.config.js` is empty, `theme.extend: {}`), `lucide-react` 0.294, global CSS in `frontend/src/index.css`. No dark mode exists (no `dark:` class anywhere); this spec is light only and uses CSS variables so dark can be added later. Do not add features; this is a restyle.

## 1. Hue decision
- Accent: azure blue, hue about 209 degrees (`#0A66C2`). Stays 60+ degrees away from indigo (about 239) and violet.
- Secondary accent for warm highlights: coral/orange, hue about 18 (`#C2410C`).
- Allowed hue families: neutral grey, azure, teal, green, amber, orange, red. Forbidden: indigo, violet, purple, lavender, magenta, fuchsia, and also pink/rose (reads magenta). Tailwind `rose` currently used for Quiz must become orange.
- Currently all gradients are blue-to-purple. Remove gradients from UI chrome entirely (256 `from-/to-/bg-gradient` hits in 55 files). Flat fills only. The only allowed gradient is the skeleton shimmer, in neutrals.

## 2. Tokens

### Colour (CSS variables in `:root`, mapped in Tailwind)
| Role | Token | Hex | Contrast note |
|---|---|---|---|
| Canvas (page bg) | `--canvas` | `#F5F5F5` | |
| Dot colour on canvas | `--canvas-dot` | `#D4D4D4` | decorative |
| Surface (panels, cards, bars) | `--surface` | `#FFFFFF` | |
| Surface hover | `--surface-hover` | `#F2F2F2` | |
| Surface pressed | `--surface-press` | `#E8E8E8` | |
| Hairline border | `--line` | `#E2E2E2` | decorative |
| Control border (inputs) | `--line-strong` | `#8A8A8A` | 3.4:1 on white (needs 3:1) |
| Text primary | `--ink` | `#1A1A1A` | 17.4:1 white, 16.0:1 canvas |
| Text secondary | `--ink-2` | `#5C5C5C` | 6.7:1 white, 6.1:1 canvas |
| Text muted/placeholder | `--ink-3` | `#6B6B6B` | 5.3:1 white, 4.9:1 canvas |
| Accent | `--accent` | `#0A66C2` | 5.7:1 on white (white text on accent also 5.7:1) |
| Accent hover | `--accent-hover` | `#0856A3` | 7.3:1 on white |
| Accent tint (selected bg) | `--accent-tint` | `#E6F1FB` | accent text on tint 5.0:1 |
| Accent border (selection) | `--accent` | same | 5.7:1, passes 3:1 non-text |
| Danger | `--danger` | `#C62828` | 5.6:1 white |
| Danger tint | `--danger-tint` | `#FDECEC` | |
| Success | `--success` | `#1A7F37` | 5.1:1 white |
| Success tint | `--success-tint` | `#E8F5EC` | |
| Warning text | `--warning` | `#8A5A00` | 5.9:1 white |
| Warning tint | `--warning-tint` | `#FFF4DB` | |
| Info | uses accent | | |
| Scrim (modal backdrop) | `--scrim` | `rgba(26,26,26,0.40)` | no blur |

Contrast figures were computed with the WCAG relative-luminance formula (for example accent L=0.1347, so 1.05/0.1847 = 5.68). Status is never colour alone: always an icon plus a text label.

Chart / category palette (replaces indigo, purple, violet, rose; order of use):
`#0A66C2` azure, `#0F8B8D` teal, `#D9480F` orange, `#B7791F` amber, `#2F9E44` green, `#5C6B7A` slate. Add a text label or pattern in charts; never hue alone.
Board type badges (BoardHeader `TYPE_BADGES`, ArchivePage): Course Material = azure tint/ink; Student Notes = green; Study Planner = teal; Kanban = amber; Quiz = orange. Tint backgrounds `50`-level, text `700`-level of same hue (all above 4.5:1; verify when picked from Tailwind scales).

### Tailwind theme snippet (`frontend/tailwind.config.js`)
```js
const accent = {
  50:'#EAF3FC',100:'#D3E6F8',200:'#A8CDF0',300:'#74AEE5',400:'#3F8AD4',
  500:'#1F76CB',600:'#0A66C2',700:'#0856A3',800:'#0A4580',900:'#0B3866',
};
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas:'var(--canvas)', surface:'var(--surface)', line:'var(--line)',
        'line-strong':'var(--line-strong)',
        ink:{ DEFAULT:'var(--ink)', 2:'var(--ink-2)', 3:'var(--ink-3)' },
        accent:{ ...accent, DEFAULT:'var(--accent)', tint:'var(--accent-tint)' },
        // SAFETY NET: remap forbidden families so un-migrated classes cannot render purple.
        // Remove these three lines once the codemod in section 8 is done.
        indigo: accent, purple: accent, violet: accent,
      },
      fontFamily: { sans:['Inter Variable','Inter','system-ui','Segoe UI','Roboto','sans-serif'],
                    mono:['ui-monospace','SFMono-Regular','Menlo','Consolas','monospace'] },
      fontSize: { '2xs':['11px','16px'], xs:['12px','16px'], sm:['13px','20px'],
                  base:['14px','20px'], lg:['16px','24px'], xl:['20px','28px'], '2xl':['24px','32px'] },
      borderRadius: { sm:'2px', DEFAULT:'4px', md:'4px', lg:'6px', xl:'8px' },
      boxShadow: {
        float:'0 1px 3px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06)',
        pop:'0 4px 12px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.08)',
        modal:'0 8px 24px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.08)',
      },
    },
  },
};
```
Safety net note: remapping `indigo/purple/violet` to the azure scale makes all ~562 existing usages non-purple immediately. Where a purple was a deliberate second category colour, two things will then look identical; fix those in the file pass.

### Type
- Font: Inter (variable), licence SIL OFL 1.1, self-hosted via npm `@fontsource-variable/inter` imported in `src/index.js` (no Google Fonts request; privacy and offline). Fallback system stack above. Mono: system monospace only.
- Scale (px / line-height): 11/16 labels and badges, 12/16 secondary and table headers, 13/20 default UI text (buttons, inputs, menus, tables), 14/20 board content body, 16/24 section titles, 20/28 page title, 24/32 only on Home/Login hero. Weights 400, 500, 600 only. No `font-bold` on UI chrome (the current `text-2xl font-bold` logo becomes 14/600).
- Letter-spacing 0, except 11px uppercase labels +0.04em.

### Spacing, radius, borders, icons
- Spacing base 4 px. Chrome uses 4, 8, 12, 16. Panel inner padding 12. Never above 24 inside chrome.
- Radius: 2 px badges/tags, 4 px buttons/inputs/menu items/cards, 6 px floating panels and menus, 8 px modals max. Remove `rounded-2xl`, `rounded-3xl`; `rounded-full` only on avatars and status dots.
- Borders: 1 px `--line` everywhere; no 2 px borders except focus/selection.
- Icons: keep `lucide-react`, set size 16 px in chrome (20 px in empty states), `strokeWidth={1.5}`. No emoji. Set globally by wrapper or per-import defaults.
- Touch: control height 32 px on desktop; below 768 px every control is min 44x44 px hit area (use padding or `before:` pseudo hit area; visual stays compact).

### Focus and selection
- Focus visible: `outline: 2px solid var(--accent); outline-offset: 2px;` replacing `#6366f1` in `index.css`. On dark/accent fills use `outline-color:#fff` plus 1 px accent offset ring.
- Replace every `focus:ring-indigo-500` with `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`.
- Selected object (card/block/row): 1 px accent border plus 4 small square handles (6x6 px, white fill, 1 px accent border) at corners only for the currently active board block if the editor already supports selection; otherwise just the border and `--accent-tint` background. Do not add resize behaviour.

### Motion
150 ms for hover/press/toggle, 200 ms for panels and menus, 250 ms max for modal; easing `cubic-bezier(.2,0,0,1)`. Only opacity and 4 px translate. Delete `scroll-reveal`, `stagger-*`, `fadeInUp` 0.35 s, splash scale bounce. Wrap all animation classes in:
```css
@media (prefers-reduced-motion: reduce){ *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important} }
```
Also remove `html{scroll-behavior:smooth}` unless inside `no-preference`.

## 3. Canvas background
- `body` and the app content area: `background-color: var(--canvas)` plus a dot grid:
  `background-image: radial-gradient(var(--canvas-dot) 1px, transparent 1px); background-size: 16px 16px;`
  (radial-gradient is the one permitted use, for the dots.) Dots at 16 px; 1 px radius; fixed to the scroll container so it feels like a surface, not a texture.
- Dots show only on workspace areas (dashboard, board pages, template galleries). Forms (login, signup, settings, admin tables) sit on flat `--canvas` with no dots; reading surfaces (tables, text blocks) are `--surface` panels so text never lies on dots.
- Board editor pages: the canvas is the scrollable area between chrome; blocks are white, 1 px hairline, 4 px radius, `shadow-float` only on hover or while dragged.

## 4. Shell layout
Desktop (>= 1024 px):
- Top bar: 40 px high, `--surface`, bottom 1 px `--line`. Left: logo mark 16 px plus "OpenCanvas" 13/600 text-ink (no white-on-gradient). Centre/left: nav items as 28 px high text buttons (13/500, `ink-2`; active = `accent-tint` bg, accent text, plus `aria-current="page"`; no underline animation, delete `.nav-link-active`). Right: notifications, user menu (24 px avatar, initials, `ink` on `#E2E2E2`).
- Left tool rail (new visual treatment of existing nav/sidebar items, same destinations; in `LecturerLayout` it replaces the 256 px sidebar): 48 px wide floating strip, `left:8px; top:48px`, `--surface`, 1 px line, radius 6, `shadow-float`, buttons 32x32 with 16 px icons, 4 px gap, tooltips on hover and focus (tooltip text also as `aria-label`). Active tool = accent-tint bg plus accent icon. Expand to 200 px with labels on toggle (existing collapse behaviour retained: `w-16/w-64` becomes `w-12/w-52`).
- Floating panels (version history, interaction panel, comments, share): right side, 8 px from edges, width 320 px, max-height `calc(100vh - 56px)`, `--surface`, 1 px line, radius 6, `shadow-pop`, header 36 px with 12/600 title and 28 px close button. Slide-in 200 ms from right by 8 px plus opacity. They float over the canvas; the canvas does not resize.
- Board header (`BoardHeader`): 40 px bar under the top bar or merged with it on board pages; inline editable title (13/500, hairline on hover, accent border on focus), save state as text plus icon ("Saved", "Saving", "Unsaved"), undo/redo/save as 28 px icon buttons.
Mobile (< 768 px):
- Top bar 48 px: logo mark, page title, menu button. Primary navigation and the add-block action move to a bottom tool bar, 56 px high plus safe-area inset, floating 8 px above bottom, radius 8, `shadow-pop`, 5 items max, each 44 px min with icon and 11 px label. Floating panels become bottom sheets: full width, radius 8 top corners, max 80 vh, drag handle 4x32 px `--line-strong`, scrim behind.
Tablet (768-1023): rail collapsed to icons; panels 320 px overlay.

## 5. Component rules
Button (height 32 desktop / 44 mobile, padding 0 12, 13/500, radius 4):
- Primary: `bg-accent text-white`, hover `accent-hover`, active `#0A4580`, disabled `bg-#E2E2E2 text-#6B6B6B` plus `cursor-not-allowed`.
- Secondary: `bg-surface`, border `--line-strong` 1 px, text ink, hover `--surface-hover`.
- Ghost/icon: transparent, hover `--surface-hover`, 32x32 (44 mobile).
- Danger: `bg-danger text-white`; destructive confirm only. Icon plus label.
- Loading: spinner 14 px replacing the icon, label stays, `aria-busy`.
- No shadows, no `active:scale-95`, no gradients.
Input / select / textarea: height 32 (44 mobile), 1 px `--line-strong`, radius 4, bg white, 13/20, visible `<label>` 12/500 above (placeholder only as hint). Hover border `ink-3`; focus 2 px accent outline (offset 0, border accent); error border `--danger` plus message with icon below in 12 px danger; disabled bg `#F2F2F2`.
Card (board tile, stat card, course card): white, 1 px line, radius 4, padding 12, no shadow at rest; hover border `#BDBDBD` plus `shadow-float`; selected border accent plus accent-tint. Thumbnail area flat `#F2F2F2` with dot grid, not a gradient. Titles 13/600, meta 12 ink-2. Replace `rounded-xl/2xl` and `shadow-lg`.
Modal: scrim `--scrim`, no blur; panel max 480 px (640 for forms), radius 8, `shadow-modal`, header 44 px (14/600 title, 28 px close) with bottom hairline, body padding 16, footer right-aligned buttons with 8 px gap, padded 12 16, top hairline. Mobile: bottom sheet. Focus trap, Esc closes, focus returns to trigger, `role="dialog" aria-modal aria-labelledby`. Entrance 200 ms opacity plus 4 px translate (no scale bounce).
Table: header row 32 px, `--surface`, 11/600 uppercase ink-2, bottom hairline; rows 36 px, 13/20, hairline between, hover `--surface-hover`, selected accent-tint plus left 2 px accent bar and a check icon; sticky header; wrapper white panel with 1 px line. Below 768 px: rows become stacked label/value lists (no horizontal scroll for primary columns).
Tabs: 32 px high, text 13/500 ink-2, active ink with 2 px accent bottom bar and `aria-selected`; segmented variant for view toggles: container `#EDEDED` radius 4 padding 2, active segment white with `shadow-float`. Keyboard: arrows move, Enter/Space activate.
Menu / dropdown (user menu, NotificationDropdown, AddBlockMenu): white, 1 px line, radius 6, `shadow-pop`, padding 4, items 28 px high (44 mobile), 13/400, icon 16 at left, hover `--surface-hover`, active/selected accent-tint, separators hairline, destructive item in `--danger` with icon. 150 ms fade. Opens with 4 px offset.
Toast (`Toast.jsx`): bottom centre on mobile above bottom bar, bottom right 16 px on desktop; white surface, 1 px line, 4 px left bar in status colour, status icon 16 px plus text 13/20, close 28 px; `shadow-pop`; `role="status"` (errors `role="alert"`); 4 s default, pause on hover and focus. Replaces coloured `bg-green-50 border-green-200` fills.
Badges/tags: 20 px high, 11/500, radius 2, tint bg plus 700-level text, optional 12 px icon. Replace `rounded-full` pills.
Empty state: 20 px icon in ink-3, 13/600 title, 12 ink-2 one-line help, one primary button; no oversized circles (`w-16 h-16 bg-indigo-100 rounded-full` pattern in JoinCoursePage etc.). Loading: neutral skeleton (`#EDEDED` to `#F5F5F5`), plus `aria-busy`; spinner 16 px. Error: inline panel, danger icon, text, Retry button. Permission denied: lock icon, "You do not have access", link back. Cover all four on every page.
Avatars: 24 px, initials, neutral `#E2E2E2` bg and ink text (no gradients).
Splash (`App.jsx`): flat `--canvas` with dot grid, 16 px mark in accent, "OpenCanvas" 13/600, thin 2 px determinate-free accent bar; no bounce; honours reduced motion.

## 6. Accessibility
- Text contrast >= 4.5:1, UI boundaries and focus >= 3:1 (numbers in section 2). White text only on `accent`, `accent-hover`, `danger`, `success`; never on tints.
- Never colour alone: status = icon + text; selected = border + tint + `aria-selected/aria-current`; chart series labelled.
- Focus visible on all interactive items; remove `button:focus:not(:focus-visible){outline:none}` only if it hides keyboard focus (keep it, but ensure `focus-visible` rule applies to `[role=button]`, links, inputs, menu items).
- Icon-only buttons need `aria-label` and a tooltip; tooltips appear on focus too, dismiss with Esc.
- Hit area >= 44 px below 768 px with >= 8 px spacing between targets.
- Reduced motion: see section 2. Skeleton shimmer becomes static.
- Zoom: layout holds at 200 percent and 320 px width; no fixed heights on text containers; text sizes in px tokens but root font scaling must not be blocked (use `rem` via Tailwind config conversion if the developer prefers).
- `theme-color` meta in `frontend/public/index.html` is `#000000`; set to `#FFFFFF`.
- Copy: short, sentence case, no emoji.

## 7. Existing purple/indigo/violet usage (562 matches in 66 files under `frontend/src`; `package-lock.json` hit is only a dependency name)
Hex values: `#6366f1` in `index.css:45` (focus ring), `App.jsx:67` (splash icon), `utils/boardHelpers.js:70,123`, `utils/mockData.js:142,146,147`, `components/board/StudyPlannerBoard.jsx:20`. `#8b5cf6` in `pages/AdminPage.jsx:829`, `utils/mockData.js:150,351`, `StudyPlannerBoard.jsx:20`.
Gradients with purple: `App.jsx:64` (`from-indigo-600 to-purple-700`), `components/Navigation.jsx:38` (`from-blue-600 to-purple-600`), `LecturerLayout.jsx`, `GuestRegistrationModal.jsx` (`to-purple-600 hover:to-purple-700`), plus more in HomePage, AboutPage, LoginPage, SignUpPage, ForgotPasswordPage, VerifyEmailPage, AdminLoginPage, LecturerLoginPage.
Named colour data: `utils/templateDefinitions.js:10` (`color: 'indigo'`), `ProgressTrackerBlock.jsx` (18 `violet` lines 28-125), `HomePage.jsx:245` (`violet`), `utils/fileIcons.js` (5 purple), `StudentNotesBoard.jsx:14-15` and `LectureNotesBoard.jsx:12` (purple/indigo-800), `BoardHeader.jsx:7,8,51` and `ArchivePage.jsx:122` (`bg-indigo-100 text-indigo-700`).
Per-file match counts (indigo/purple/violet/hex): AdminPage 59, LecturerPage 60, QuizBoard 32, LecturerStudentsPage 29, HomePage 23, StudentDashboardPage 23, LecturerCoursesPage 22, StudyPlannerBoard 18, AboutPage 17, ProgressTrackerBlock 16, ShareModal 14, BulkImportModal 13, SignUpPage 13, ForgotPasswordPage 12, StudentCoursesPage 12, LecturerBoardsPage 12, LecturerDashboardPage 11, JoinCoursePage 9, LoginPage 8, StudentCoursePage 8, JoinBoardPage 7, KanbanCardDetail 7, TemplateBoardsPage 7, fileIcons 7, TemplatesPage 6; 5 each: GuestRegistrationModal, mockData, VersionHistoryPanel, BoardHeader, NotificationsPage, VerifyEmailPage, KanbanAddCard, LecturerAnalyticsPage, LecturerSettingsPage; 4 each: StatCard, SharedPage, KanbanBoard, InteractionPanel; 3 each: App, Navigation, NotificationDropdown, LecturerLayout, FileBlock, ImageBlock, CommentThread, SettingsPage, DocumentPreviewModal, LecturerSharedPage; 2 each: ArchivePage, boardHelpers, StudentNotesBoard, WorkspacePage, ProfilePage, VideoBlock, TextBlock, LecturerArchivePage; 1 each: index.css, ProtectedRoute, ConfirmModal, EmptyState, SearchBar, AddBlockMenu, KanbanCard, LectureNotesBoard, CourseMaterialTemplatePage, templateDefinitions. Re-run `rg -i "purple|indigo|violet|fuchsia|magenta|lavender|#6366f1|#8b5cf6|#a855f7|#7c3aed" frontend/src` (through a container) for the full line-level list; it must return nothing at the end.

## 8. Change list for the frontend developer (in order)
P0 foundations (do first, one PR):
1. `frontend/tailwind.config.js`: replace with snippet in section 2 (includes the indigo/purple/violet remap safety net).
2. `frontend/package.json` + `src/index.js`: add `@fontsource-variable/inter`, import it.
3. `frontend/src/index.css`: add `:root` variables; body font, 14/20, `--canvas` plus dot grid; replace focus ring with `var(--accent)`; neutral scrollbar (thumb `#C4C4C4`, 8 px, radius 4); delete `scroll-reveal`, `stagger-*`, `fadeInUp`, `nav-link-active`, bouncy splash keyframes; shorten durations to 150-250 ms; add reduced-motion block; skeleton to neutral flat shimmer.
4. `frontend/public/index.html`: `theme-color` to `#FFFFFF`.
P1 shared components (these reach every page):
5. New `src/components/ui/Button.jsx`, `Field.jsx` (label plus input/select), `Badge.jsx`, `Panel.jsx` (floating panel), `Tooltip.jsx` implementing section 5. Keep prop names small.
6. `ui/ConfirmModal.jsx`, `ui/EmptyState.jsx`, `ui/SearchBar.jsx`, `ui/StatCard.jsx`, `Toast.jsx`, `SkeletonLoader.jsx`, `ProtectedRoute.jsx` (spinner border-indigo).
7. `Navigation.jsx`, `LecturerLayout.jsx` (shell: top bar, rail, mobile bottom bar), `NotificationDropdown.jsx`, `App.jsx` (SplashScreen and wrappers).
P2 board editor (core canvas feel):
8. `board/BoardHeader.jsx`, `AddBlockMenu.jsx`, `InteractionPanel.jsx`, `VersionHistoryPanel.jsx`, `CommentThread.jsx`, `ShareModal.jsx`, `DocumentPreviewModal.jsx` as floating panels/modals.
9. `board/KanbanBoard.jsx`, `kanban/*`, `QuizBoard.jsx`, `StudyPlannerBoard.jsx`, `StudentNotesBoard.jsx`, `LectureNotesBoard.jsx`, `board/blocks/*` (ProgressTrackerBlock `violet` becomes azure/teal per palette; Text/Image/File/Video blocks: hairline card, selection style).
10. `utils/boardHelpers.js`, `utils/templateDefinitions.js` (indigo to azure, rose to orange), `utils/fileIcons.js`, `utils/mockData.js`: swap hex/colour names using the chart palette.
P3 pages (main shells first):
11. `pages/DashboardPage`, `WorkspacePage`, `TemplatesPage`, `templates/*`, `ArchivePage`, `SharedPage`, `student/*`, `lecturer/*`, `AdminPage` (59 hits, mostly tables and tabs: apply Table and Tabs rules; chart colour at line 829).
12. Auth and marketing: `LoginPage`, `SignUpPage`, `ForgotPasswordPage`, `VerifyEmailPage`, `AdminLoginPage`, `LecturerLoginPage`, `JoinCoursePage`, `JoinBoardPage`, `HomePage`, `AboutPage`, `GuestRegistrationModal`, `BulkImportModal`, `GuestExpiryBanner`: remove gradient heroes, use flat canvas with centred 360 px white panel (radius 6, hairline, `shadow-float`).
13. Cleanup: delete the three remap lines in the Tailwind config; confirm the grep in section 7 is empty; run lint and the existing test (`utils/safeUrl.test.js`) through Docker; check at 360, 768, 1280 px.

## 9. Acceptance checklist
- Grep for forbidden hues returns nothing; no `bg-gradient`, `from-` or `to-` classes remain.
- All interactive items show the azure focus ring by keyboard.
- Contrast numbers above hold when tokens are used as listed.
- Reduced-motion setting stops all animation.
- Every page shows empty, loading, error and permission-denied states.

## 10. Classroom theme

Extends the public HomePage look to all pages except `AdminPage.jsx` (frozen). Sections 1 to 9 still apply; where a classroom surface and a section 5 rule disagree on a dense or editable area, section 5 wins. Source of truth for values: `frontend/tailwind.config.js` (`wall`, `chalk-*`, `wood-*`, `paper-*`, `cork`, `note-*`, `font-hand`) and `frontend/src/index.css` (`.paper-rules`, `.chalkboard`, `.wood-frame`, `.cork-board`, `.scroll-reveal`, `.lift`, `.btn-motion`).

### 10.1 Component set (`frontend/src/components/classroom/`)
One file per component plus `index.js`. All accept `className` and `children`; all use static class lookup maps.

| Component | Props (default) | Variants and rules |
|---|---|---|
| ClassroomShell | `variant` (`plain`), `as` (`div`) | Renders `bg-wall` and adds the `.classroom` scope class. `plain`: wall only. `paper`: adds `.paper-rules` (ruled, margin line) for marketing and auth pages only. Min height `100dvh`. |
| ChalkboardHeader | `size` (`banner`), `title`, `subtitle`, `tray` (false), `actions`, `as` (`h1`) | `hero`: padding 48/64 px, title `text-2xl` desktop 40 px via `font-hand`. `banner`: padding 24 px, title 24 px. `compact`: padding 12/16 px, title 20 px, no subtitle on under 480 px. Chalk underline (`animate-oc-draw`, 2 px, `chalk-dust`) under the title. `tray`: 8 px wood-dark strip with 3 chalk stubs, decorative, `aria-hidden`. Always wrapped in WoodFrame. Title colour `chalk-ink`. |
| WoodFrame | `width` (`md` = 8 px, `sm` = 4 px) | `.wood-frame` padding as border, radius 6 px. Wraps a chalkboard or cork board only. |
| PaperPanel | `ruled` (false), `margin` (false), `padded` (true), `tone` (`paper`/`white`) | `ruled` adds `.paper-rules`; `margin` adds the red line and needs `ruled`. Default is off for dense content. Border 1 px `line`, radius 6 px, `shadow-float`. |
| StickyNote | `color` (`amber`), `rotate` (`0`), `decorative` (false), `as` | `color` in `azure amber green teal orange` mapped through a lookup. `rotate` in `-2 0 2` degrees and honoured only if `decorative` is true. Padding 12 px, radius 2 px, `shadow-float`. Text `ink`. |
| CorkBoard | `padded` (true) | `.cork-board`, inside WoodFrame. Holds StickyNotes only; no inputs. Content wraps in a 1 / 2 / 3 column grid (under 640 / 640 / 1024 px). |
| ChalkBadge | `label` (required), `icon` (required), `tone` (`neutral`/`success`/`warning`/`danger`) | Pill 24 px high, 12 px text, 16 px icon (1.75 stroke, existing set). Text plus icon in every tone. On chalk surface: `chalk-deep` fill, `chalk-ink` text. On white: `*-tint` fill, solid token text. |
| TimetableGrid | `columns`, `rows`, `caption`, `onCellSelect` | Semantic `table` with `caption` (visually hidden allowed) and `th scope`. Hairline `line` cells, header row `wood-cream`. Under 640 px the table scrolls inside its own `overflow-x-auto` region with `tabindex=0` and a label. |
| ClassroomButton | wraps `ui/Button`; same props plus `onChalk` (false) | Adds `btn-motion`. Min 44 x 44 px (`min-h-[44px]`). `onChalk` swaps to `chalk-ink` fill, `chalk` text, and a chalk-ink focus ring. Primary actions in the lower half on mobile. |
| ClassroomField | wraps `ui/Field`; same props | Always a visible label above the input, white fill, 44 px high, never on a ruled or cork surface. Error text plus icon below the field. |
| useScrollReveal | `useScrollReveal({ threshold = 0.15, once = true })` returns `ref` | Adds `is-visible` through IntersectionObserver. If `matchMedia('(prefers-reduced-motion: reduce)')` matches, or IntersectionObserver is missing, sets visible at once with no transition. Animates opacity and transform only, 250 ms max. Content must remain readable without JS. |

### 10.2 Surface weight per page type
| Page type | Weight | Surface |
|---|---|---|
| Login, sign up, forgot password, verify email, lecturer login | Full | Shell `paper`, ChalkboardHeader `hero` or `banner`, PaperPanel (not ruled) holding the form. |
| Student, lecturer dashboards | Full | Shell `plain`, ChalkboardHeader `banner` (greeting), StickyNotes for summary counts, TimetableGrid for schedules. |
| Course pages | Full to Medium | Full on the course landing view; Medium on inner tabs (banner becomes `compact`). |
| Profile, settings, notifications, join course/board | Medium | ChalkboardHeader `compact` or `banner`, PaperPanel (white tone) body, ChalkBadges for status. |
| Dense tables and lists | Light | Classroom header, empty state and badges only; table body on plain white `surface`. |
| Board editor chrome, Kanban, lecture and student notes boards | Light | Keep section 3 canvas and section 5 chrome; only the board title strip may use `compact`. |
| Modals | Light | White panel; at most a ChalkBadge or hand-font title. No board, cork or ruled lines. |
| Quiz board, Study Planner board | Deferred | No change until a separate brief. |
| AdminPage | Frozen | See 10.5. |

Every screen keeps empty, loading, error and permission-denied states (section 9); ChalkBadge and StickyNote may carry them, always with text and an icon.

### 10.3 Overuse guards
- No ruled lines, cork, wood texture or rotation behind or around anything the user edits or types into (inputs, text areas, rich text, Kanban cards, quiz answers).
- `font-hand` for titles and short labels (under 40 characters) only. Never body text, table cells, form values or buttons that carry long copy. Fallback stack is already system fonts; layouts must survive `cursive` metrics (use `min-h`, no fixed heights).
- One ChalkboardHeader per screen. The page uses `compact` after the first scroll screen on long pages; no chalkboard inside a modal.
- Rotation is decorative only (`StickyNote decorative`), at most 2 degrees, and its container uses `overflow-x-clip` so nothing causes horizontal scroll at 320 px. Rotation is removed under 480 px if overflow is measured.
- App chrome stays compact: top bar 48 px, no wood frame on navigation or sidebars.
- Motion: reveal, lift and press only; no looping animation other than the existing `oc-breathe` underline. Reduced motion removes all (existing media query plus the hook).
- Text on any textured surface must sit on a flat panel or chalkboard, never directly on cork or ruled lines.
- Font rule: one UI font, the sans token `font-sans` in `frontend/tailwind.config.js`, for all text. `font-hand` only for short display headings under 40 characters: page and section headings (h1, h2), chalkboard headings and short sticky-note labels. Never for h3 card or list titles, empty-state headings, navigation, the wordmark, buttons, inputs, tables or data. Editable titles use the UI font in both view and edit state. Monospace only for access or join codes. Form controls inherit `font-family` (see `index.css`).

### 10.4 Contrast (WCAG 2.x relative luminance, computed by hand from the hex values)
Thresholds: 4.5:1 text, 3:1 non-text. L = relative luminance.

| Pair (foreground on background) | L fg / L bg | Ratio | Result |
|---|---|---|---|
| chalk-ink `#F5F3EA` on chalk-board `#2F4D3C` | 0.895 / 0.062 | 8.41 | pass text |
| chalk-dust `#D3E2D6` on chalk-board | 0.731 / 0.062 | 6.95 | pass text |
| chalk-ink on chalk-deep `#243D30` (badge) | 0.895 / 0.039 | 10.58 | pass text |
| ink `#1A1A1A` on paper `#FFFCF4` | 0.010 / 0.974 | 16.98 | pass text |
| ink-2 `#5C5C5C` on paper | 0.107 / 0.974 | 6.52 | pass text |
| ink-3 `#6B6B6B` on paper | 0.147 / 0.974 | 5.20 | pass text |
| ink on wall `#F6F4EE` | 0.010 / 0.905 | 15.8 | pass text |
| ink on note azure `#DCEBFA` | 0.010 / 0.815 | 14.34 | pass text |
| ink on note amber `#FFF0B0` | 0.010 / 0.867 | 15.20 | pass text |
| ink on note green `#DDF2DF` | 0.010 / 0.842 | 14.79 | pass text |
| ink on note teal `#CFEFEC` | 0.010 / 0.811 | 14.26 | pass text |
| ink on note orange `#FCE0C8` | 0.010 / 0.782 | 13.79 | pass text |
| accent `#0A66C2` on white | 0.135 / 1.000 | 5.69 | pass text |
| accent on paper | 0.135 / 0.974 | 5.55 | pass text |
| accent on wall | 0.135 / 0.905 | 5.17 | pass text |
| white on wood `#8B5E3C` | 1.000 / 0.138 | 5.58 | pass text |
| chalk-ink on wood | 0.895 / 0.138 | 5.02 | pass text |
| wood vs wall (frame edge) | 0.138 / 0.905 | 5.07 | pass non-text |
| accent focus ring on chalk-board | 0.135 / 0.062 | 1.64 | fail non-text |
| chalk-ink focus ring on chalk-board | 0.895 / 0.062 | 8.41 | pass non-text |
| ink on cork `#C99A6B` (never used: text sits on notes) | 0.010 / 0.366 | 6.89 | pass, but forbidden by 10.3 |
| note amber vs cork (edge) | 0.867 / 0.366 | 2.21 | fail non-text |
| note azure vs cork (edge) | 0.815 / 0.366 | 2.08 | fail non-text |

Consequences:
- Focus on any control inside a chalkboard must use a chalk-ink ring, 2 px, 2 px offset, declared as `.classroom .chalkboard :focus-visible` (new selector; the global rule is not edited). All other surfaces keep the global azure ring.
- Note edges on cork fail 3:1. Accepted because a note is a text container, not a control, and its text passes; notes still carry `shadow-float`. Any interactive note must also show a visible text or icon affordance and a focus ring.
- Paper rules `#BFD6EA` and the red margin `#D9534F` at 0.6 opacity are decorative and exempt; no information may depend on them.
- Developer must re-run the table (script or calculator) if any hex changes.

### 10.5 AdminPage protection
- New CSS goes only under the opt-in `.classroom` scope (for example `.classroom .btn-motion`) or under new class names. `AdminPage.jsx` never renders ClassroomShell, so scoped rules cannot reach it.
- Do not edit: `:root` variables, existing Tailwind colour keys (`canvas`, `surface`, `line`, `ink`, `accent`, `danger`, `success`, `warning`, `gray`, `slate` and the classroom keys already added), `body` rules, the `*:focus-visible` rule, or the mobile button rule (min-height on buttons under the mobile breakpoint). Add new keys instead of changing values.
- Do not touch `Toast`, `SplashScreen`, `BulkImportModal`. Shared `components/ui/*` change only by additive props; default output stays byte-identical for existing callers (ClassroomButton and ClassroomField wrap, they do not modify).
- Dynamic Tailwind class names built with template literals (for example `bg-note-${color}`) are not allowed: the content scanner cannot see them and they vanish in production. Replace with static lookup maps such as `const NOTE = { amber: 'bg-note-amber', azure: 'bg-note-azure' }`, and migrate existing template-literal classes in files that are touched.
- Check after rollout: AdminPage renders unchanged at 360, 768, 1280 px (visual diff), and a grep for `classroom` inside `AdminPage.jsx` returns nothing.

### 10.6 As built
Components in `frontend/src/components/classroom/` (exported from `index.js`): ClassroomShell, ChalkboardHeader, WoodFrame, PaperPanel, StickyNote, CorkBoard, ChalkBadge, TimetableGrid, ClassroomButton, ClassroomField, plus two additions not in 10.1: ClassroomAlert (`tone`, `role`) and ClassroomDialog (`titleId`, `title`, `onClose`, `size`, `footer`, `dismissOnScrim`, ...). `cx.js` is the class joiner. `useScrollReveal` lives in `frontend/src/hooks/` (options `threshold`, `once`, `rootMargin`).

Props added beyond 10.1: ClassroomShell `embedded`; ChalkboardHeader `titleId`, `eyebrow`, `underline`, `enter`, `handTitle`; PaperPanel `flat`; StickyNote `pinned`, `spacious`; CorkBoard `as`, `header`, `layout` (`three` default); ChalkBadge `surface`, `iconClassName`; TimetableGrid `corner`.

Page-to-weight mapping applied (ChalkboardHeader size):
- hero: HomePage. banner: auth pages (via `components/auth/AuthFrame`), student dashboard, student courses, lecturer dashboard, Profile, Templates, template boards.
- compact: Settings, Notifications, Shared, Archive, student course page, lecturer courses, students, boards, analytics, archive, shared and settings pages.
- Join course and join board pages use ClassroomButton, ClassroomField, ClassroomAlert and ChalkBadge without a chalkboard.
- Modals use ClassroomDialog with a white panel. Board editor chrome, Kanban, lecture and student notes boards keep the section 3 and 5 look with light touches (BoardHeader, dialogs, thread panels).
- Not changed: Quiz board, Study Planner board (deferred), AdminPage, Toast, BulkImportModal (frozen).

Deviations from the spec:
- ChalkBadge uses a full pill radius (`rounded-full`, 24 px high).
- StickyNote tilt is +-2 degrees and applies from 480 px up (`min-[480px]:`), decorative only.
- Auth pages use the plain wall (ClassroomShell `plain`), not ruled paper.
- The lecturer rail is flat `wood-dark`, without wood texture.
- Student stat tiles sit on paper panels rather than on cork notes.
- In two HomePage sections, text sits on cork or ruled paper, which 10.3 discourages.
- Tailwind `content` excludes test files so selector strings in tests do not generate utilities.

Known gaps:
- No browser visual check was done; verification is static (lint, unit tests, generated CSS, build).
- The handwriting font depends on what the operating system provides, so metrics vary.
- No dark mode. The Settings theme select still offers Dark.
- Screen reader behaviour was not tested.
