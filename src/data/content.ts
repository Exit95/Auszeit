export const content = {
  hero: {
    title: 'Keramik Auszeit',
    subtitle: 'Dein Malatelier in Gronau',
    claim: 'Deine kreative Auszeit in Gronau',
    subline: 'Keramik bemalen, abschalten, Freude mitnehmen',
    ctaPrimary: 'Termin buchen',
    ctaSecondary: 'Entdecke unsere Keramik',
  },
  wasErwartet: {
    title: 'Was dich erwartet',
    items: [
      {
        title: 'Keramik bemalen',
        text: 'Wähle deinen Rohling, nimm dir Zeit und gestalte dein ganz eigenes Stück.',
        image: '/becher.jpeg',
        link: '#keramik-preise',
      },
      {
        title: 'Workshops',
        text: 'Lerne neue Techniken in unseren kreativen Workshops.',
        image: '/teller.jpeg',
        link: '/workshops',
      },
      {
        title: 'Besondere Anlässe',
        text: 'Kindergeburtstag, JGA oder Firmen-Event — wir machen es unvergesslich.',
        image: '/spardose.jpeg',
        link: '/events',
      },
      {
        title: 'Gutscheine',
        text: 'Das perfekte Geschenk für kreative Köpfe.',
        image: '/anhänger.png',
        link: '/gutscheine',
      },
    ],
  },
  process: {
    title: 'So funktioniert es',
    steps: [
      {
        icon: 'calendar',
        title: 'Termin wählen',
        text: 'Suche dir einen passenden Zeitpunkt aus und buche online.',
      },
      {
        icon: 'brush',
        title: 'Ankommen & Bemalen',
        text: 'Wähle dein Keramikstück und bemale es nach deinen Vorstellungen. Anleitung gibt es auf Wunsch.',
      },
      {
        icon: 'gift',
        title: 'Abholen',
        text: 'Nach 10 bis 14 Tagen ist dein Werk glasiert und fertig zum Abholen.',
      },
    ],
  },
  offerings: {
    title: 'Angebot',
    items: [
      { name: 'Tassen', price: 'ab 14,50€', image: '/becher.jpeg' },
      { name: 'Teller', price: 'ab 12,50€', image: '/teller.jpeg' },
      { name: 'Spardosen & Krüge & Boxen', price: 'ab 8,00€', image: '/spardose.jpeg' },
      { name: 'Anhänger', price: 'ab 6,00€', image: '/anhänger.png' },
    ],
    note: 'Abholbereit nach 10 bis 14 Tagen.',
    pricing: [
      { description: 'Farb- und Brennpauschale bis 3 Teile pro Person', price: '10,00€' },
      { description: 'Farb- und Brennpauschale 4-6 Teile pro Person', price: '15,00€' },
      { description: 'Farb- und Brennpauschale 7-9 Teile pro Person', price: '20,00€' },
    ],
  },
  faq: {
    title: 'Häufig gestellte Fragen',
    items: [
      {
        question: 'Wie läuft ein Besuch im Atelier ab?',
        answer: 'Du kommst zu deinem gebuchten Termin, wählst ein Keramikstück aus unserer großen Auswahl und bemalst es nach deinen Wünschen. Alle Farben, Pinsel und Werkzeuge stehen bereit. Nach dem Bemalen übernehmen wir das Glasieren und Brennen. Dein fertiges Stück kannst du nach 10 bis 14 Tagen abholen.',
      },
      {
        question: 'Was kostet ein Besuch?',
        answer: 'Der Preis setzt sich zusammen aus dem Preis für das Keramikstück (ab 6 €) und einer Farb- und Brennpauschale: bis 3 Teile 10 €, 4 bis 6 Teile 15 €, 7 bis 9 Teile 20 €. Farben, Pinsel und Brennen sind immer inklusive.',
      },
      {
        question: 'Muss ich einen Termin buchen?',
        answer: 'Ja, eine Terminbuchung ist erforderlich, damit wir ausreichend Platz und Materialien für dich bereitstellen können. Du kannst direkt hier auf der Website einen Termin buchen.',
      },
      {
        question: 'Kann ich meinen Termin stornieren?',
        answer: 'Bis 24 Stunden vor dem Termin kannst du kostenfrei stornieren. Nutze dazu den Link in deiner Bestätigungs-E-Mail.',
      },
      {
        question: 'Was muss ich mitbringen?',
        answer: 'Nichts! Alle Materialien, Farben und Werkzeuge stellen wir zur Verfügung. Komm einfach vorbei und lass deiner Kreativität freien Lauf.',
      },
      {
        question: 'Ist das Atelier für Kinder geeignet?',
        answer: 'Ja, Kinder ab 6 Jahren sind herzlich willkommen. Jüngere Kinder bitte in Begleitung eines Erwachsenen. Für Kindergeburtstage bieten wir spezielle Pakete an – einfach anfragen!',
      },
      {
        question: 'Können wir als Gruppe kommen?',
        answer: 'Gerne! Das Atelier bietet Platz für Gruppen. Für besondere Anlässe wie JGA, Stammtisch oder Firmenevent nutze bitte unser Anfrageformular, damit wir alles optimal für euch vorbereiten können.',
      },
      {
        question: 'Wie lange dauert ein Besuch?',
        answer: 'In der Regel solltest du etwa 2 Stunden einplanen. Wer sehr detailliert arbeiten möchte, kann auch länger bleiben – je nach Buchungsslot ist das möglich.',
      },
      {
        question: 'Kann ich einen Gutschein verschenken?',
        answer: 'Ja! Gutscheine gibt es in verschiedenen Beträgen (25 €, 50 € oder Wunschbetrag). Nach dem Kauf erhältst du den Gutschein-Code per E-Mail, den du ausdrucken oder digital weiterschicken kannst.',
      },
    ],
  },
  events: {
    title: 'Besondere Anlässe',
    subtitle: 'Feiert gemeinsam kreativ — wir kümmern uns um den Rest.',
    types: [
      {
        id: 'kindergeburtstag',
        title: 'Kindergeburtstag',
        text: 'Kreativ feiern mit Freunden. Jedes Kind bemalt sein eigenes Keramik-Stück und nimmt ein selbstgemachtes Geschenk mit nach Hause.',
        features: ['Ab 6 Jahren', 'Bis zu 10 Kinder', 'Ca. 2 Stunden', 'Alle Materialien inklusive'],
      },
      {
        id: 'jga',
        title: 'JGA',
        text: 'Euer Junggesellenabschied wird kreativ. Gemeinsam bemalen, lachen und ein Andenken schaffen, das bleibt.',
        features: ['Flexible Gruppengröße', 'Getränke möglich', 'Ca. 2-3 Stunden', 'Exklusive Atmosphäre'],
      },
      {
        id: 'firmen_event',
        title: 'Firmen-Event',
        text: 'Teambuilding mal anders. Kreatives Arbeiten bringt Teams zusammen — entspannt und ohne Leistungsdruck.',
        features: ['Individuelle Planung', 'Flexible Termine', 'Rechnungsstellung möglich', 'Ab 8 Personen'],
      },
      {
        id: 'privater_anlass',
        title: 'Privater Anlass',
        text: 'Stammtisch, Freundinnen-Abend oder einfach ein besonderer Nachmittag — wir richten es für euch her.',
        features: ['Flexible Gruppengröße', 'Individuelle Absprache', 'Gemütliche Atmosphäre'],
      },
    ],
  },
  pageMeta: {
    galerie: { title: 'Galerie — Keramik Auszeit', description: 'Lass dich inspirieren: Entdecke Keramik-Unikate aus unserem Malatelier in Gronau.' },
    workshops: { title: 'Workshops — Keramik Auszeit', description: 'Kreative Workshops in Gronau: Lerne neue Techniken und gestalte besondere Keramik-Stücke.' },
    gutscheine: { title: 'Gutscheine — Keramik Auszeit', description: 'Verschenke kreative Auszeit: Gutscheine für Keramik bemalen in Gronau.' },
    events: { title: 'Besondere Anlässe — Keramik Auszeit', description: 'Kindergeburtstag, JGA, Firmen-Event: Feiert kreativ in unserem Keramik-Malatelier in Gronau.' },
    faq: { title: 'Häufige Fragen — Keramik Auszeit', description: 'Alles was du wissen musst: Preise, Ablauf, Buchung und mehr zu Keramik Auszeit in Gronau.' },
  },
  contact: {
    title: 'Kontakt & Standort',
    address: {
      street: 'Feldstiege 6a',
      city: 'Gronau (Westfalen)',
    },
    phone: '+49 176 34255005',
    email: 'keramik-auszeit@web.de',
    whatsapp: '+4917634255005',
    whatsappMessage: 'Hallo, ich habe eine Frage zum Keramik-Malatelier.',
  },
  footer: {
    links: [
      { text: 'Impressum', href: '#impressum' },
      { text: 'Datenschutz', href: '#datenschutz' },
    ],
    copyright: '© 2026 Keramik Auszeit — Irena Woschkowiak',
  },
};
