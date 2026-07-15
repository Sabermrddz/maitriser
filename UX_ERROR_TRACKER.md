# UX Error Tracker — QuizApp-v7

> Comprehensive audit of all user experience errors, anti-patterns, and broken interactions across the application.

---

## Table of Contents
1. [Critical (P0) — Broken Core Functionality](#critical-p0)
2. [Major (P1) — Significant UX Degradation](#major-p1)
3. [Moderate (P2) — Noticeable Friction](#moderate-p2)
4. [Minor (P3) — Polish / Accessibility](#minor-p3)
5. [ECOS-Specific Issues](#ecos-specific-issues)

---

## Critical (P0) — Broken Core Functionality

| # | Issue | File | Line(s) | Description |
|---|-------|------|---------|-------------|
| 1 | **Search input is non-functional** | `frontend/src/pages/quizPage.jsx` | 62–65, 153–155 | The search text input is rendered but `searchQuery` is **not in the `useEffect` dependency array** that triggers `fetchQuizzes`. Users type and nothing happens. |
| 2 | **Profile Guard Modal is an inescapable trap** | `frontend/src/components/ProfileGuardModal.jsx` | 20–55 | Blocks entire screen with `zIndex: 99999`. No close button, no Escape key handler, no click-outside-to-dismiss, no back button. Users with incomplete profiles are forced down a single path. |
| 3 | **Option labels fire double events** | `frontend/src/components/quizCard.jsx` | 282–288 | Both the `<label onClick>` and nested `<input onChange>` call `toggleOption()` on the same state. Toggles fire twice, causing race conditions and flickering selections. |
| 4 | **Timer resumes incorrectly after tab switch** | `frontend/src/components/quizCard.jsx` | 112–120 | `setTimeLeft((t) => t)` on visibility change does not actually resume from the correct remaining time — it just re-renders with a stale value. Timer jumps or behaves unpredictably. |
| 5 | **Voice recognition hardcoded to French** | `frontend/src/components/VoiceExam.jsx` | 60 | `recognition.lang = 'fr-FR'` is hardcoded regardless of user language preference. English users get French transcription. *(Note: This appears fixed in the latest file read — verify deployment.)* |
| 6 | **Case Exam loses unsubmitted answers on refresh** | `frontend/src/pages/CaseExam.jsx` | 33–45 | `sessionStorage` saves `currentIndex` and `results`, but **not the `selected` array**. Refreshing mid-question wipes answer selections while keeping the page position. |
| 7 | **Dashboard "Completion" ring shows accuracy, not completion** | `frontend/src/pages/DashboardPage.jsx` | 190–199 | Circular progress ring displays `passRate`% (correct ÷ attempts) but label reads "Completed". A 50% accuracy user sees a half-filled ring labeled "Completed" — semantically wrong. |
| 8 | **Paywall shown above interactive filters** | `frontend/src/pages/quizPage.jsx` | 141–167 | When unsubscribed, module/course filters and search bar are still rendered and interactive above the paywall banner. Users can interact with controls that have no effect — broken promise pattern. |

---

## Major (P1) — Significant UX Degradation

| # | Issue | File | Line(s) | Description |
|---|-------|------|---------|-------------|
| 9 | **No debounce on search input** | `frontend/src/pages/quizPage.jsx` | 153–155 | Every keystroke (once search is fixed) would trigger an API call. No throttle or debounce means rapid typing spams the backend. |
| 10 | **Header hamburger has no menu** | `frontend/src/components/Header.jsx` | 9, 21–23 | `isMenuOpen` state toggles but there is **no corresponding mobile menu markup**. Small-screen navigation overflows or breaks with no drawer/overlay. |
| 11 | **Landing page nav has no mobile collapse** | `frontend/src/components/LandingNav.jsx` | — | No responsive collapse or hamburger. Four nav links + two CTA buttons overflow horizontally on mobile with no scroll container. |
| 12 | **Dashboard profile dropdown is a dead click** | `frontend/src/pages/DashboardPage.jsx` | 143–153 | `dash-top-profile` shows a `FaChevronDown` implying a dropdown, but clicking does nothing. No menu state or dropdown rendered. |
| 13 | **Settings and Admin Panel share the same icon** | `frontend/src/components/NewSidebar.jsx` | 29–32 | Both `/profile` (Settings) and `/admin/dashboard` (Admin Panel) use `<FaCog />`. Users cannot visually distinguish two very different destinations. |
| 14 | **Cookie banner is "Accept-Only"** | `frontend/src/components/CookieConsent.jsx` | 13–25 | Single "Accept" button with no decline, manage, or dismiss option. GDPR compliance issue and dark pattern. |
| 15 | **Pricing "Subscribe" redirects to contact form** | `frontend/src/pages/PricingPage.jsx` | 171–178 | Clicking "Subscribe" on a paid plan opens `/contact?subject=Subscription request...` in the same tab. Users expecting checkout are dumped onto a generic contact page. |
| 16 | **Error Boundary is English-only** | `frontend/src/components/ErrorBoundary.jsx` | 18–20 | Hardcoded English text (`"Something went wrong"`, `"Reload"`) with no i18n integration. Breaks the bilingual FR/EN experience when crashes occur. |
| 17 | **Multi-select detection is flawed** | `frontend/src/components/quizCard.jsx` | 226–228 | `isMulti` is determined by `options.length > 2`. A 3-option single-answer question is falsely labeled "Select all that apply." |
| 18 | **Profile page missing Year 7** | `frontend/src/pages/ProfilePage.jsx` | 259–262 | Year dropdown only offers 1–6, but sidebar logic checks for `['5','6','7']` to show ECOS. 7th-year medicine students **cannot select their actual year**. |
| 19 | **Confirm Modal lacks accessibility** | `frontend/src/components/ConfirmModal.jsx` | — | No focus trap, no Escape-to-close, no `autoFocus` on primary action, focus not returned to trigger element. Keyboard users can tab into background. |
| 20 | **Toast notifications stack infinitely** | `frontend/src/components/Toast.jsx` | 11–18 | No maximum stack limit. Rapid errors can fill the entire top-right quadrant with overlapping toasts. |
| 21 | **VoiceExam audio delete doesn't clear transcript** | `frontend/src/components/VoiceExam.jsx` | 151 | Clicking delete removes the audio blob but the transcribed text in the textarea persists. User must manually clear it. |
| 22 | **No password confirmation field** | `frontend/src/pages/ProfilePage.jsx` | 270–274 | Password change form has only one password field. Users can typo new passwords with zero verification. |
| 23 | **MockExam flag button has no `aria-pressed`** | `frontend/src/pages/MockExam.jsx` | 348–355 | Flag toggle button doesn't communicate its pressed state to screen readers. |
| 24 | **Case exam lacks multi-select hint** | `frontend/src/pages/CaseExam.jsx` | 201–217 | No "select all that apply" indicator on multi-answer questions. Users don't know if multiple selections are expected. |
| 25 | **PremiumGateModal has no Escape key handler** | `frontend/src/components/PremiumGateModal.jsx` | — | Modal cannot be closed via Escape key — inconsistent with standard modal behavior. |
| 26 | **Signup `afterSignUpUrl` may race with auth sync** | `frontend/src/pages/Signup.jsx` | 15 | Redirects to `/discipline-picker` (a protected route) immediately after signup. Auth state may not have propagated, causing a redirect loop or auth error. |
| 27 | **Dashboard module cards navigate to generic quiz page** | `frontend/src/pages/DashboardPage.jsx` | 230 | Clicking a specific module card navigates to `/quizzes` with **no module filter applied**. The user must re-select the module they just clicked. |
| 28 | **VoiceExamPage flashes full UI before redirect** | `frontend/src/pages/VoiceExamPage.jsx` | 21–23 | When a non-medicine user visits `/voice-exams`, the full page renders briefly before `useEffect` redirects. Content flash before access denial. |
| 29 | **QuizCard retry in study mode requires navigation** | `frontend/src/components/quizCard.jsx` | 154–172 | Wrong answers show explanation but user must navigate away and back to retry the same question. No "Try Again" on the same card. |

---

## Moderate (P2) — Noticeable Friction

| # | Issue | File | Line(s) | Description |
|---|-------|------|---------|-------------|
| 30 | **Quiz titles truncated mid-word** | `frontend/src/pages/quizPage.jsx` | 197 | Titles cut off at 80 characters with no ellipsis or `title` tooltip. Users can't see full quiz names on hover. |
| 31 | **Pagination is prev/next only** | `frontend/src/components/Pagination.jsx` | — | No page numbers, no jump-to-page, no "Page X of Y" indicator. Large quiz sets require endless clicking. |
| 32 | **Oral mock exam shows no station progress** | `frontend/src/pages/OralMockExamSession.jsx` | — | No indicator of how many stations remain or current station number. Users are flying blind during multi-station exams. |
| 33 | **No image zoom on clinical case images** | `frontend/src/components/VoiceExam.jsx` | 258–264 | Clinical images (radiographs, ECGs) display at `maxHeight: 300` with no click-to-zoom. Medical images need detailed inspection. |
| 34 | **No speech-to-text confidence score** | `frontend/src/components/VoiceExam.jsx` | 62–73 | Web Speech API provides confidence scores but they are ignored. A low-confidence transcript could be garbled without the student knowing. |
| 35 | **Station mode doesn't persist between stations** | `frontend/src/pages/OralMockExamSession.jsx` | — | If connection drops mid-mock-exam, the user restarts from station 1. No server-side progress tracking for mock exams. |
| 36 | **No question randomization** | `frontend/src/components/quizCard.jsx` | — | Questions appear in fixed order. Students memorize sequence rather than learning content. |
| 37 | **Loading skeleton mismatch** | `frontend/src/components/LoadingSkeleton.jsx` | — | Skeleton cards don't match the actual card layout closely enough — visible layout shift when content loads. |
| 38 | **Empty states are inconsistent** | Various | — | Some empty states have icons + CTA, others are plain text. No standardized empty-state component. |
| 39 | **Form validation errors lack focus management** | Various forms | — | On validation failure, the first invalid field is not auto-focused. Users must manually find the error. |
| 40 | **No loading state on filter changes** | `frontend/src/pages/quizPage.jsx` | — | Changing module/course shows no loading indicator while new quizzes fetch. Page appears frozen briefly. |

---

## Minor (P3) — Polish / Accessibility

| # | Issue | File | Line(s) | Description |
|---|-------|------|---------|-------------|
| 41 | **No `aria-live` regions for dynamic content** | Various | — | Quiz results, toasts, and errors are not announced to screen readers. |
| 42 | **Skip-to-content link missing** | `frontend/src/App.jsx` | — | No skip navigation for keyboard users — must tab through entire sidebar on every page load. |
| 43 | **Focus styles are inconsistent** | Global CSS | — | Some interactive elements have visible focus rings, others don't. Custom-styled buttons often lose focus indicators. |
| 44 | **No reduced-motion support** | Global | — | Animations and transitions have no `@media (prefers-reduced-motion)` guards. Motion-sensitive users get full animations. |
| 45 | **Print styles not defined** | Global | — | Quiz explanations and results cannot be printed cleanly. Sidebars, headers, and nav print along with content. |
| 46 | **Hardcoded emoji instead of icons** | Various | — | Some UI uses emoji (🔒, 🎤, ✅) which render inconsistently across OS/browsers. Should use icon library. |
| 47 | **No breadcrumb navigation** | Various | — | Deep pages (quizzes → exam → review) have no breadcrumb. Users lose context of where they are in the hierarchy. |
| 48 | **Input placeholders used as labels** | Various forms | — | Some inputs rely solely on placeholder text, which disappears on typing and fails accessibility requirements. |
| 49 | **Color contrast on muted text** | Global CSS | — | `--text-muted` (`#888`) on light backgrounds may fail WCAG AA contrast requirements at small sizes. |
| 50 | **No session expiry warning** | `frontend/src/config/api.js` | — | JWT tokens expire silently. Users get auth errors mid-action with no warning to re-login. |

---

## ECOS-Specific Issues

| # | Issue | File | Line(s) | Description |
|---|-------|------|---------|-------------|
| 51 | **Keyword matching is too naive** | `Backend/routes/voiceExamRoutes.js` | 192–196 | Simple `text.includes(kw.toLowerCase())` causes false positives ("pas" contains "asp") and misses typos/semantic equivalents ("scanner" vs "TDM"). |
| 52 | **No anti-gaming detection** | `Backend/routes/voiceExamRoutes.js` | — | Student can paste every keyword into the textarea and get perfect score. No length penalty, coherence check, or time limit. |
| 53 | **Ideal answer hidden until after submission** | `frontend/src/components/VoiceExam.jsx` | 348–351 | No incremental practice loop. Student answers blind, gets binary pass/fail, sees model answer. Can't iterate and improve within the same session. |
| 54 | **Audio never sent to backend** | `frontend/src/components/VoiceExam.jsx` | 39–45 | Recorder generates audio blob but it's only stored in browser memory. No teacher review possible; audio lost on refresh. |
| 55 | **No timer / no pressure simulation** | `frontend/src/components/VoiceExam.jsx` | — | Real ECOS stations are 5–7 minutes. App has no countdown, no auto-submission, no pressure training. |
| 56 | **ECOS score is binary per question** | `Backend/routes/voiceExamRoutes.js` | 198 | A question with 3 criteria where student gets 2/3 is scored as 0% for that question. Real ECOS gives partial credit. |
| 57 | **No hint system** | `frontend/src/components/VoiceExam.jsx` | — | No "I need a hint" or progressive case disclosure. Students are either stuck or fully spoiled. |
| 58 | **No peer review / sample answers** | — | — | Students cannot see anonymized responses from peers to calibrate their own answers. |
| 59 | **Retry doesn't pre-fill previous answers** | `frontend/src/components/VoiceExam.jsx` | 357–363 | Clicking "Retry" wipes everything. Student can't build on their previous attempt. |
| 60 | **Firefox unsupported for speech recognition** | `frontend/src/components/VoiceExam.jsx` | 20, 89–91 | Web Speech API unavailable in Firefox. Shows "unsupported" message but no graceful fallback workflow. |

---

## Error Count Summary

| Severity | Count |
|----------|-------|
| Critical (P0) | 8 |
| Major (P1) | 21 |
| Moderate (P2) | 11 |
| Minor (P3) | 10 |
| ECOS-Specific | 10 |
| **Total** | **60** |

---

*Last updated: Generated from full codebase audit of QuizApp-v7*
