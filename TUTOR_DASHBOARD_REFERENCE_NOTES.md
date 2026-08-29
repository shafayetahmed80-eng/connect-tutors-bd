# Tutor Dashboard Reference Notes

## Supplied sources

| Source | URL | Observed design cue |
|---|---|---|
| Full dashboard screenshot | https://prnt.sc/mxkqoD6FCOmO | A fixed blue left sidebar holds a portrait/identity block, clear active navigation state, dashboard notice area, compact job statistics, and profile-completion cue. |
| Tutor identity card | https://prnt.sc/F6lQa6l7jTmJ | The sidebar identity block presents Tutor ID and a `Since` date beneath the Tutor’s name and email. |

## Implementation decisions for Connect Tutors BD

The Connect Tutors BD Tutor Dashboard will use the supplied references only as visual and hierarchy inspiration. It will retain the existing project’s responsive sidebar component and Connect Tutors BD blue design language. The left sidebar will display the authenticated Tutor’s name, private contact email, automatically allocated Tutor ID beginning from the lowest available number at 777, and registration date. Historic Tutor IDs remain unchanged. The requested navigation order is Dashboard, Job Board, Profile, Status, Confirmation Letter, Payment, Certificate, Refer & Earn, and Setting. A visual divider will separate account functions from Exclusively Yours, How It Works, Join our Community, and Sign Out.

The requested Dashboard sections are design placeholders in this milestone unless a working backend flow already exists. The Profile route remains connected to the current role-protected Tutor Profile form. No payment, certificate, confirmation letter, referral, or job-matching data will be fabricated.
