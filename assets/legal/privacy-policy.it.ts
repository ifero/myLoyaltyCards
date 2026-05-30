/**
 * Privacy Policy (Italian) — Bundled Offline Content
 */

import { PRIVACY_POLICY_LAST_UPDATED } from './privacy-policy';

export const PRIVACY_POLICY_TITLE_IT = 'Informativa sulla privacy';
export const PRIVACY_POLICY_LAST_UPDATED_LABEL_IT = 'Ultimo aggiornamento';

export const PRIVACY_POLICY_CONTENT_IT = `Informativa sulla privacy
Ultimo aggiornamento: ${PRIVACY_POLICY_LAST_UPDATED}

1. Introduzione

myLoyaltyCards ("noi") si impegna a proteggere la tua privacy. Questa Informativa sulla privacy spiega quali dati raccogliamo, come li utilizziamo e quali sono i tuoi diritti ai sensi del Regolamento generale sulla protezione dei dati (GDPR) e delle altre leggi applicabili.

Utilizzando myLoyaltyCards accetti la raccolta e l'uso delle informazioni in conformita con questa informativa. Puoi usare l'app in modalita ospite senza fornire alcun dato personale.

2. Dati che raccogliamo

Quando utilizzi myLoyaltyCards senza un account (modalita ospite), non raccogliamo ne trasmettiamo alcun dato personale. Tutti i dati delle carte sono memorizzati localmente sul tuo dispositivo.

Quando crei un account, raccogliamo:
• Indirizzo email - usato per autenticazione e recupero dell'account.
• Dati delle carte fedelta - nomi delle carte, valori dei codici a barre, formati dei codici, riferimenti al brand e metadati d'uso (stato preferito, conteggio utilizzi, timestamp).
• Registri del consenso - se e quando hai accettato questa Informativa sulla privacy.

Non raccogliamo:
• Dati di posizione
• Identificatori del dispositivo o ID pubblicitari
• Dati analitici o di tracciamento
• Contatti, foto o altri dati sensibili del dispositivo

3. Come utilizziamo i tuoi dati

Utilizziamo i tuoi dati esclusivamente per le seguenti finalita:
• Autenticazione - per identificarti e proteggere il tuo account.
• Backup cloud - per conservare le tue carte fedelta e sincronizzarle tra i tuoi dispositivi.
• Traccia di audit - per registrare quando hai dato o revocato il consenso (obbligo legale ai sensi del GDPR).

Non utilizziamo i tuoi dati per pubblicita, profilazione o vendita a terzi.

4. Conservazione e sicurezza dei dati

• Archiviazione locale: i dati delle carte sono salvati sul dispositivo in un database SQLite cifrato. I token di sessione sono conservati nel Portachiavi (iOS) o nel Keystore (Android) tramite expo-secure-store.
• Archiviazione cloud: se crei un account, i tuoi dati vengono salvati in Supabase (PostgreSQL) con Row-Level Security (RLS), in modo che solo tu possa accedere ai tuoi dati.
• Cifratura: i dati in transito sono protetti da TLS 1.2+. I dati nel cloud sono cifrati dal nostro provider di hosting (AES-256).

5. Condivisione dei dati

Non condividiamo, vendiamo ne concediamo in affitto i tuoi dati personali a terzi. I tuoi dati sono trattati solo da:
• Supabase - il nostro provider per database cloud e autenticazione (accordo sul trattamento dei dati in vigore).

6. I tuoi diritti (GDPR)

Ai sensi del GDPR, hai i seguenti diritti:
• Diritto di accesso - puoi vedere tutti i dati che conserviamo su di te direttamente nell'app.
• Diritto di rettifica - puoi modificare i dati delle tue carte fedelta in qualsiasi momento.
• Diritto alla cancellazione - puoi eliminare il tuo account e tutti i dati cloud dall'app. La cancellazione viene completata entro 30 giorni.
• Diritto alla portabilita dei dati - puoi esportare i tuoi dati in un formato standard.
• Diritto di revoca del consenso - puoi revocare il consenso in qualsiasi momento nelle Impostazioni. La revoca non pregiudica la liceita del trattamento basato sul consenso prima della revoca stessa.
• Diritto alla limitazione del trattamento - puoi passare in qualsiasi momento alla modalita ospite, che interrompe ogni trattamento cloud dei dati.
• Diritto di presentare reclamo - puoi rivolgerti alla tua autorita locale per la protezione dei dati.

Per esercitare questi diritti, usa le opzioni disponibili nelle Impostazioni dell'app o contattaci all'indirizzo indicato sotto.

7. Conservazione dei dati

• Modalita ospite: i dati restano solo sul tuo dispositivo. Non conserviamo nulla.
• Utenti autenticati: i tuoi dati sono conservati finche il tuo account e attivo. Quando elimini l'account, tutti i dati cloud vengono cancellati definitivamente entro 30 giorni.
• Log del consenso: sono mantenuti per il periodo richiesto dalla legge applicabile (in genere 3 anni) a fini di audit, poi eliminati in modo permanente.

8. Privacy dei minori

myLoyaltyCards non e destinata a minori di 16 anni. Non raccogliamo consapevolmente dati personali di minori. Se ritieni che un minore ci abbia fornito dati personali, contattaci e li elimineremo tempestivamente.

9. Modifiche a questa informativa

Potremmo aggiornare questa Informativa sulla privacy di tanto in tanto. La versione aggiornata sara identificata dalla data di "Ultimo aggiornamento" in alto. Ti invitiamo a consultare periodicamente questa informativa. L'uso continuato dell'app dopo le modifiche costituisce accettazione della versione aggiornata.

10. Contattaci

Se hai domande su questa Informativa sulla privacy o vuoi esercitare i tuoi diritti, contattaci a:

Email: privacy@myloyaltycards.app
`;
