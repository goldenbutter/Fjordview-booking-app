import type { EmailCopy } from "./index";

export const no: EmailCopy = {
  subjects: {
    confirmation: (ref) => `Bookingbekreftelse - ${ref}`,
    receipt: (ref) => `Betalingskvittering - ${ref}`,
    reminder: (ref) => `Oppholdet ditt nærmer seg - ${ref}`,
    thank_you: (ref) => `Takk for besøket - ${ref}`,
    cancellation: (ref) => `Avbestillingsbekreftelse - ${ref}`,
    invoice: (ref) => `Faktura - ${ref}`,
    admin_notification: (ref) => `Ny booking - ${ref}`,
  },
  preview: {
    confirmation: "Bookingen din er bekreftet.",
    receipt: "Betalingskvitteringen din er klar.",
    reminder: "Innsjekk nærmer seg.",
    thank_you: "Takk for at du bodde hos oss.",
    cancellation: "Bookingen din er avbestilt.",
    invoice: "Fakturadetaljene er klare.",
    admin_notification: "En ny booking er betalt og bekreftet.",
  },
  intro: {
    confirmation: "Takk for bookingen. Oppholdet ditt er bekreftet.",
    receipt: "Vi har mottatt betalingen for denne bookingen.",
    reminder: "Vi gleder oss til å ønske deg velkommen snart.",
    thank_you: "Takk for at du bodde hos oss. Velkommen tilbake.",
    cancellation: "Bookingen din er avbestilt i tråd med avbestillingsvilkårene.",
    invoice: "Her er fakturadetaljene for bookingen din.",
    admin_notification: "En gjest har fullført betaling, og bookingen er nå bekreftet.",
  },
  labels: {
    bookingRef: "Bookingreferanse",
    guest: "Gjest",
    room: "Rom",
    stay: "Opphold",
    checkIn: "Innsjekk",
    checkOut: "Utsjekk",
    guests: "Gjester",
    total: "Total",
    paid: "Betalt",
    selfService: "Selvbetjeningslenke",
    contact: "Kontakt",
  },
  actions: {
    viewBooking: "Se booking",
    viewInvoice: "Se faktura",
  },
  footer: "Denne e-posten ble sendt med opplysningene som er registrert på bookingen din.",
};
