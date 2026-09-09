# Standing Fleet Boss

Bot Builder macro id: standing-fleet-boss.

Forms a fleet, posts a fleet-finder advert (name + description), and keeps auto-accepting by corp, alliance, or standings greater than a threshold.

Params: advertName (text), advertDescription (text), acceptBy (corp|alliance|standings), minStandings (standing, optional).

Try on :26501 via Bot Builder Fleet category.

Limitations: EveJS stores public_minStanding but does not enforce it on ApplyToJoinFleet for INVITE_PUBLIC. RejectJoinRequest and UpdateAdvertAllowedEntities are not on the BFF surface.

