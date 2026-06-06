export const content = {
  hero: {
    title: 'Malatelier Auszeit',
    subtitle: 'Dein Malatelier in Gronau',
    claim: 'Dein Ort zum Ankommen und Kreativsein',
    subline: 'Keramik bemalen, durchatmen, glücklich nach Hause gehen',
    ctaPrimary: 'Termin buchen',
    ctaSecondary: 'Entdecke unsere Keramik',
  },
  wasErwartet: {
    title: 'Was dich bei uns erwartet',
    items: [
      {
        title: 'Keramik bemalen',
        text: 'Such dir in Ruhe einen Rohling aus, lass dich von den Farben inspirieren und gestalte etwas, das nur dir gehört.',
        image: '/tasse.webp',
        link: '#keramik-preise',
      },
      {
        title: 'Workshops',
        text: 'Gemeinsam Neues ausprobieren, voneinander lernen und dabei eine richtig gute Zeit haben.',
        image: '/teller.webp',
        link: '/workshops',
      },
      {
        title: 'Besondere Anlässe',
        text: 'Kindergeburtstag, JGA oder Firmen-Event: zusammen kreativ sein verbindet. Wir kümmern uns um alles.',
        image: '/spardose.webp',
        link: '/events',
      },
      {
        title: 'Gutscheine',
        text: 'Verschenke eine Auszeit, die wirklich von Herzen kommt.',
        image: '/anhaenger.webp',
        link: '/gutscheine',
      },
    ],
  },
  process: {
    title: 'So einfach geht es',
    steps: [
      {
        icon: 'calendar',
        title: 'Termin aussuchen',
        text: 'Schau dir die freien Termine an und such dir einen Zeitpunkt aus, der für dich passt.',
      },
      {
        icon: 'brush',
        title: 'Ankommen & loslegen',
        text: 'Setz dich gemütlich hin, wähle deinen Rohling und lass deiner Kreativität freien Lauf. Ich helfe dir gern, wenn du magst.',
      },
      {
        icon: 'gift',
        title: 'Abholen & freuen',
        text: 'Nach 10 bis 14 Tagen ist dein Werk fertig glasiert. Hol es ab und freu dich jedes Mal, wenn du es benutzt.',
      },
    ],
  },
  offerings: {
    title: 'Angebot',
    items: [
      { name: 'Tassen', price: 'ab 14,50€', image: '/tasse.webp' },
      { name: 'Teller', price: 'ab 12,50€', image: '/teller.webp' },
      { name: 'Spardosen & Krüge & Boxen', price: 'ab 8,00€', image: '/spardose.webp' },
      { name: 'Anhänger', price: 'ab 6,00€', image: '/anhaenger.webp' },
    ],
    note: 'Abholbereit nach 10 bis 14 Tagen.',
    pricing: [
      { description: 'Farb- und Brennpauschale bis 3 Teile pro Person', price: '10,00€' },
      { description: 'Farb- und Brennpauschale 4-6 Teile pro Person', price: '15,00€' },
      { description: 'Farb- und Brennpauschale 7-9 Teile pro Person', price: '20,00€' },
    ],
  },
  faq: {
    title: 'Oft gefragt, gern beantwortet',
    items: [
      {
        question: 'Wie läuft ein Besuch bei euch ab?',
        answer: 'Du kommst zu deinem Termin, suchst dir in Ruhe einen weißen Rohling aus und bemalst ihn, wie es dir gefällt. Alle Farben, Pinsel und Werkzeuge stehen bereit. Danach übernehmen wir das Glasieren und Brennen. Nach 10 bis 14 Tagen kannst du deine fertige Keramik abholen.',
      },
      {
        question: 'Was kostet ein Besuch?',
        answer: 'Der Preis setzt sich zusammen aus dem Rohling (ab 6 €) und einer Farb- und Brennpauschale: bis 3 Teile 10 €, 4 bis 6 Teile 15 €, 7 bis 9 Teile 20 €. Farben, Pinsel und Brennen sind dabei immer inklusive.',
      },
      {
        question: 'Muss ich vorher einen Termin buchen?',
        answer: 'Ja, damit wir genug Platz und alles Nötige für dich vorbereiten können. Einen Termin buchst du ganz einfach hier auf der Website.',
      },
      {
        question: 'Kann ich meinen Termin stornieren?',
        answer: 'Klar, bis 24 Stunden vorher ist das kostenfrei möglich. Den Storno-Link findest du in deiner Bestätigungs-E-Mail.',
      },
      {
        question: 'Was muss ich mitbringen?',
        answer: 'Gar nichts! Alles ist da. Komm einfach vorbei und lass dich überraschen, was entsteht.',
      },
      {
        question: 'Ist das Atelier auch für Kinder geeignet?',
        answer: 'Auf jeden Fall! Kinder ab 6 Jahren sind herzlich willkommen. Kleinere Kinder bitte mit einer Begleitperson. Für Kindergeburtstage haben wir übrigens besondere Pakete, frag einfach nach!',
      },
      {
        question: 'Können wir als Gruppe kommen?',
        answer: 'Aber gern! Ob JGA, Stammtisch oder Firmenevent, schreib uns einfach über das Anfrageformular und wir bereiten alles für euch vor.',
      },
      {
        question: 'Wie lange dauert ein Besuch?',
        answer: 'Plane am besten etwa 2 Stunden ein. Wer besonders detailliert arbeiten möchte, darf auch gern länger bleiben.',
      },
      {
        question: 'Kann ich einen Gutschein verschenken?',
        answer: 'Na klar! Gutscheine gibt es ab 25 €, 50 € oder als Wunschbetrag. Nach dem Kauf bekommst du den Code per E-Mail. Perfekt zum Ausdrucken oder Weiterschicken.',
      },
    ],
  },
  events: {
    title: 'Besondere Anlässe',
    subtitle: 'Gemeinsam kreativ sein verbindet. Wir richten alles für euch her.',
    types: [
      {
        id: 'kindergeburtstag',
        title: 'Kindergeburtstag',
        text: 'Jedes Kind bemalt seine eigene Keramik und nimmt am Ende stolz etwas Selbstgemachtes mit nach Hause.',
        features: ['Ab 6 Jahren', 'Bis zu 10 Kinder', 'Ca. 2 Stunden', 'Alle Materialien inklusive'],
      },
      {
        id: 'jga',
        title: 'JGA',
        text: 'Zusammen lachen, quatschen und nebenbei ein Andenken schaffen, das euch noch lange an diesen Tag erinnert.',
        features: ['Flexible Gruppengröße', 'Getränke möglich', 'Ca. 2 bis 3 Stunden', 'Gemütliche Atmosphäre'],
      },
      {
        id: 'firmen_event',
        title: 'Firmen-Event',
        text: 'Mal raus aus dem Büro, gemeinsam etwas mit den Händen machen und sich dabei ganz entspannt besser kennenlernen.',
        features: ['Individuelle Planung', 'Flexible Termine', 'Rechnungsstellung möglich', 'Ab 8 Personen'],
      },
      {
        id: 'privater_anlass',
        title: 'Privater Anlass',
        text: 'Freundinnen-Abend, Stammtisch oder einfach zusammen eine gute Zeit haben. Ich mache es euch gemütlich.',
        features: ['Flexible Gruppengröße', 'Individuelle Absprache', 'Gemütliche Atmosphäre'],
      },
    ],
  },
  pageMeta: {
    galerie: { title: 'Galerie | Malatelier Auszeit Gronau im Münsterland', description: 'Lass dich inspirieren: Entdecke Keramik-Unikate aus unserem Malatelier in Gronau im Münsterland. Kreative Ideen aus der Region Münster.' },
    workshops: { title: 'Keramik Workshops Münsterland | Malatelier Auszeit Gronau', description: 'Kreative Keramik-Workshops in Gronau im Münsterland: Lerne neue Techniken und gestalte besondere Keramik. Auch für Gruppen aus Münster, Steinfurt und Borken.' },
    gutscheine: { title: 'Gutscheine Keramik bemalen | Malatelier Auszeit Münsterland', description: 'Verschenke kreative Auszeit: Gutscheine für Keramik bemalen in Gronau im Münsterland. Perfektes Geschenk aus der Region Münster.' },
    events: { title: 'Kindergeburtstag & JGA Keramik Münsterland | Malatelier Auszeit', description: 'Kindergeburtstag, JGA, Firmen-Event: Feiert kreativ in unserem Keramik-Malatelier in Gronau. Beliebt bei Gruppen aus Münster, Steinfurt und dem Münsterland.' },
    faq: { title: 'Häufige Fragen | Malatelier Auszeit Gronau Münsterland', description: 'Alles was du wissen musst: Preise, Ablauf, Buchung und mehr zu Malatelier Auszeit in Gronau im Münsterland. Gut erreichbar aus Münster und Umgebung.' },
  },
  contact: {
    title: 'Komm vorbei',
    address: {
      street: 'Feldstiege 6a',
      city: 'Gronau (Westfalen)',
    },
    phone: '+49 176 34255005',
    email: 'atelier@keramik-auszeit.de',
    whatsapp: '+4917634255005',
    whatsappMessage: 'Hallo, ich habe eine Frage zum Keramik-Malatelier.',
  },
  footer: {
    links: [
      { text: 'Impressum', href: '#impressum' },
      { text: 'Datenschutz', href: '#datenschutz' },
    ],
    copyright: '© 2026 Malatelier Auszeit · Irena Woschkowiak',
  },
};
