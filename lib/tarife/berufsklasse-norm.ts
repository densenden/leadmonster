/** Maps nullable berufsklasse to the DB norm column (NULL → empty string). */
export function berufsklasseNorm(berufsklasse: string | null | undefined): string {
  return berufsklasse?.trim() ? berufsklasse.trim() : ''
}
