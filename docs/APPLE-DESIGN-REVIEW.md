# Design review: Revoltz Supply

Date: 30 October 2026. Skill: apple-design. Scope: React web application, desktop and compact layouts. Main production site and DineTap are excluded from this example change.

## Realistic example prompt

> I run a café in Pune and request packaging before service. Review Revoltz Supply using Apple Design, then make requests, quote comparison and supplier selection easier to read and use on my phone. Keep Revoltz's dark theme and red accents. Implement the improvements on the test build and explain what was verified.

## Summary

Before: Critical issues in the audited color pair, plus high-priority readability and interaction concerns. After implementation: improved but not fully certified; the inspected desktop landing page is readable and the numerical contrast checks pass. Authenticated screens, actual touch devices and assistive-technology behavior still need interactive validation.

Design thesis: help a restaurant describe a supply need, compare like-for-like offers and choose a supplier confidently before its next service. The defining treatment is a sourcing ticket: clear item/quantity/specification rows, explicit sourcing progress and a separated total/tax/delivery breakdown. This follows the restaurant's real procurement sequence rather than adding decoration.

This is a web app. Apple’s foundations inform the review; native menu bars, tab bars, SF Symbols, native Dynamic Type and Liquid Glass conventions are not imposed on it. The existing dark brand direction remains a deliberate product constraint.

## Critical

### Small primary-button text failed the chosen contrast threshold

What: #FFFFFF on #E55343 measured 3.72:1. The action label is normal-size text, so the review uses a 4.5:1 threshold.

Why: `accessibility.md › Vision`: “Strive to meet color contrast minimum standards.”

Fix implemented: primary action background #B83228, giving white labels 5.96:1; hover #A82922 gives 6.99:1. An automated test reads the actual CSS tokens and checks content, secondary text, signal labels and primary labels against 4.5:1.

This is a measured finding for that specific color pair, not a claim that every color in the application has been exhaustively audited.

## Improvements

### High — body text and controls were too small for the target context

What: several mobile overrides used 9–11 px text; mobile fields used 13 px text. Some quiet controls had small visual and interaction areas. Browser zoom could enlarge the page, but the default density was still unhelpful for busy restaurant operators.

Why: `typography.md › Ensuring legibility`: “Use font sizes that most people can read easily.” `buttons.md › Best practices`: “Make buttons easy for people to use.”

Fix implemented: rem-based hierarchy; 16 px default form input text, 15–16 px common labels/body text and 12–14 px secondary/utility text. Buttons/links have at least a 44 CSS px target; fields have 48 CSS px minimum height. These are web product targets, not a declaration that CSS px and Apple points are universally interchangeable. Compact rules retain functionality and allow text wrapping.

### High — meaningful actions happened without a consequence review

What: selecting a supplier locks the selection; cancelling a request closes the workflow. Both previously executed on the first activation. Delivery confirmation also changed the operational record immediately.

Why: `feedback.md › Best practices` recommends warning about unexpected irreversible loss. This application's locking behavior is the specific reason for adding confirmation; this is not a rule to warn before every action.

Fix implemented: native HTML dialogs explain supplier, total and lock behavior; cancellation explains closure; delivery confirmation explains that it neither records nor collects payment. Each dialog has a safe Go back action, Escape dismissal, accessible title/description and native modal focus behavior. Go back receives initial focus. Dialogs still require interactive browser verification on authenticated workflows.

### Medium — feedback could sit far below a long form

What: status and server errors were rendered after the entire workspace. An operator could miss them without scrolling.

Why: `feedback.md › Best practices`: “Consider integrating status feedback into your interface.”

Fix implemented: feedback sits at the start of the working area and remains visible while scrolling. Errors have an alert role and programmatic focus; successful updates use a status region. A persistent Updating workspace message explains in-flight requests. Requests also expose a textual sourcing progress indicator.

### Medium — copy and input structure needed stronger task context

What: generic “Submit” labels, decorative zero-padded counts and weak item grouping made the interface feel more like a generic dashboard than a sourcing tool.

Why: `writing.md › Best practices`: “Be action oriented.” `entering-data.md › Best practices`: “Be clear about the data you need.”

Fix implemented: Send quotation request / Send quotation labels, unpadded counts, item fieldsets and legends, explicit decimal input hints, business autocomplete hints and supplier-direct consequence copy. Native required/min/max/step controls remain in place, with server validation preserved. Custom field-specific server errors remain future work; this change does not claim to implement them.

## Token plan

Six core semantic tokens replace the key incidental color choices. Light values are documented alternatives, not a new shipped appearance switch.

| Role | Dark implementation | Light alternative | Measured relevant contrast |
|---|---|---|---|
| Canvas | #101113 | #F7F8FA | Background role |
| Surface | #17191C | #FFFFFF | Background role |
| Content | #F3F5F8 | #1D2430 | Dark content/surface 16.13:1; light content/canvas 14.67:1 |
| Secondary | #AEB7C4 | #5B6471 | Dark secondary/surface 8.70:1; light secondary/canvas 5.64:1 |
| Action | #B83228 | #B83228 | White/action 5.96:1 in both |
| Signal/focus | #FF9B8B | #B83228 | Dark signal/surface 8.65:1; light signal/surface 5.96:1 |

Success and error surfaces retain separate semantic treatments and explicit text/icons. No status relies on color alone.

Type: system sans-serif; 1 rem form text and controls, 0.9375 rem common body/labels, 0.8125–0.875 rem secondary content, 2.125 rem compact page titles. Pricing uses tabular numerals. No extra font download is required.

| Layout | Navigation | Main task | Secondary information |
|---|---|---|---|
| Regular | Existing sidebar | Request list or sourcing ticket | Statistics above list; offers below ticket |
| Compact | Wrapping navigation controls | Single-column form, readable item groups | Offer cards stack; progress uses two columns |
| Very narrow | Same destinations | Full-width controls | Statistics stack instead of compressing labels |

Motion: none added. Reduced-motion, increased-contrast and forced-colors media queries are supported. There are no translucent content panels, so a reduced-transparency override is unnecessary for this implementation.

## Craft notes

The first proposed direction could have been another dark SaaS dashboard. It was revised around a restaurant's next service and a sourcing ticket, with actual supply categories visible before sign-in. The existing system font and quiet sidebar are useful utility choices; personality comes from sourcing-specific content and the ticket structure rather than unrelated visuals.

Removed accessory: zero-padded statistics. Kept the small supply category labels because they answer what can be sourced; they are visibly noninteractive labels, not fake filters. No sample suppliers, fake savings claims or invented live orders were added.

## What works

Keep explicit tax/delivery totals, quote validity, private supplier offers, visible status labels and the supplier-direct payment/fulfilment boundary. Existing tenant authorization and main/test database separation remain in force.

## Verification

- TypeScript check passed.
- Hosted procurement integration test passed: tenant isolation, assigned-supplier access, suspension, selection, completion and production rejection of test-profile impersonation.
- New contrast test passed for normal-size core text and action labels.
- Desktop preview inspected visually and through the accessibility tree.
- Main production site was not modified by this example.
- Mobile physical-device testing, 200% zoom/reflow, screen-reader traversal and authenticated-dialog browser tests remain unverified. The live owner-only sign-in gate prevents inspecting authenticated screens without account authentication.

The result is not an accessibility certification. Further validation should include the longest realistic business/item names, small viewports, enlarged text, keyboard traversal, dialog Escape/return-focus behavior, server errors and form retry preservation.

## Render handoff

The user subsequently requested Render deployment using the mayur connection. That connection resolves successfully. No Render Supply service has been created. The preferred standalone GitHub repository is not currently accessible, and browser repository creation stops at GitHub sign-in. Existing Sites source is stored on a provider Render does not support as a Git source.

This Vinext build also uses Cloudflare D1 and dispatch-owned ChatGPT identity. Deploying it unchanged to Render would not preserve those capabilities. A Render-compatible runtime, persistent database adapter and supported authentication are required; a throwaway free-service SQLite database is not an acceptable production substitute.

## References used

Loaded ten installed skill reference files: accessibility, layout, typography, color, cross-platform translation, entering data, feedback, writing, loading and buttons. Citations above use their file names and headings. The supplied skill snapshots were the content source. Official page retrieval returned a JavaScript shell; the web fetcher could not read the linked Markdown format, so no claim is made that the installed snapshots were independently refreshed.

- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/entering-data
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/writing
- https://developer.apple.com/design/human-interface-guidelines/loading
- https://developer.apple.com/design/human-interface-guidelines/buttons
