import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/lead-consent'

/** Fills all required LeadForm fields for happy-path submit tests. */
export async function fillRequiredLeadFormFields(user: UserEvent): Promise<void> {
  await user.type(screen.getByLabelText(/Vorname/i), 'Max')
  await user.type(screen.getByLabelText(/Nachname/i), 'Mustermann')
  await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'test@example.de')
  await user.type(screen.getByLabelText(/Telefonnummer/i), '0151 12345678')
  await user.type(screen.getByLabelText(/Geburtsdatum/i), '1960-05-15')
  await user.type(screen.getByLabelText(/Straße und Hausnummer/i), 'Musterstraße 12')
  await user.type(screen.getByLabelText(/^PLZ/i), '80331')
  await user.type(screen.getByLabelText(/^Ort/i), 'München')
  await user.click(
    screen.getByLabelText(/Ich habe die.*Datenschutzerklärung.*gelesen/i),
  )
}

export const COMPLETE_LEAD_PAYLOAD = {
  produktId: '987fcdeb-51a2-43d7-b456-426614174001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sicherheit',
  vorname: 'Anna',
  nachname: 'Beispiel',
  email: 'anna@example.de',
  telefon: '0151 9876543',
  geburtsdatum: '1962-03-14',
  strasse: 'Musterstraße 12',
  plz: '80331',
  ort: 'München',
  interesse: 'Sofortschutz für meine Eltern',
  privacyConsent: true as const,
  privacyPolicyVersion: PRIVACY_POLICY_VERSION,
  marketingConsent: false,
}
