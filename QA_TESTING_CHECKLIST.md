# QA Testing Checklist - Portfolio & High Roller Tycoon

## ✅ Test Environment
- **URL**: http://localhost:4321
- **Browser**: Chrome/Firefox/Safari
- **Date**: Testing session

---

## 1. Homepage (Portfolio) Testing

### 1.1 Visual & Layout
- [ ] Page loads without errors
- [ ] All fonts load correctly (Inter, JetBrains Mono)
- [ ] Design system colors applied correctly
- [ ] Grain texture visible on background
- [ ] Responsive layout works on different screen sizes

### 1.2 Navigation
- [ ] "MA." logo displays in top left
- [ ] "Blog" button visible in top right
- [ ] "Blog" button changes color on hover (muted → sky blue)

### 1.3 Ballpit Interaction
- [ ] Balls animate and fall with gravity
- [ ] Balls react when cursor hovers near them (within 220px)
- [ ] Balls move away from cursor smoothly
- [ ] No performance issues with ball animation
- [ ] Balls don't cause layout shifts

### 1.4 Content Sections
- [ ] Name displays: "Matthew Ankenmann"
- [ ] Subtitle shows: "Data-Driven Strategy for Global Analytics"
- [ ] "Currently: Optimization @ Tangam Systems" displays with styled label
- [ ] Experience section shows all 5 jobs
- [ ] Timeline dots and lines render correctly
- [ ] Professional Summary card displays
- [ ] Contact info shows email and "Canada"
- [ ] LinkedIn and Email buttons work
- [ ] Skills/Expertise section displays correctly
- [ ] Copyright text at bottom

### 1.5 Interactive Elements
- [ ] Cards lift on hover (soft → crisp shadow)
- [ ] Buttons have proper hover states
- [ ] Links change color on hover
- [ ] All clickable elements are accessible

---

## 2. Navigation to Game

### 2.1 Blog Button
- [ ] Clicking "Blog" button navigates to `/high-roller-tycoon`
- [ ] Navigation is smooth (no page flash/errors)
- [ ] URL changes correctly
- [ ] Browser back button works to return

---

## 3. High Roller Tycoon Game Testing

### 3.1 Page Load
- [ ] Game page loads without errors
- [ ] All assets load (fonts, icons, Tailwind CSS)
- [ ] Background canvas animates (card suits falling)
- [ ] Game state loads from localStorage (if previously played)

### 3.2 Navigation
- [ ] "Back to Homepage" button visible in top left
- [ ] Button has hover effect (arrow slides, border changes)
- [ ] Clicking "Back to Homepage" returns to `/`
- [ ] Game state persists when navigating away and back

### 3.3 Game Mechanics - Clicking
- [ ] Clicking poker chip generates cash
- [ ] Cash amount updates in real-time
- [ ] Floating text appears showing "+$X" amount
- [ ] Floating text animates upward and fades out
- [ ] **CRITICAL**: UI does NOT shift/move when cash is generated
- [ ] Multiple rapid clicks work correctly
- [ ] Space bar also triggers click

### 3.4 Audio
- [ ] "Cha ching" sound plays on each click
- [ ] Sound respects mute toggle
- [ ] Sound toggle button works (volume icon changes)
- [ ] No audio errors in console
- [ ] Audio file loads from `/chaching.mp3` (check Network tab)

### 3.5 Passive Income
- [ ] Cash per second (CPS) displays correctly
- [ ] Cash increases automatically based on CPS
- [ ] CPS updates when upgrades are purchased

### 3.6 Upgrades/Assets
- [ ] All 6 upgrade types display in right panel
- [ ] Upgrade costs calculate correctly (exponential growth)
- [ ] Can purchase upgrades when enough cash
- [ ] Upgrade level increases after purchase
- [ ] Progress bars show milestone progress
- [ ] Upgrade list scrolls if needed
- [ ] Upgrade buttons gray out when can't afford

### 3.7 Prestige System
- [ ] Prestige chips display correctly
- [ ] Bonus percentage calculates correctly
- [ ] "Cash Out (Prestige)" button works
- [ ] Prestige modal shows correct calculations
- [ ] Prestige resets game state correctly
- [ ] Prestige bonus applies to future earnings

### 3.8 Special Events
- [ ] Golden chip appears randomly
- [ ] Clicking golden chip gives bonus cash
- [ ] Golden chip animation works

### 3.9 Save/Load
- [ ] Game saves automatically every 30 seconds
- [ ] Game state persists after page refresh
- [ ] Offline earnings calculate correctly (if away > 1 minute)
- [ ] Welcome back modal shows offline earnings

---

## 4. Cross-Browser Testing

### 4.1 Chrome
- [ ] All features work
- [ ] Audio plays
- [ ] Animations smooth

### 4.2 Firefox
- [ ] All features work
- [ ] Audio plays
- [ ] Animations smooth

### 4.3 Safari
- [ ] All features work
- [ ] Audio plays (may need user interaction)
- [ ] Animations smooth

---

## 5. Mobile/Responsive Testing

### 5.1 Mobile View (< 900px)
- [ ] Portfolio layout stacks correctly
- [ ] Game layout adapts to mobile
- [ ] Touch interactions work
- [ ] Buttons are appropriately sized
- [ ] Text is readable

### 5.2 Tablet View
- [ ] Layout works well
- [ ] All features accessible

---

## 6. Performance Testing

### 6.1 Load Times
- [ ] Homepage loads quickly
- [ ] Game page loads quickly
- [ ] No long delays

### 6.2 Runtime Performance
- [ ] Smooth animations (60fps)
- [ ] No lag when clicking rapidly
- [ ] Ballpit doesn't cause performance issues
- [ ] Game loop runs smoothly

### 6.3 Memory
- [ ] No memory leaks
- [ ] Floating text elements are cleaned up
- [ ] Event listeners are properly removed

---

## 7. Error Handling

### 7.1 Console Errors
- [ ] No JavaScript errors in console
- [ ] No 404 errors for assets
- [ ] No CORS errors

### 7.2 Edge Cases
- [ ] Works with sound disabled
- [ ] Works with localStorage disabled (graceful degradation)
- [ ] Handles rapid clicking without breaking
- [ ] Handles very large numbers correctly

---

## 8. Accessibility

### 8.1 Keyboard Navigation
- [ ] Tab navigation works
- [ ] Space bar works for game clicking
- [ ] Enter key works for buttons

### 8.2 Screen Readers
- [ ] Semantic HTML used
- [ ] ARIA labels where needed

---

## 🐛 Issues Found

### Critical Issues
1. 
2. 

### Minor Issues
1. 
2. 

### Suggestions/Improvements
1. 
2. 

---

## ✅ Sign-off
- **Tester**: 
- **Date**: 
- **Status**: Pass / Fail / Needs Review

