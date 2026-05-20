import type { LearningModule } from './index'

export const disclosureArc: LearningModule = {
  id: 'disclosure-arc',
  title: 'The Disclosure Arc',
  description: "How a 70-year silence broke. What's been confirmed. What's still coming. Where the record stands today.",
  color: '#065f46',
  stations: [
    { id: 1, title: 'The First Push', eventSlugs: ['rockefeller-initiative'], reflectionQuestion: "A billionaire privately lobbied the White House for UFO disclosure in the 1990s. It didn't work. What do you think he knew that made him think it was worth trying?" },
    { id: 2, title: 'The Case That Cracked It Open', eventSlugs: ['nimitz-tic-tac-incident'], reflectionQuestion: "Reid said he had no doubt that UAPs were real and that the US had recovered materials. He said this publicly, repeatedly, before he died. Why do you think that didn't become bigger news?" },
    { id: 3, title: 'The Night Everything Changed', eventSlugs: ['nyt-aatip-story'], reflectionQuestion: "The night the New York Times published the AATIP story, something shifted. Do you remember where you were in your own thinking about this topic at that moment?" },
    { id: 4, title: 'Putting Evidence in Public View', eventSlugs: ['to-the-stars-academy', 'gimbal-gofast-videos'], reflectionQuestion: "The Pentagon confirmed the videos were real. The objects in them have no conventional explanation. What would it take — beyond that — for this to feel settled to you?" },
    { id: 5, title: "The Government Admits It Doesn't Know", eventSlugs: ['odni-preliminary-assessment'], reflectionQuestion: "The US intelligence community officially stated it cannot explain 143 of 144 military UAP encounters. What do you think the 1 explained case was doing in that report?" },
    { id: 6, title: 'Urgent and Credible', eventSlugs: ['grusch-icig-complaint'], reflectionQuestion: "A former intelligence officer filed a protected complaint alleging crash-retrieval programs exist. The Inspector General called it urgent and credible. What do you think 'credible' means in that specific legal context?" },
    { id: 7, title: 'Under Oath', eventSlugs: ['grusch-testimony'], reflectionQuestion: "Grusch testified under oath. Fravor testified under oath. Graves testified under oath. Under oath means potential perjury charges. Does that change how you weigh what they said?" },
    { id: 8, title: 'The Record Opens', eventSlugs: ['pursue-uap-files-release'], reflectionQuestion: "The files are opening. What do you think is in the tranches that haven't been released yet?" },
  ],
  completion: {
    type: 'documentary',
    title: 'The Phenomenon',
    author: 'James Fox (2020)',
    description: "The best single documentary on the UAP subject ever made. It covers the institutional story, key cases, and the disclosure arc with on-the-record testimony from government officials, military witnesses, and researchers. Watch it as a capstone to everything you've just read — you'll recognize every thread.",
  },
}
